import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import crypto from 'crypto';

const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;

/**
 * Service to interact with Mercado Pago API v2
 */
export const mercadoPagoService = {
  /**
   * Create a payment preference with optional splitting (Marketplace style)
   */
  createPreference: async ({ 
    title, 
    unit_price, 
    quantity = 1, 
    external_reference, 
    token = null,
    marketplace_fee = 0,
  }) => {
    const activeToken = token || accessToken;
    if (!activeToken) return null;

    try {
      const mpClient = new MercadoPagoConfig({ accessToken: activeToken });
      const mpPreference = new Preference(mpClient);

      const body = {
        items: [{
          id: external_reference,
          title,
          unit_price: parseFloat(unit_price),
          quantity: parseInt(quantity),
          currency_id: 'BRL',
        }],
        external_reference,
        notification_url: `${process.env.APP_URL}/api/webhooks/mercadopago`,
        back_urls: {
          success: `${process.env.FRONTEND_URL}/payment/success`,
          failure: `${process.env.FRONTEND_URL}/payment/failure`,
          pending: `${process.env.FRONTEND_URL}/payment/pending`,
        },
        auto_return: 'approved',
      };

      if (marketplace_fee > 0) body.marketplace_fee = parseFloat(marketplace_fee);

      const result = await mpPreference.create({ body });
      return { id: result.id, init_point: result.init_point };
    } catch (error) {
      console.error('MP Create Preference Error:', error);
      return null;
    }
  },

  /**
   * Fetch payment details by ID
   */
  getPaymentDetails: async (paymentId, token) => {
    const activeToken = token || accessToken;
    if (!activeToken) return null;

    try {
      const mpClient = new MercadoPagoConfig({ accessToken: activeToken });
      const mpPayment = new Payment(mpClient);
      return await mpPayment.get({ id: paymentId });
    } catch (error) {
      console.error('MP Get Payment Error:', error.response?.data || error.message);
      return null;
    }
  },

  /**
   * Validate Webhook Signature (Mercado Pago v2)
   */
  validateSignature: (headers, body, secret = webhookSecret) => {
    if (!secret) {
      return process.env.NODE_ENV !== 'production';
    }

    const xSignature = headers['x-signature'];
    const xRequestId = headers['x-request-id'];
    if (!xSignature || !xRequestId) return false;

    try {
      // Logic for MP v2 Signature validation (ts, v1)
      const parts = xSignature.split(',');
      let ts, v1;
      parts.forEach(part => {
        const [key, val] = part.split('=');
        if (key === 'ts') ts = val;
        if (key === 'v1') v1 = val;
      });

      if (!ts || !v1) return false;

      const manifest = `id:${body.data?.id || ''};request-id:${xRequestId};ts:${ts};`;
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(manifest);
      const sha = hmac.digest('hex');

      return sha === v1;
    } catch (err) {
      console.error('MP Signature Validation Error:', err.message);
      return false;
    }
  }
};

export default mercadoPagoService;
