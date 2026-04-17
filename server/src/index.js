import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import businessRoutes from './routes/studios.js';
import userRoutes from './routes/users.js';
import professionalRoutes from './routes/artists.js';
import clientRoutes from './routes/clients.js';
import bookingRoutes from './routes/sessions.js';
import serviceRoutes from './routes/services.js';
import paymentRoutes from './routes/payments.js';
import scheduleRoutes from './routes/schedules.js';
import leadRoutes from './routes/leads.js';
import inventoryRoutes from './routes/inventory.js';
import portfolioRoutes from './routes/portfolio.js';
import uploadRoutes from './routes/uploads.js';
import webhookRoutes from './routes/webhooks.js';
import registrationRoutes from './routes/registration.js';
import devPanelRoutes from './routes/devpanel.js';
import whatsappRoutes from './routes/whatsapp.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

export const requestLog = [];
app.use((req, res, next) => {
  if (req.path.startsWith('/uploads')) return next();
  const start = Date.now();
  res.on('finish', () => {
    requestLog.unshift({
      id: Date.now(),
      method: req.method,
      path: req.path,
      status: res.statusCode,
      ms: Date.now() - start,
      ip: req.ip,
      at: new Date().toISOString(),
    });
    if (requestLog.length > 100) requestLog.pop();
  });
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/studios', businessRoutes); // Legacy compatibility route alias.
app.use('/api/users', userRoutes);
app.use('/api/professionals', professionalRoutes);
app.use('/api/artists', professionalRoutes); // Legacy compatibility route alias.
app.use('/api/clients', clientRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/sessions', bookingRoutes); // Legacy compatibility route alias.
app.use('/api/services', serviceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/register', registrationRoutes);
app.use('/api/dev', devPanelRoutes);
app.use('/api/whatsapp', whatsappRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const distPath = path.join(__dirname, '..', '..', 'dist');

app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('Ink Masters API running on http://0.0.0.0:' + PORT);
});
