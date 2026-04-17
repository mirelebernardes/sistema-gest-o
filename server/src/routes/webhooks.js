import express from 'express';
import { centralPrisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

function normalizeCategory(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

// POST /api/webhooks/mercadopago
router.post('/mercadopago', async (req, res) => {
  // Mercado Pago expects a fast acknowledgement.
  res.sendStatus(200);

  const { action, data, type } = req.body;
  const paymentId = data?.id || req.query.id;

  if ((type !== 'payment' && action !== 'payment.created' && action !== 'payment.updated') || !paymentId) {
    return;
  }

  try {
    const { mercadoPagoService } = await import('../services/mercadopago.js');

    if (!mercadoPagoService.validateSignature(req.headers, req.body)) {
      console.warn(`[MP Webhook] Assinatura invalida para o pagamento ${paymentId}`);
      return;
    }

    const mpPayment = await mercadoPagoService.getPaymentDetails(paymentId);

    if (!mpPayment || !mpPayment.external_reference) {
      console.warn(`[MP Webhook] Nao foi possivel obter detalhes do pagamento ${paymentId}`);
      return;
    }

    const { status, external_reference } = mpPayment;
    const parts = external_reference.split('_');
    if (parts.length < 4 || parts[0] !== 'business' || parts[2] !== 'payment') {
      console.warn(`[MP Webhook] Referencia externa invalida: ${external_reference}`);
      return;
    }

    const businessId = parseInt(parts[1], 10);
    const refPaymentId = parseInt(parts[3], 10);

    if (!businessId || !refPaymentId) return;

    const result = await centralPrisma.$transaction(async (tx) => {
      const paymentRecord = await tx.payment.findUnique({
        where: { id: refPaymentId },
        include: { booking: { include: { client: true } } }
      });

      if (!paymentRecord) {
        throw new Error('PAYMENT_NOT_FOUND');
      }

      if (paymentRecord.status === 'paid' || paymentRecord.status === 'pago') {
        return { skipped: true };
      }

      if (status === 'approved') {
        const updatedPayment = await tx.payment.update({
          where: { id: refPaymentId },
          data: {
            status: 'paid',
            method: mpPayment.payment_method_id || 'mercadopago',
            date: new Date().toISOString().split('T')[0]
          }
        });

        if (paymentRecord.bookingId) {
          let bookingStatus = null;
          const normalizedCategory = normalizeCategory(paymentRecord.category);
          if (normalizedCategory === 'sinal') bookingStatus = 'deposit_paid';
          if (normalizedCategory === 'servico') bookingStatus = 'completed';

          if (bookingStatus) {
            await tx.booking.update({
              where: { id: paymentRecord.bookingId },
              data: { status: bookingStatus }
            });
          }
        }

        return { updated: true, payment: updatedPayment, client: paymentRecord.booking?.client };
      }

      return { updated: false, status };
    });

    if (result.updated && result.client?.phone) {
      try {
        const { whatsappService } = await import('../services/whatsapp.js');
        const business = await centralPrisma.business.findUnique({ where: { id: businessId } });

        if (business && business.waApiKey) {
          const msg = `Ola ${result.client.name}! Seu pagamento de R$ ${result.payment.value} foi confirmado com sucesso.`;
          await whatsappService.sendMessage(result.client.phone, msg, {
            id: business.waInstanceId,
            key: business.waApiKey
          });
        }
      } catch (waErr) {
        console.warn('[MP Webhook] Erro ao enviar WhatsApp de confirmacao:', waErr.message);
      }
    }

    console.log(`[MP Webhook] Pagamento ${paymentId} processado. Status: ${status} [Ref: ${external_reference}]`);
  } catch (error) {
    if (error.message === 'PAYMENT_NOT_FOUND') {
      console.error(`[MP Webhook] Pagamento nao encontrado no banco: ${paymentId}`);
    } else {
      console.error('[MP Webhook] Erro de processamento:', error.message);
    }
  }
});

// POST /api/webhooks/whatsapp/send
router.post('/whatsapp/send', requireAuth, async (req, res) => {
  const { number, text } = req.body;
  const cleanNumber = String(number || '').replace(/\D/g, '');
  const cleanText = String(text || '').trim();

  if (cleanNumber.length < 10 || !cleanText) {
    return res.status(400).json({ error: 'Numero e mensagem sao obrigatorios.' });
  }

  try {
    const business = await centralPrisma.business.findUnique({
      where: { id: req.user.businessId }
    });

    if (!business || !business.waInstanceUrl || !business.waApiKey || !business.waInstanceId) {
      return res.status(400).json({ error: 'Configuracoes de WhatsApp incompletas.' });
    }

    const { whatsappService } = await import('../services/whatsapp.js');
    const result = await whatsappService.sendMessage(cleanNumber, cleanText, {
      url: business.waInstanceUrl,
      id: business.waInstanceId,
      key: business.waApiKey
    });

    if (!result) throw new Error('Falha no envio do WhatsApp');

    res.json({ success: true, result });
  } catch (err) {
    console.error('WhatsApp Send Route Error:', err);
    res.status(500).json({ error: 'Erro ao enviar mensagem.' });
  }
});

export default router;