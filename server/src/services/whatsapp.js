import axios from 'axios';

const INSTANCE_URL = process.env.WHATSAPP_INSTANCE_URL;
const INSTANCE_ID = process.env.WHATSAPP_INSTANCE_ID;
const API_KEY = process.env.WHATSAPP_API_KEY;

/**
 * Service to interact with Evolution API (WhatsApp)
 */
export const whatsappService = {
  /**
   * Send a text message with specific credentials
   */
  sendMessage: async (number, text, config = {}) => {
    const { 
      url = INSTANCE_URL, 
      id = INSTANCE_ID, 
      key = API_KEY 
    } = config;

    if (!url || !id || !key) {
      console.warn('WhatsApp credentials not provided.');
      return null;
    }

    try {
      const response = await axios.post(
        `${url}/message/sendText/${id}`,
        {
          number: number.replace(/\D/g, ''),
          options: {
            delay: 1200,
            presence: 'composing',
            linkPreview: false
          },
          textMessage: { text }
        },
        {
          headers: { 'apikey': key }
        }
      );
      return response.data;
    } catch (error) {
      console.error('WhatsApp Send Error:', error.response?.data || error.message);
      return null;
    }
  },

  /**
   * Send a payment link reminder
   */
  sendPaymentLink: async (number, clientName, amount, link, config = {}) => {
    const text = `Olá ${clientName}! 🖤\n\nIdentificamos um pagamento pendente no valor de R$ ${amount.toFixed(2)}.\n\nVocê pode realizar o pagamento através deste link:\n${link}\n\nQualquer dúvida, estamos à disposição!`;
    return whatsappService.sendMessage(number, text, config);
  },

  /**
   * Send appointment confirmation
   */
  sendAppointmentConfirmation: async (number, clientName, date, time, config = {}) => {
    const text = `Olá ${clientName}! seu agendamento na Ink Masters foi confirmado para o dia ${date} às ${time}. 🖤\n\nNos vemos em breve!`;
    return whatsappService.sendMessage(number, text, config);
  }
};

export default whatsappService;
