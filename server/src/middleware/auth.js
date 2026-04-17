import jwt from 'jsonwebtoken';
import { centralPrisma } from '../lib/prisma.js';
import { requireJwtSecret } from '../lib/jwt.js';

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticação necessário.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const jwtSecret = requireJwtSecret(res);
    if (!jwtSecret) return;

    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;

    const business = await centralPrisma.business.findUnique({
      where: { id: decoded.businessId }
    });

    if (!business || !business.isActive) {
      return res.status(403).json({ error: 'Negócio desativado ou não encontrado.' });
    }

    req.user.businessId = business.id;
    req.user.professionalId = decoded.professionalId;

    next();
  } catch (err) {
    console.error('Auth Middleware Error:', err);
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso restrito a administradores.' });
  }
  next();
}

export async function publicDbMiddleware(req, res, next) {
  const businessParam = req.params.businessId || req.params.studioId || req.body.businessId || req.query.businessId;
  if (!businessParam) return res.status(400).json({ error: 'Identificador do negócio não fornecido.' });

  try {
    let business;
    if (!isNaN(businessParam) && Number(businessParam) < 10000) {
      business = await centralPrisma.business.findUnique({
        where: { id: Number(businessParam) }
      });
    } else {
      business = await centralPrisma.business.findUnique({
        where: { publicId: String(businessParam) }
      });
    }

    if (!business) return res.status(404).json({ error: 'Negócio não encontrado.' });

    next();
  } catch (err) {
    console.error('Erro no publicDbMiddleware:', err);
    res.status(500).json({ error: 'Erro ao conectar ao banco do negócio.' });
  }
}
