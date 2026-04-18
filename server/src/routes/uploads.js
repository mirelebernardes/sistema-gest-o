import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

import { requireAuth } from '../middleware/auth.js';
import { centralPrisma } from '../lib/prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, '..', '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const removeUploadedFile = (filePath) => {
  if (!filePath || !fs.existsSync(filePath)) return;

  try {
    fs.unlinkSync(filePath);
  } catch (err) {
    console.error('Erro ao limpar arquivo temporario:', err.message);
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|pdf/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    cb(null, ext && mime);
  },
});

const router = express.Router();

router.post('/image', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  }

  const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ url, filename: req.file.filename });
});

router.post('/client-doc/:clientId', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  }

  const clientId = Number(req.params.clientId);
  const filePath = req.file.path;
  const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

  try {
    const client = await centralPrisma.client.findFirst({
      where: {
        id: clientId,
        businessId: req.user.businessId,
      },
    });

    if (!client) {
      removeUploadedFile(filePath);
      return res.status(404).json({ error: 'Cliente nao encontrado para anexar documento.' });
    }

    const doc = await centralPrisma.clientDocument.create({
      data: {
        clientId,
        name: req.file.originalname,
        type: req.file.mimetype,
        url,
        size: req.file.size,
      },
    });

    res.status(201).json(doc);
  } catch (err) {
    console.error('Erro ao salvar documento do cliente:', err);
    removeUploadedFile(filePath);
    res.status(500).json({ error: 'Erro ao salvar documento.' });
  }
});

export default router;
