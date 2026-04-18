import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { centralPrisma } from '../lib/prisma.js';
import { requireJwtSecret } from '../lib/jwt.js';

const router = express.Router();

function buildUserResponse(user) {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    businessId: user.businessId,
    phone: user.phone,
    professionalId: user.professionalId,
    businessName: user.business?.name,
  };
}

router.post('/login', async (req, res) => {
  const { name, email, password } = req.body;
  const identifier = (email || name)?.trim().toLowerCase();

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Usuario ou e-mail e senha sao obrigatorios.' });
  }

  try {
    let user = null;
    const isEmail = identifier.includes('@');

    if (isEmail) {
      user = await centralPrisma.user.findFirst({
        where: { email: identifier },
        include: { business: true },
      });
    } else {
      const users = await centralPrisma.user.findMany({
        where: { name: identifier },
        include: { business: true },
        take: 2,
      });

      if (users.length > 1) {
        return res.status(409).json({
          error: 'Este usuario existe em mais de um negocio. Entre com o e-mail para acessar a conta correta.',
        });
      }

      user = users[0] || null;
    }

    if (!user) {
      return res.status(401).json({ error: 'Credenciais invalidas ou usuario nao encontrado.' });
    }

    if (user.business && !user.business.isActive) {
      return res.status(403).json({ error: 'Este negocio esta desativado. Entre em contato com o suporte.' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Senha incorreta.' });
    }

    const jwtSecret = requireJwtSecret(res);
    if (!jwtSecret) return;

    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        role: user.role,
        businessId: user.businessId,
        professionalId: user.professionalId,
        businessPublicId: user.business?.publicId,
      },
      jwtSecret,
      { expiresIn: '24h' },
    );

    res.json({
      token,
      user: buildUserResponse(user),
    });
  } catch (err) {
    console.error('[Auth Error]:', err);
    res.status(500).json({ error: 'Erro interno no servidor ao tentar autenticar.' });
  }
});

router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Nao autorizado.' });
  }

  try {
    const jwtSecret = requireJwtSecret(res);
    if (!jwtSecret) return;

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, jwtSecret);
    const user = await centralPrisma.user.findUnique({
      where: { id: decoded.id },
      include: { business: true },
    });

    if (!user || !user.business || !user.business.isActive) {
      return res.status(401).json({ error: 'Usuario nao encontrado ou negocio inativo.' });
    }

    res.json(buildUserResponse(user));
  } catch (err) {
    console.error('[Auth /me Error]:', err);
    res.status(401).json({ error: 'Token invalido.' });
  }
});

export default router;
