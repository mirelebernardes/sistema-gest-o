import express from 'express';
import bcrypt from 'bcryptjs';

import { centralPrisma } from '../lib/prisma.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

const router = express.Router();
const ALLOWED_ROLES = new Set(['admin', 'reception', 'professional', 'artist']);

router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await centralPrisma.user.findMany({
      where: { businessId: req.user.businessId },
      select: {
        id: true,
        name: true,
        role: true,
        phone: true,
        email: true,
        businessId: true,
        createdAt: true,
        professionalId: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json(users);
  } catch (err) {
    console.error('Erro ao listar usuarios:', err);
    res.status(500).json({ error: 'Erro ao listar usuarios.' });
  }
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const {
    name,
    role,
    phone,
    email,
    password,
    professionalId,
  } = req.body;

  const normalizedName = name?.trim().toLowerCase();
  const normalizedEmail = email?.trim().toLowerCase() || null;
  const finalRole = role || 'reception';

  if (!normalizedName) {
    return res.status(400).json({ error: 'Nome obrigatorio.' });
  }

  if (!ALLOWED_ROLES.has(finalRole)) {
    return res.status(400).json({ error: 'Perfil de acesso invalido.' });
  }

  try {
    if (professionalId) {
      const professional = await centralPrisma.professional.findFirst({
        where: { id: Number(professionalId), businessId: req.user.businessId },
      });

      if (!professional) {
        return res.status(403).json({ error: 'Profissional invalido para este negocio.' });
      }
    }

    if (normalizedEmail) {
      const existingEmail = await centralPrisma.user.findFirst({
        where: { email: normalizedEmail },
      });

      if (existingEmail) {
        return res.status(409).json({ error: 'Este e-mail ja esta vinculado a outro usuario.' });
      }
    }

    const hashed = await bcrypt.hash(password || '123456', 10);
    const user = await centralPrisma.user.create({
      data: {
        name: normalizedName,
        role: finalRole === 'artist' ? 'professional' : finalRole,
        phone,
        email: normalizedEmail,
        password: hashed,
        businessId: req.user.businessId,
        professionalId: professionalId ? Number(professionalId) : null,
      },
      select: {
        id: true,
        name: true,
        role: true,
        phone: true,
        email: true,
        businessId: true,
        professionalId: true,
      },
    });

    res.status(201).json(user);
  } catch (err) {
    console.error('Erro ao criar usuario:', err);

    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Ja existe um usuario com este nome neste negocio.' });
    }

    res.status(500).json({ error: 'Erro interno ao criar usuario.' });
  }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (Number(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'Nao e possivel remover seu proprio usuario administrador.' });
    }

    const existing = await centralPrisma.user.findFirst({
      where: { id: Number(req.params.id), businessId: req.user.businessId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Usuario nao encontrado ou nao pertence a este negocio.' });
    }

    await centralPrisma.user.delete({ where: { id: existing.id } });
    res.json({ message: 'Usuario removido com sucesso.' });
  } catch (err) {
    console.error('Erro ao remover usuario:', err);
    res.status(500).json({ error: 'Erro interno ao remover usuario.' });
  }
});

export default router;
