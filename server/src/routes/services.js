import express from 'express';

import { requireAuth } from '../middleware/auth.js';
import { centralPrisma } from '../lib/prisma.js';

const router = express.Router();

async function validateProfessionalIds(businessId, professionalIds = []) {
  if (!Array.isArray(professionalIds) || professionalIds.length === 0) {
    return [];
  }

  const ids = professionalIds.map((id) => Number(id));
  const professionals = await centralPrisma.professional.findMany({
    where: {
      businessId,
      id: { in: ids },
    },
    select: { id: true },
  });

  if (professionals.length !== ids.length) {
    throw new Error('INVALID_PROFESSIONALS');
  }

  return professionals.map((professional) => ({ id: professional.id }));
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const services = await centralPrisma.service.findMany({
      where: { businessId: req.user.businessId },
      include: { professionals: true },
      orderBy: { name: 'asc' },
    });

    res.json(services);
  } catch (err) {
    console.error('Erro ao listar servicos:', err);
    res.status(500).json({ error: 'Erro ao listar servicos.' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { name, category, duration, price, cost, commission, description, professionalIds } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ error: 'Nome do servico e obrigatorio.' });
  }

  try {
    const connectedProfessionals = await validateProfessionalIds(req.user.businessId, professionalIds);

    const service = await centralPrisma.service.create({
      data: {
        name: name.trim(),
        category,
        duration: duration ? Number(duration) : 60,
        price: price ? Number(price) : 0,
        cost: cost ? Number(cost) : 0,
        commission: commission ? Number(commission) : null,
        description,
        businessId: req.user.businessId,
        professionals: connectedProfessionals.length > 0 ? { connect: connectedProfessionals } : undefined,
      },
      include: { professionals: true },
    });

    res.status(201).json(service);
  } catch (err) {
    if (err.message === 'INVALID_PROFESSIONALS') {
      return res.status(403).json({ error: 'Um ou mais profissionais nao pertencem a este negocio.' });
    }

    console.error('Erro ao criar servico:', err);
    res.status(500).json({ error: 'Erro ao criar servico.' });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  const { name, category, duration, price, cost, commission, description, professionalIds } = req.body;

  try {
    const existing = await centralPrisma.service.findFirst({
      where: { id: Number(req.params.id), businessId: req.user.businessId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Servico nao encontrado ou acesso negado.' });
    }

    const connectedProfessionals = professionalIds ? await validateProfessionalIds(req.user.businessId, professionalIds) : null;

    const service = await centralPrisma.service.update({
      where: { id: existing.id },
      data: {
        name,
        category,
        duration: duration !== undefined ? Number(duration) : undefined,
        price: price !== undefined ? Number(price) : undefined,
        cost: cost !== undefined ? Number(cost) : undefined,
        commission: commission !== undefined ? Number(commission) : undefined,
        description,
        professionals: connectedProfessionals ? { set: connectedProfessionals } : undefined,
      },
      include: { professionals: true },
    });

    res.json(service);
  } catch (err) {
    if (err.message === 'INVALID_PROFESSIONALS') {
      return res.status(403).json({ error: 'Um ou mais profissionais nao pertencem a este negocio.' });
    }

    console.error('Erro ao atualizar servico:', err);
    res.status(500).json({ error: 'Erro ao atualizar servico.' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await centralPrisma.service.findFirst({
      where: { id: Number(req.params.id), businessId: req.user.businessId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Servico nao encontrado para exclusao.' });
    }

    await centralPrisma.service.delete({ where: { id: existing.id } });
    res.json({ message: 'Servico excluido com sucesso.' });
  } catch (err) {
    console.error('Erro ao excluir servico:', err);
    res.status(500).json({ error: 'Erro ao excluir servico.' });
  }
});

export default router;
