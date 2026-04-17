import express from 'express';

import { requireAuth } from '../middleware/auth.js';
import { centralPrisma } from '../lib/prisma.js';
import whatsappService from '../services/whatsapp.js';

const router = express.Router();

const ACTIVE_BOOKING_STATUSES = ['pending', 'confirmed', 'deposit_paid', 'in_service', 'quote'];

async function validateServicesOwnership(tx, businessId, serviceIds = []) {
  if (!Array.isArray(serviceIds) || serviceIds.length === 0) return [];

  const services = await tx.service.findMany({
    where: {
      businessId,
      id: { in: serviceIds.map((id) => Number(id)) },
    },
  });

  if (services.length !== serviceIds.length) {
    throw new Error('INVALID_SERVICES');
  }

  return services.map((service) => ({ id: service.id }));
}

async function ensureSlotAvailable(tx, { businessId, professionalId, date, time, bookingId }) {
  if (!date || !time || !professionalId) return;

  const conflict = await tx.booking.findFirst({
    where: {
      businessId,
      professionalId: Number(professionalId),
      date,
      time,
      status: { in: ACTIVE_BOOKING_STATUSES },
      id: bookingId ? { not: Number(bookingId) } : undefined,
    },
  });

  if (conflict) {
    throw new Error('BOOKING_CONFLICT');
  }
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const where = { businessId: req.user.businessId };
    if (req.user.role === 'professional' && req.user.professionalId) {
      where.professionalId = req.user.professionalId;
    }

    const bookings = await centralPrisma.booking.findMany({
      where,
      include: { client: true, professional: true, payments: true, services: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json(bookings);
  } catch (err) {
    console.error('Erro ao listar agendamentos:', err);
    res.status(500).json({ error: 'Erro ao listar agendamentos.' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { clientId, professionalId, project, description, totalValue, deposit, date, time, method, serviceIds, status } = req.body;

  try {
    const result = await centralPrisma.$transaction(async (tx) => {
      const [client, professional] = await Promise.all([
        tx.client.findFirst({ where: { id: Number(clientId), businessId: req.user.businessId } }),
        tx.professional.findFirst({ where: { id: Number(professionalId), businessId: req.user.businessId } }),
      ]);

      if (!client || !professional) {
        throw new Error('CLIENT_OR_PROFESSIONAL_NOT_FOUND');
      }

      await ensureSlotAvailable(tx, {
        businessId: req.user.businessId,
        professionalId,
        date,
        time,
      });

      const connectedServices = await validateServicesOwnership(tx, req.user.businessId, serviceIds);
      const finalStatus = status || (Number(deposit) > 0 ? 'deposit_paid' : 'pending');

      const booking = await tx.booking.create({
        data: {
          clientId: client.id,
          professionalId: professional.id,
          project,
          description,
          totalValue: Number(totalValue) || 0,
          deposit: Number(deposit) || 0,
          date,
          time,
          businessId: req.user.businessId,
          status: finalStatus,
          services: connectedServices.length > 0 ? { connect: connectedServices } : undefined,
        },
        include: { client: true, professional: true, services: true },
      });

      if (Number(deposit) > 0 && finalStatus !== 'quote') {
        await tx.payment.create({
          data: {
            businessId: req.user.businessId,
            bookingId: booking.id,
            professionalId: professional.id,
            type: 'income',
            category: 'Sinal',
            description: `Sinal - ${client.name} (${project || booking.services.map((service) => service.name).join(', ')})`,
            value: Number(deposit),
            date,
            method: method || 'pix',
          },
        });
      }

      return booking;
    });

    if (result.client.phone) {
      try {
        const business = await centralPrisma.business.findUnique({
          where: { id: req.user.businessId },
        });

        whatsappService.sendAppointmentConfirmation(
          result.client.phone,
          result.client.name,
          result.date,
          result.time,
          {
            id: business?.waInstanceId,
            key: business?.waApiKey,
          },
        );
      } catch (err) {
        console.warn('Nao foi possivel enviar notificacao no WhatsApp:', err.message);
      }
    }

    res.status(201).json(result);
  } catch (err) {
    if (err.message === 'CLIENT_OR_PROFESSIONAL_NOT_FOUND') {
      return res.status(403).json({ error: 'Cliente ou profissional invalido para este negocio.' });
    }

    if (err.message === 'INVALID_SERVICES') {
      return res.status(403).json({ error: 'Um ou mais servicos nao pertencem a este negocio.' });
    }

    if (err.message === 'BOOKING_CONFLICT') {
      return res.status(409).json({ error: 'Ja existe um agendamento para este profissional neste horario.' });
    }

    console.error('Erro ao criar agendamento:', err);
    res.status(500).json({ error: 'Erro interno ao criar agendamento.' });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  const { status, project, description, totalValue, deposit, date, time, serviceIds } = req.body;

  try {
    const result = await centralPrisma.$transaction(async (tx) => {
      const oldBooking = await tx.booking.findFirst({
        where: { id: Number(req.params.id), businessId: req.user.businessId },
        include: { client: true },
      });

      if (!oldBooking) {
        throw new Error('BOOKING_NOT_FOUND');
      }

      await ensureSlotAvailable(tx, {
        businessId: req.user.businessId,
        professionalId: oldBooking.professionalId,
        date: date ?? oldBooking.date,
        time: time ?? oldBooking.time,
        bookingId: oldBooking.id,
      });

      const connectedServices = serviceIds ? await validateServicesOwnership(tx, req.user.businessId, serviceIds) : null;

      const booking = await tx.booking.update({
        where: { id: oldBooking.id },
        data: {
          status,
          project,
          description,
          totalValue: totalValue !== undefined ? Number(totalValue) : undefined,
          deposit: deposit !== undefined ? Number(deposit) : undefined,
          date,
          time,
          services: connectedServices ? { set: connectedServices } : undefined,
        },
        include: { client: true, professional: true, payments: true, services: true },
      });

      if (status === 'completed' && oldBooking.status !== 'completed') {
        const existingFinalPayment = await tx.payment.findFirst({
          where: { bookingId: booking.id, category: 'Servico' },
        });

        if (!existingFinalPayment) {
          const remainingValue = Number(booking.totalValue || 0) - Number(booking.deposit || 0);
          if (remainingValue > 0) {
            await tx.payment.create({
              data: {
                businessId: req.user.businessId,
                bookingId: booking.id,
                professionalId: booking.professionalId,
                type: 'income',
                category: 'Servico',
                description: `Pagamento final - ${booking.client.name} (${project || booking.services.map((service) => service.name).join(', ') || booking.project})`,
                value: remainingValue,
                date: new Date().toISOString().split('T')[0],
                method: 'pix',
              },
            });
          }
        }
      }

      return booking;
    });

    res.json(result);
  } catch (err) {
    if (err.message === 'BOOKING_NOT_FOUND') {
      return res.status(404).json({ error: 'Agendamento nao encontrado ou acesso negado.' });
    }

    if (err.message === 'INVALID_SERVICES') {
      return res.status(403).json({ error: 'Um ou mais servicos nao pertencem a este negocio.' });
    }

    if (err.message === 'BOOKING_CONFLICT') {
      return res.status(409).json({ error: 'Ja existe um agendamento para este profissional neste horario.' });
    }

    console.error('Erro ao atualizar agendamento:', err);
    res.status(500).json({ error: 'Erro interno ao atualizar agendamento.' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await centralPrisma.booking.findFirst({
      where: { id: Number(req.params.id), businessId: req.user.businessId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Agendamento nao encontrado para remocao.' });
    }

    await centralPrisma.booking.delete({ where: { id: existing.id } });
    res.json({ message: 'Agendamento removido com sucesso.' });
  } catch (err) {
    console.error('Erro ao remover agendamento:', err);
    res.status(500).json({ error: 'Erro interno ao remover agendamento.' });
  }
});

export default router;
