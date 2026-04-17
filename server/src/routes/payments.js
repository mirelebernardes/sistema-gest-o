import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import mercadoPagoService from '../services/mercadopago.js';
import { centralPrisma } from '../lib/prisma.js';

const router = express.Router();

function normalizeCategory(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function isValidDateString(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime());
}

// GET /api/payments
router.get('/', requireAuth, async (req, res) => {
  try {
    const where = {
      OR: [
        { businessId: req.user.businessId },
        { booking: { businessId: req.user.businessId } }
      ]
    };

    if (req.user.role === 'professional' && req.user.professionalId) {
      where.professionalId = req.user.professionalId;
    }

    const payments = await centralPrisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    res.json(payments);
  } catch (err) {
    console.error('Erro ao listar pagamentos:', err);
    res.status(500).json({ error: 'Erro ao listar pagamentos.' });
  }
});

// POST /api/payments
router.post('/', requireAuth, async (req, res) => {
  const { bookingId, professionalId, type, value, method, description, status, date, category } = req.body;
  try {
    const numericValue = Number(value);
    const allowedTypes = new Set(['income', 'expense']);
    const allowedStatuses = new Set(['paid', 'pending', 'cancelled']);

    if (!allowedTypes.has(type)) {
      return res.status(400).json({ error: 'Tipo de pagamento invalido.' });
    }

    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      return res.status(400).json({ error: 'Valor do pagamento deve ser maior que zero.' });
    }

    if (!description || !String(description).trim()) {
      return res.status(400).json({ error: 'Descricao do pagamento e obrigatoria.' });
    }

    if (!isValidDateString(date)) {
      return res.status(400).json({ error: 'Data do pagamento invalida.' });
    }

    if (status && !allowedStatuses.has(status)) {
      return res.status(400).json({ error: 'Status de pagamento invalido.' });
    }

    if (bookingId) {
      const booking = await centralPrisma.booking.findFirst({
        where: { id: Number(bookingId), businessId: req.user.businessId }
      });
      if (!booking) return res.status(403).json({ error: 'Agendamento invalido para este negocio.' });
    }

    if (professionalId) {
      const professional = await centralPrisma.professional.findFirst({
        where: { id: Number(professionalId), businessId: req.user.businessId }
      });
      if (!professional) return res.status(403).json({ error: 'Profissional invalido para este negocio.' });
    }

    const payment = await centralPrisma.payment.create({
      data: {
        bookingId: bookingId ? Number(bookingId) : null,
        professionalId: professionalId ? Number(professionalId) : null,
        businessId: req.user.businessId,
        type,
        value: numericValue,
        method,
        description: String(description).trim(),
        category,
        status: status || 'paid',
        date
      }
    });
    res.status(201).json(payment);
  } catch (err) {
    console.error('Erro ao registrar pagamento:', err);
    res.status(500).json({ error: 'Erro interno ao registrar pagamento.' });
  }
});
// POST /api/payments/:id/generate-link
router.post('/:id/generate-link', requireAuth, async (req, res) => {
  try {
    const payment = await centralPrisma.payment.findFirst({
      where: {
        id: Number(req.params.id),
        OR: [
          { businessId: req.user.businessId },
          { booking: { businessId: req.user.businessId } }
        ]
      },
      include: { booking: { include: { client: true, professional: true } } }
    });

    if (!payment) return res.status(404).json({ error: 'Pagamento nao encontrado ou acesso negado.' });

    // Multi-tenant: Get business credentials
    const business = await centralPrisma.business.findUnique({
      where: { id: req.user.businessId }
    });

    if (!business || !business.mpAccessToken) {
      return res.status(400).json({ error: 'Credenciais do negocio nao configuradas.' });
    }

    let tokenToUse = business.mpAccessToken;
    let marketplaceFee = 0;

    // Split logic for services (NOT for "Sinal")
    const normalizedCategory = normalizeCategory(payment.category);
    const isService = normalizedCategory === 'servico';
    const professional = payment.booking?.professional;

    if (isService && professional) {
      const commissionRate = professional.commission || 60; 
      const professionalPart = Number(((payment.value * commissionRate) / 100).toFixed(2));
      const businessPart = Number((payment.value - professionalPart).toFixed(2));

      await centralPrisma.payment.update({
        where: { id: payment.id },
        data: {
          businessValue: businessPart,
          professionalValue: professionalPart,
          professionalId: professional.id
        }
      });

      if (professional.mpAccessToken) {
        tokenToUse = professional.mpAccessToken;
        marketplaceFee = businessPart;
      }
    } else if (normalizedCategory === 'sinal') {
      await centralPrisma.payment.update({
        where: { id: payment.id },
        data: {
          businessValue: payment.value,
          professionalValue: 0
        }
      });
    }

    const preference = await mercadoPagoService.createPreference({
      title: payment.description || 'Servico Profissional',
      unit_price: payment.value,
      external_reference: `business_${req.user.businessId}_payment_${payment.id}`,
      token: tokenToUse,
      marketplace_fee: marketplaceFee
    });

    if (!preference) return res.status(500).json({ error: 'Erro ao gerar link de pagamento.' });

    res.json(preference);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao processar link.' });
  }
});

// DELETE /api/payments/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const payment = await centralPrisma.payment.findFirst({
      where: {
        id: Number(req.params.id),
        businessId: req.user.businessId
      }
    });

    if (!payment) {
      return res.status(404).json({ error: 'Pagamento nao encontrado ou nao pertence a este negocio.' });
    }

    await centralPrisma.payment.delete({ where: { id: payment.id } });
    res.json({ message: 'Pagamento removido com sucesso.' });
  } catch (err) {
    console.error('Erro ao remover pagamento:', err);
    res.status(500).json({ error: 'Erro interno ao remover pagamento.' });
  }
});

export default router;
