import express from 'express';

import { requireAuth } from '../middleware/auth.js';
import { centralPrisma } from '../lib/prisma.js';

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const items = await centralPrisma.inventoryItem.findMany({
      where: { businessId: req.user.businessId },
      orderBy: { name: 'asc' },
    });
    res.json(items);
  } catch (err) {
    console.error('Erro ao listar estoque:', err);
    res.status(500).json({ error: 'Erro ao listar estoque.' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { name, category, quantity, unit, minQuantity, supplier, price } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ error: 'Nome obrigatorio.' });
  }

  try {
    const item = await centralPrisma.inventoryItem.create({
      data: {
        name: name.trim(),
        category,
        unit,
        supplier,
        quantity: Number(quantity) || 0,
        minQuantity: Number(minQuantity) || 0,
        price: price ? Number(price) : null,
        businessId: req.user.businessId,
      },
    });

    res.status(201).json(item);
  } catch (err) {
    console.error('Erro ao adicionar item:', err);
    res.status(500).json({ error: 'Erro ao adicionar item.' });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  const { name, category, quantity, unit, minQuantity, supplier, price } = req.body;

  try {
    const existing = await centralPrisma.inventoryItem.findFirst({
      where: { id: Number(req.params.id), businessId: req.user.businessId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Item de estoque nao encontrado ou acesso negado.' });
    }

    const item = await centralPrisma.inventoryItem.update({
      where: { id: existing.id },
      data: {
        name,
        category,
        quantity: quantity !== undefined ? Number(quantity) : undefined,
        unit,
        minQuantity: minQuantity !== undefined ? Number(minQuantity) : undefined,
        supplier,
        price: price !== undefined ? Number(price) : undefined,
      },
    });

    res.json(item);
  } catch (err) {
    console.error('Erro ao atualizar estoque:', err);
    res.status(500).json({ error: 'Erro interno ao atualizar item.' });
  }
});

router.put('/batch/update', requireAuth, async (req, res) => {
  const { updates } = req.body;

  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({ error: 'Nenhuma atualizacao de estoque foi enviada.' });
  }

  try {
    const itemIds = updates.map((update) => Number(update.id)).filter(Boolean);
    const ownedItems = await centralPrisma.inventoryItem.findMany({
      where: {
        businessId: req.user.businessId,
        id: { in: itemIds },
      },
      select: { id: true },
    });

    if (ownedItems.length !== itemIds.length) {
      return res.status(403).json({ error: 'Um ou mais itens nao pertencem a este negocio.' });
    }

    await centralPrisma.$transaction(
      updates.map((update) => centralPrisma.inventoryItem.update({
        where: { id: Number(update.id) },
        data: { quantity: Number(update.quantity) || 0 },
      })),
    );

    const refreshedItems = await centralPrisma.inventoryItem.findMany({
      where: {
        businessId: req.user.businessId,
        id: { in: itemIds },
      },
      orderBy: { name: 'asc' },
    });

    res.json(refreshedItems);
  } catch (err) {
    console.error('Erro ao atualizar estoque em lote:', err);
    res.status(500).json({ error: 'Erro ao atualizar estoque em lote.' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await centralPrisma.inventoryItem.findFirst({
      where: { id: Number(req.params.id), businessId: req.user.businessId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Item de estoque nao encontrado para remocao.' });
    }

    await centralPrisma.inventoryItem.delete({ where: { id: existing.id } });
    res.json({ message: 'Item removido com sucesso.' });
  } catch (err) {
    console.error('Erro ao remover item:', err);
    res.status(500).json({ error: 'Erro interno ao remover item.' });
  }
});

export default router;
