import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

import { requireAuth } from '../middleware/auth.js';
import { centralPrisma } from '../lib/prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

const uploadDir = path.join(__dirname, '..', '..', '..', 'uploads', 'portfolio');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const removeUploadedFile = (filePath) => {
  if (!filePath || !fs.existsSync(filePath)) return;
  try {
    fs.unlinkSync(filePath);
  } catch (err) {
    console.error('Erro ao remover arquivo do portfolio:', err.message);
  }
};

const parsePortfolioItem = (item) => {
  let tagsArray = [];
  try {
    tagsArray = item.tags ? JSON.parse(item.tags) : [];
  } catch {
    tagsArray = [];
  }
  return { ...item, tags: tagsArray };
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `portfolio-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|mp4|webm/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);

    if (ext && mime) return cb(null, true);
    cb(new Error('Formato nao suportado. Use JPG, PNG, WEBP, MP4 ou WEBM.'));
  },
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const items = await centralPrisma.portfolioItem.findMany({
      where: { businessId: req.user.businessId },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });

    res.json(items.map(parsePortfolioItem));
  } catch (err) {
    console.error('Portfolio GET Error:', err);
    res.status(500).json({ error: 'Erro ao listar portfolio.' });
  }
});

router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  }

  const {
    professionalId,
    professionalName,
    style,
    region,
    date,
    tags,
    title,
  } = req.body;

  const filePath = req.file.path;
  const url = `${req.protocol}://${req.get('host')}/uploads/portfolio/${req.file.filename}`;
  const mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';

  try {
    if (professionalId) {
      const professional = await centralPrisma.professional.findFirst({
        where: {
          id: Number(professionalId),
          businessId: req.user.businessId,
        },
      });

      if (!professional) {
        removeUploadedFile(filePath);
        return res.status(403).json({ error: 'Profissional invalido para este negocio.' });
      }
    }

    const item = await centralPrisma.portfolioItem.create({
      data: {
        businessId: req.user.businessId,
        professionalId: professionalId ? Number(professionalId) : null,
        title: title || style || region || req.file.originalname,
        professionalName,
        style,
        region,
        date: date || new Date().toISOString(),
        imageUrl: url,
        mediaType,
        tags: tags ? (typeof tags === 'string' ? tags : JSON.stringify(tags)) : null,
      },
    });

    res.status(201).json(parsePortfolioItem(item));
  } catch (err) {
    console.error('Portfolio Upload Error:', err);
    removeUploadedFile(filePath);
    res.status(500).json({ error: 'Erro ao salvar item do portfolio.' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const item = await centralPrisma.portfolioItem.findFirst({
      where: {
        id: Number(req.params.id),
        businessId: req.user.businessId,
      },
    });

    if (!item) {
      return res.status(404).json({ error: 'Item do portfolio nao encontrado.' });
    }

    const fileName = item.imageUrl?.split('/uploads/portfolio/')[1];
    if (fileName) {
      removeUploadedFile(path.join(uploadDir, fileName));
    }

    await centralPrisma.portfolioItem.delete({ where: { id: item.id } });
    res.json({ message: 'Item removido com sucesso.' });
  } catch (err) {
    console.error('Portfolio DELETE Error:', err);
    res.status(500).json({ error: 'Erro ao remover item.' });
  }
});

export default router;
