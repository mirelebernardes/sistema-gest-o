import express from 'express';

import { requireAuth } from '../middleware/auth.js';
import { centralPrisma } from '../lib/prisma.js';

const router = express.Router();

const ACTIVE_STATUSES = ['scheduled', 'confirmed'];

async function validateOwnership({ businessId, clientId, professionalId }) {
  if (clientId) {
    const client = await centralPrisma.client.findFirst({
      where: { id: Number(clientId), businessId },
    });

    if (!client) {
      throw new Error('INVALID_CLIENT');
    }
  }

  if (professionalId) {
    const professional = await centralPrisma.professional.findFirst({
      where: { id: Number(professionalId), businessId },
    });

    if (!professional) {
      throw new Error('INVALID_PROFESSIONAL');
    }
  }
}

async function ensureScheduleAvailability({ businessId, professionalId, date, time, scheduleId }) {
  if (!professionalId || !date || !time) return;

  const conflict = await centralPrisma.schedule.findFirst({
    where: {
      businessId,
      professionalId: Number(professionalId),
      date,
      time,
      status: { in: ACTIVE_STATUSES },
      id: scheduleId ? { not: Number(scheduleId) } : undefined,
    },
  });

  if (conflict) {
    throw new Error('SCHEDULE_CONFLICT');
  }
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const where = { businessId: req.user.businessId };
    if (req.user.role === 'professional' && req.user.professionalId) {
      where.professionalId = req.user.professionalId;
    }

    const schedules = await centralPrisma.schedule.findMany({
      where,
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    });

    res.json(schedules);
  } catch (err) {
    console.error('Erro ao listar agenda:', err);
    res.status(500).json({ error: 'Erro ao listar agenda.' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { clientId, professionalId, title, date, time, duration, notes } = req.body;

  if (!title?.trim() || !date) {
    return res.status(400).json({ error: 'Titulo e data obrigatorios.' });
  }

  try {
    await validateOwnership({
      businessId: req.user.businessId,
      clientId,
      professionalId,
    });

    await ensureScheduleAvailability({
      businessId: req.user.businessId,
      professionalId,
      date,
      time,
    });

    const schedule = await centralPrisma.schedule.create({
      data: {
        clientId: clientId ? Number(clientId) : null,
        professionalId: professionalId ? Number(professionalId) : null,
        title: title.trim(),
        date,
        time,
        duration: duration !== undefined ? Number(duration) : 60,
        notes,
        businessId: req.user.businessId,
      },
    });

    res.status(201).json(schedule);
  } catch (err) {
    if (err.message === 'INVALID_CLIENT') {
      return res.status(403).json({ error: 'Cliente invalido para este negocio.' });
    }

    if (err.message === 'INVALID_PROFESSIONAL') {
      return res.status(403).json({ error: 'Profissional invalido para este negocio.' });
    }

    if (err.message === 'SCHEDULE_CONFLICT') {
      return res.status(409).json({ error: 'Ja existe um compromisso para este profissional neste horario.' });
    }

    console.error('Erro ao criar agendamento:', err);
    res.status(500).json({ error: 'Erro interno ao criar agendamento.' });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  const { clientId, professionalId, title, date, time, duration, notes, status } = req.body;

  try {
    const existing = await centralPrisma.schedule.findFirst({
      where: { id: Number(req.params.id), businessId: req.user.businessId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Agendamento nao encontrado ou acesso negado.' });
    }

    await validateOwnership({
      businessId: req.user.businessId,
      clientId: clientId ?? existing.clientId,
      professionalId: professionalId ?? existing.professionalId,
    });

    await ensureScheduleAvailability({
      businessId: req.user.businessId,
      professionalId: professionalId ?? existing.professionalId,
      date: date ?? existing.date,
      time: time ?? existing.time,
      scheduleId: existing.id,
    });

    const schedule = await centralPrisma.schedule.update({
      where: { id: existing.id },
      data: {
        clientId: clientId !== undefined ? (clientId ? Number(clientId) : null) : undefined,
        professionalId: professionalId !== undefined ? (professionalId ? Number(professionalId) : null) : undefined,
        title: title?.trim(),
        date,
        time,
        duration: duration !== undefined ? Number(duration) : undefined,
        notes,
        status,
      },
    });

    res.json(schedule);
  } catch (err) {
    if (err.message === 'INVALID_CLIENT') {
      return res.status(403).json({ error: 'Cliente invalido para este negocio.' });
    }

    if (err.message === 'INVALID_PROFESSIONAL') {
      return res.status(403).json({ error: 'Profissional invalido para este negocio.' });
    }

    if (err.message === 'SCHEDULE_CONFLICT') {
      return res.status(409).json({ error: 'Ja existe um compromisso para este profissional neste horario.' });
    }

    console.error('Erro ao atualizar agendamento:', err);
    res.status(500).json({ error: 'Erro interno ao atualizar agendamento.' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await centralPrisma.schedule.findFirst({
      where: { id: Number(req.params.id), businessId: req.user.businessId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Agendamento nao encontrado para remocao.' });
    }

    await centralPrisma.schedule.delete({ where: { id: existing.id } });
    res.json({ message: 'Agendamento removido com sucesso.' });
  } catch (err) {
    console.error('Erro ao remover agendamento:', err);
    res.status(500).json({ error: 'Erro interno ao remover agendamento.' });
  }
});

export default router;
