import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { centralPrisma } from '../lib/prisma.js';

const router = express.Router();

/**
 * Public route to register a new studio and its first admin user
 * Focused on SaaS security and scalability.
 */
router.post('/', async (req, res) => {
  const { studioName, userName, email, password, businessNiche } = req.body;

  // 1. Normalização de dados
  const normalizedStudioName = studioName?.trim();
  const normalizedUserName = userName?.trim().toLowerCase();
  const normalizedEmail = email?.trim().toLowerCase();

  // 2. Validação Básica
  if (!normalizedStudioName || !normalizedUserName || !password) {
    return res.status(400).json({ error: 'Nome do estúdio, usuário e senha são obrigatórios.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'A senha deve ter no mínimo 8 caracteres para sua segurança.' });
  }

  try {
    // 3. Processamento Atômico
    const result = await centralPrisma.$transaction(async (tx) => {
      
      // A. Validar Email Único (Regra de Negócio SaaS)
      if (normalizedEmail) {
        const existingEmail = await tx.user.findFirst({
          where: { email: normalizedEmail }
        });
        if (existingEmail) {
          throw new Error('EMAIL_ALREADY_EXISTS');
        }
      }

      // B. Gerar publicId Seguro (Hexadecimal de 12 caracteres / 6 bytes)
      const publicId = crypto.randomBytes(6).toString('hex').toUpperCase();

      // C. Criar o Negócio (Business/Studio)
      const business = await tx.business.create({
        data: {
          name: normalizedStudioName,
          publicId: publicId,
          type: businessNiche || 'tattoo',
          isActive: true
        }
      });

      // D. Hash da Senha
      const hashedPassword = await bcrypt.hash(password, 10);

      // E. Criar o Usuário Administrador
      const user = await tx.user.create({
        data: {
          name: normalizedUserName,
          email: normalizedEmail,
          password: hashedPassword,
          role: 'admin',
          businessId: business.id
        }
      });

      return { business, user };
    });

    console.log(`[Registration] Novo negócio criado: ${normalizedStudioName} (${result.business.publicId})`);

    res.status(201).json({
      message: 'Negócio e administrador cadastrados com sucesso!',
      business: result.business,
      user: { 
        id: result.user.id, 
        name: result.user.name, 
        role: result.user.role 
      }
    });

  } catch (err) {
    console.error('[Registration Error]:', err.message);

    if (err.message === 'EMAIL_ALREADY_EXISTS') {
      return res.status(409).json({ error: 'Este email já está sendo utilizado em outro cadastro.' });
    }

    if (err.code === 'P2002') {
      // Unicidade @@unique([businessId, name])
      return res.status(409).json({ error: 'Já existe um usuário com este nome neste estúdio.' });
    }

    res.status(500).json({ 
      error: 'Ocorreu um erro ao processar o cadastro. Tente novamente em instantes.',
      details: err.message 
    });
  }
});

export default router;
