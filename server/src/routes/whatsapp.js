import express from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// POST /api/whatsapp/send
router.post('/send', requireAuth, async (req, res) => {
  const { phone, message } = req.body;
  const cleanPhone = String(phone || '').replace(/\D/g, '');
  const cleanMessage = String(message || '').trim();

  if (cleanPhone.length < 10 || !cleanMessage) {
    return res.status(400).json({ error: 'Telefone e mensagem sao obrigatorios.' });
  }

  console.log(`[WhatsApp Outgoing] Business ${req.user.businessId} | To: ${cleanPhone}`);

  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    details: 'Mensagem processada pelo servidor mock'
  });
});

export default router;