import express from 'express';

import { centralPrisma } from '../lib/prisma.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

const router = express.Router();

const safeParse = (value) => {
  try {
    return value ? JSON.parse(value) : null;
  } catch (err) {
    console.error('[Business Route] JSON Parse Error:', err.message);
    return null;
  }
};

const sanitizeBusiness = (business) => {
  if (!business) return null;

  const {
    mpAccessToken,
    waApiKey,
    waInstanceId: _waInstanceId,
    waInstanceUrl: _waInstanceUrl,
    ...safeBusiness
  } = business;

  return {
    ...safeBusiness,
    hours: safeParse(business.hours),
    notifications: safeParse(business.notifications),
    hasMpConfigured: !!mpAccessToken,
    hasWhatsappConfigured: !!waApiKey,
  };
};

router.get('/current', requireAuth, async (req, res) => {
  try {
    const business = await centralPrisma.business.findUnique({
      where: { id: req.user.businessId },
    });

    if (!business) {
      return res.status(404).json({ error: 'Negocio nao encontrado.' });
    }

    res.json(sanitizeBusiness(business));
  } catch (err) {
    console.error('[GET /current] Error:', err.message);
    res.status(500).json({ error: 'Erro ao buscar dados do negocio.' });
  }
});

router.put('/current', requireAuth, requireAdmin, async (req, res) => {
  const {
    name,
    type,
    modules,
    address,
    phone,
    email,
    hours,
    notifications,
    mpAccessToken,
    waApiKey,
    waInstanceId,
    waInstanceUrl,
  } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ error: 'Nome do negocio obrigatorio.' });
  }

  try {
    const business = await centralPrisma.business.update({
      where: { id: req.user.businessId },
      data: {
        name: name.trim(),
        type,
        modules: Array.isArray(modules) ? modules.join(',') : modules,
        address,
        phone,
        email,
        hours: hours !== undefined ? (typeof hours === 'string' ? hours : JSON.stringify(hours)) : undefined,
        notifications: notifications !== undefined ? (typeof notifications === 'string' ? notifications : JSON.stringify(notifications)) : undefined,
        mpAccessToken: mpAccessToken !== undefined ? mpAccessToken : undefined,
        waApiKey: waApiKey !== undefined ? waApiKey : undefined,
        waInstanceId: waInstanceId !== undefined ? waInstanceId : undefined,
        waInstanceUrl: waInstanceUrl !== undefined ? waInstanceUrl : undefined,
      },
    });

    res.json(sanitizeBusiness(business));
  } catch (err) {
    console.error('[PUT /current] Error:', err.message);
    res.status(500).json({ error: 'Erro ao atualizar dados do negocio.' });
  }
});

router.get('/public/:publicId', async (req, res) => {
  const { publicId } = req.params;

  try {
    const business = await centralPrisma.business.findFirst({
      where: {
        publicId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        type: true,
        publicId: true,
        address: true,
        phone: true,
        hours: true,
        professionals: {
          select: { id: true, name: true, specialty: true },
          orderBy: { name: 'asc' },
        },
        portfolio: {
          orderBy: { createdAt: 'desc' },
          take: 12,
        },
      },
    });

    if (!business) {
      return res.status(404).json({ error: 'Link publico invalido ou negocio nao encontrado.' });
    }

    res.json({
      ...business,
      hours: safeParse(business.hours),
    });
  } catch (err) {
    console.error('[GET /public] Error:', err.message);
    res.status(500).json({ error: 'Erro ao buscar informacoes do negocio.' });
  }
});

export default router;
