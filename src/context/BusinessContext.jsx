/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api.js';
import { t } from '../utils/terminology.js';

const BusinessContext = createContext();

function normalizeClientPayload(data = {}) {
  return {
    ...data,
    birthdate: data.birthdate ?? data.birthDate ?? null,
  };
}

function normalizeCategory(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function readStoredUser() {
  try {
    const saved = localStorage.getItem('app_user');
    return saved ? JSON.parse(saved) : null;
  } catch {
    localStorage.removeItem('app_user');
    localStorage.removeItem('app_token');
    return null;
  }
}

export function useBusinessContext() {
  return useContext(BusinessContext);
}

export function BusinessProvider({ children }) {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(readStoredUser);
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('app_token') && !!currentUser);
  const [userRole, setUserRole] = useState(() => currentUser?.role || 'reception');

  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 768);
  const [showNotifications, setShowNotifications] = useState(false);
  const [uiNotifications, setUiNotifications] = useState([]);
  const [toast, setToast] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const toastTimeoutRef = useRef(null);

  const [business, setBusiness] = useState(null);
  const businessNiche = business?.type || 'generic';
  const enabledModules = useMemo(
    () => business?.modules?.split(',') || ['agenda', 'financeiro', 'clientes', 'profissionais'],
    [business],
  );

  const [users, setUsers] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [clients, setClients] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [leads, setLeads] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [anamnesis, setAnamnesis] = useState([]);
  const [consents, setConsents] = useState([]);
  const [clientDocuments, setClientDocuments] = useState([]);

  const showToast = useCallback((message, type = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const translate = useCallback((key) => t(key, businessNiche), [businessNiche]);

  const login = async (name, password) => {
    try {
      const { data } = await api.post('/auth/login', { name, password });
      localStorage.setItem('app_token', data.token);
      localStorage.setItem('app_user', JSON.stringify(data.user));
      setCurrentUser(data.user);
      setUserRole(data.user.role);
      setIsAuthenticated(true);
      return true;
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao fazer login.', 'error');
      return false;
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem('app_token');
    localStorage.removeItem('app_user');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setUserRole('reception');
    setBusiness(null);
    setUsers([]);
    setProfessionals([]);
    setClients([]);
    setBookings([]);
    setServices([]);
    setPayments([]);
    setSchedules([]);
    setLeads([]);
    setInventory([]);
    setPortfolio([]);
    setAnamnesis([]);
    setConsents([]);
    setClientDocuments([]);
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
      navigate('/login', { replace: true });
      showToast('Sessão expirada. Faça login novamente.', 'error');
    };

    window.addEventListener('app:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('app:unauthorized', handleUnauthorized);
  }, [logout, navigate, showToast]);

  const fetchAll = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    try {
      const results = await Promise.allSettled([
        api.get('/professionals'),
        api.get('/clients'),
        api.get('/bookings'),
        api.get('/services'),
        api.get('/payments'),
        api.get('/schedules'),
        api.get('/leads'),
        api.get('/inventory'),
        api.get('/portfolio'),
        api.get('/business/current'),
        userRole === 'admin' ? api.get('/users') : Promise.resolve({ data: [] }),
      ]);

      const [
        professionalsResult,
        clientsResult,
        bookingsResult,
        servicesResult,
        paymentsResult,
        schedulesResult,
        leadsResult,
        inventoryResult,
        portfolioResult,
        businessResult,
        usersResult,
      ] = results;

      const settledData = (result, fallback, label) => {
        if (result.status === 'fulfilled') return result.value.data;
        console.error(`Erro ao carregar ${label}:`, result.reason);
        return fallback;
      };

      const loadedClients = settledData(clientsResult, [], 'clientes');
      const loadedBusiness = settledData(businessResult, null, 'negocio');

      setProfessionals(settledData(professionalsResult, [], 'profissionais'));
      setClients(loadedClients);
      setBookings(settledData(bookingsResult, [], 'agendamentos'));
      setServices(settledData(servicesResult, [], 'servicos'));
      setPayments(settledData(paymentsResult, [], 'financeiro'));
      setSchedules(settledData(schedulesResult, [], 'schedules'));
      setLeads(settledData(leadsResult, [], 'leads'));
      setInventory(settledData(inventoryResult, [], 'estoque'));
      setPortfolio(settledData(portfolioResult, [], 'portfolio'));
      setBusiness(loadedBusiness);
      setUsers(settledData(usersResult, [], 'usuarios'));
      setAnamnesis(loadedClients.flatMap((client) => client.anamnesis || []));
      setConsents(loadedClients.flatMap((client) => client.consents || []));
      setClientDocuments(loadedClients.flatMap((client) => client.documents || []));
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setProfessionals([]);
      setClients([]);
      setBookings([]);
      setServices([]);
      setPayments([]);
      setSchedules([]);
      setLeads([]);
      setInventory([]);
      setPortfolio([]);
      setUsers([]);
      setAnamnesis([]);
      setConsents([]);
      setClientDocuments([]);
      showToast('Erro ao carregar dados do servidor.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, showToast, userRole]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const addProfessional = async (data) => {
    const response = await api.post('/professionals', data);
    setProfessionals((prev) => [...prev, response.data]);
    showToast(`${translate('professional')} cadastrado com sucesso.`);
    return response.data;
  };

  const updateProfessional = async (id, data) => {
    const response = await api.put(`/professionals/${id}`, data);
    setProfessionals((prev) => prev.map((item) => (item.id === id ? response.data : item)));
    showToast(`${translate('professional')} atualizado com sucesso.`);
    return response.data;
  };

  const deleteProfessional = async (id) => {
    await api.delete(`/professionals/${id}`);
    setProfessionals((prev) => prev.filter((item) => item.id !== id));
    showToast(`${translate('professional')} removido com sucesso.`);
  };

  const addClient = async (data) => {
    const response = await api.post('/clients', normalizeClientPayload(data));
    const client = { ...response.data, bookings: [], anamnesis: [], consents: [], documents: [] };
    setClients((prev) => [...prev, client]);
    showToast('Cliente cadastrado com sucesso.');
    return client;
  };

  const updateClient = async (id, data) => {
    const response = await api.put(`/clients/${id}`, normalizeClientPayload(data));
    setClients((prev) => prev.map((item) => (item.id === id ? { ...item, ...response.data } : item)));
    showToast('Cliente atualizado com sucesso.');
    return response.data;
  };

  const deleteClient = async (id) => {
    await api.delete(`/clients/${id}`);
    setClients((prev) => prev.filter((item) => item.id !== id));
    setAnamnesis((prev) => prev.filter((item) => item.clientId !== id));
    setConsents((prev) => prev.filter((item) => item.clientId !== id));
    setClientDocuments((prev) => prev.filter((item) => item.clientId !== id));
    showToast('Cliente removido com sucesso.');
  };

  const addBooking = async (data) => {
    const response = await api.post('/bookings', data);
    setBookings((prev) => [...prev, response.data]);
    showToast(`${translate('booking')} criado com sucesso.`);
    fetchAll();
    return response.data;
  };

  const updateBooking = async (id, data) => {
    const response = await api.put(`/bookings/${id}`, data);
    setBookings((prev) => prev.map((item) => (item.id === id ? response.data : item)));
    showToast(`${translate('booking')} atualizado com sucesso.`);
    fetchAll();
    return response.data;
  };

  const addService = async (data) => {
    const response = await api.post('/services', data);
    setServices((prev) => [...prev, response.data]);
    showToast('Servico adicionado com sucesso.');
    return response.data;
  };

  const updateService = async (id, data) => {
    const response = await api.put(`/services/${id}`, data);
    setServices((prev) => prev.map((item) => (item.id === id ? response.data : item)));
    showToast('Servico atualizado com sucesso.');
    return response.data;
  };

  const deleteService = async (id) => {
    await api.delete(`/services/${id}`);
    setServices((prev) => prev.filter((item) => item.id !== id));
    showToast('Servico removido com sucesso.');
  };

  const updateBusiness = async (data) => {
    const response = await api.put('/business/current', data);
    setBusiness(response.data);
    showToast('Configuracoes salvas com sucesso.');
    return response.data;
  };

  const addPayment = async (data) => {
    const response = await api.post('/payments', data);
    setPayments((prev) => [response.data, ...prev]);
    showToast('Lancamento financeiro registrado.');
    return response.data;
  };

  const deletePayment = async (id) => {
    await api.delete(`/payments/${id}`);
    setPayments((prev) => prev.filter((item) => item.id !== id));
    showToast('Lancamento removido com sucesso.');
  };

  const generatePaymentLink = async (paymentId) => {
    const response = await api.post(`/payments/${paymentId}/generate-link`);
    showToast('Link de pagamento gerado com sucesso.');
    return response.data;
  };

  const addSchedule = async (data) => {
    const response = await api.post('/schedules', {
      ...data,
      title: data.title || data.project || `${translate('booking')} ${data.date || ''}`.trim(),
    });
    setSchedules((prev) => [...prev, response.data]);
    showToast('Compromisso adicionado na agenda.');
    return response.data;
  };

  const addAnamnesis = async (clientId, data) => {
    const response = await api.post(`/clients/${clientId}/anamnesis`, data);
    setAnamnesis((prev) => [...prev, response.data]);
    setClients((prev) =>
      prev.map((client) =>
        client.id === clientId
          ? { ...client, anamnesis: [...(client.anamnesis || []), response.data] }
          : client,
      ),
    );
    showToast('Anamnese salva com sucesso.');
    return response.data;
  };

  const addConsent = async (clientId, data) => {
    const response = await api.post(`/clients/${clientId}/consents`, data);
    setConsents((prev) => [...prev, response.data]);
    setClients((prev) =>
      prev.map((client) =>
        client.id === clientId
          ? { ...client, consents: [...(client.consents || []), response.data] }
          : client,
      ),
    );
    showToast('Termo salvo com sucesso.');
    return response.data;
  };

  const uploadDocument = async (clientId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/uploads/client-doc/${clientId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    setClientDocuments((prev) => [...prev, response.data]);
    showToast('Documento anexado com sucesso.');
    return response.data;
  };

  const addLead = async (data) => {
    const response = await api.post('/leads', data);
    setLeads((prev) => [response.data, ...prev]);
    showToast('Lead cadastrada com sucesso.');
    return response.data;
  };

  const updateLead = async (id, data) => {
    const response = await api.put(`/leads/${id}`, data);
    setLeads((prev) => prev.map((item) => (item.id === id ? response.data : item)));
    return response.data;
  };

  const addInventoryItem = async (data) => {
    const response = await api.post('/inventory', data);
    setInventory((prev) => [...prev, response.data].sort((a, b) => a.name.localeCompare(b.name)));
    showToast('Item de estoque cadastrado com sucesso.');
    return response.data;
  };

  const updateInventoryItem = async (id, data) => {
    const response = await api.put(`/inventory/${id}`, data);
    setInventory((prev) => prev.map((item) => (item.id === id ? response.data : item)));
    showToast('Item de estoque atualizado com sucesso.');
    return response.data;
  };

  const deleteInventoryItem = async (id) => {
    await api.delete(`/inventory/${id}`);
    setInventory((prev) => prev.filter((item) => item.id !== id));
    showToast('Item de estoque removido com sucesso.');
  };

  const addUser = async (data) => {
    const response = await api.post('/users', data);
    setUsers((prev) => [...prev, response.data]);
    showToast('Usuario cadastrado com sucesso.');
    return response.data;
  };

  const uploadPortfolioFile = async (formData) => {
    const response = await api.post('/portfolio/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    setPortfolio((prev) => [response.data, ...prev]);
    showToast('Item adicionado ao portfolio.');
    return response.data;
  };

  const deletePortfolioItem = async (id) => {
    await api.delete(`/portfolio/${id}`);
    setPortfolio((prev) => prev.filter((item) => item.id !== id));
    showToast('Item removido do portfolio.');
  };

  const getFinanceMetrics = useCallback(() => {
    const totalRevenue = payments
      .filter((item) => item.type === 'income' && item.status === 'paid')
      .reduce((sum, item) => sum + Number(item.value || 0), 0);

    const totalExpenses = payments
      .filter((item) => item.type === 'expense' && item.status === 'paid')
      .reduce((sum, item) => sum + Number(item.value || 0), 0);

    let totalCommissions = 0;
    payments.forEach((payment) => {
      if (payment.type !== 'income' || payment.status !== 'paid' || !payment.professionalId) return;
      if (payment.professionalValue !== null && payment.professionalValue !== undefined) {
        totalCommissions += Number(payment.professionalValue || 0);
        return;
      }
      const professional = professionals.find((item) => item.id === payment.professionalId);
      if (professional && normalizeCategory(payment.category) !== 'sinal') {
        totalCommissions += (Number(payment.value || 0) * (Number(professional.commission) || 60)) / 100;
      }
    });

    const pendingPayments = bookings
      .filter((booking) => booking.status === 'pending' || booking.status === 'deposit_paid')
      .reduce((sum, booking) => {
        const totalPaid = payments
          .filter((payment) => payment.bookingId === booking.id && payment.type === 'income')
          .reduce((subtotal, payment) => subtotal + Number(payment.value || 0), 0);
        return sum + Math.max(0, Number(booking.totalValue || 0) - totalPaid);
      }, 0);

    const potentialRevenue = bookings
      .filter((booking) => booking.status === 'quote')
      .reduce((sum, booking) => sum + Number(booking.totalValue || 0), 0);

    return {
      totalRevenue,
      totalExpenses,
      totalCommissions,
      netProfit: totalRevenue - totalExpenses - totalCommissions,
      studioProfit: totalRevenue - totalExpenses - totalCommissions,
      pendingPayments,
      potentialRevenue,
    };
  }, [bookings, payments, professionals]);

  const getProfessionalPeriodMetrics = useCallback((professionalId, start, end) => {
    if (!professionalId) {
      return { confirmed: 0, pending: 0, total: 0, sessions: 0, avgValue: 0, commRate: 0 };
    }

    const professional = professionals.find((item) => item.id === professionalId);
    if (!professional) {
      return { confirmed: 0, pending: 0, total: 0, sessions: 0, avgValue: 0, commRate: 0 };
    }

    const commRate = Number(professional.commission) || 60;
    const periodPayments = payments.filter((payment) => {
      if (payment.professionalId !== professionalId || payment.type !== 'income') return false;
      if (start && payment.date < start) return false;
      if (end && payment.date > end) return false;
      return true;
    });

    const periodBookings = bookings.filter((booking) => {
      if (booking.professionalId !== professionalId) return false;
      if (start && booking.date < start) return false;
      if (end && booking.date > end) return false;
      return true;
    });

    const confirmed = periodPayments.reduce((sum, payment) => {
      if (payment.professionalValue !== null && payment.professionalValue !== undefined) {
        return sum + Number(payment.professionalValue || 0);
      }
      return sum + (Number(payment.value || 0) * commRate) / 100;
    }, 0);

    const pending = periodBookings
      .filter((booking) => booking.status === 'pending' || booking.status === 'deposit_paid')
      .reduce((sum, booking) => {
        const totalPaid = payments
          .filter((payment) => payment.bookingId === booking.id && payment.type === 'income')
          .reduce((subtotal, payment) => subtotal + Number(payment.value || 0), 0);
        return sum + Math.max(0, (Number(booking.totalValue || 0) - totalPaid) * (commRate / 100));
      }, 0);

    const totalGross = periodBookings
      .filter((booking) => booking.status !== 'quote')
      .reduce((sum, booking) => sum + Number(booking.totalValue || 0), 0);

    const sessions = periodBookings.filter((booking) => booking.status !== 'quote').length;

    return {
      confirmed,
      pending,
      total: confirmed + pending,
      sessions,
      avgValue: sessions > 0 ? totalGross / sessions : 0,
      commRate,
    };
  }, [bookings, payments, professionals]);

  const sendWhatsAppMessage = async (phone, message) => {
    try {
      await api.post('/whatsapp/send', {
        phone: phone.replace(/\D/g, ''),
        message,
      });
      showToast('Mensagem enviada com sucesso.');
    } catch {
      showToast('Nao foi possivel enviar a mensagem.', 'error');
    }
  };

  const triggerProfessionalNotification = (id) => {
    const professional = professionals.find((item) => item.id === id);
    if (!professional) return;
    showToast(`Notificacao preparada para ${professional.name}.`);
  };

  const handleCompleteAppointment = async (id) => {
    try {
      await updateBooking(id, { status: 'completed' });
      showToast('Agendamento concluido com sucesso.');
    } catch {
      showToast('Nao foi possivel concluir o agendamento.', 'error');
    }
  };

  const db = {
    businesses: { get: () => [business], current: () => business },
    studios: { get: () => [business], current: () => business },
    artists: { all: () => professionals, get: (id) => professionals.find((item) => item.id === id) },
    professionals: { all: () => professionals, get: (id) => professionals.find((item) => item.id === id) },
    clients: { all: () => clients, get: (id) => clients.find((item) => item.id === id) },
    sessions: { all: () => bookings, get: (id) => bookings.find((item) => item.id === id) },
    bookings: { all: () => bookings, get: (id) => bookings.find((item) => item.id === id) },
    payments: { all: () => payments },
  };

  const value = {
    isAuthenticated,
    login,
    logout,
    currentUser,
    setCurrentUser,
    userRole,
    setUserRole,
    activeView,
    setActiveView,
    sidebarOpen,
    setSidebarOpen,
    showToast,
    toast,
    setToast,
    isLoading,
    uiNotifications,
    setUiNotifications,
    showNotifications,
    setShowNotifications,
    business,
    businessNiche,
    enabledModules,
    updateBusiness,
    t: translate,
    users,
    setUsers,
    professionals,
    setProfessionals,
    clients,
    setClients,
    bookings,
    setBookings,
    services,
    setServices,
    payments,
    setPayments,
    schedules,
    setSchedules,
    leads,
    setLeads,
    inventory,
    setInventory,
    portfolio,
    setPortfolio,
    anamnesis,
    setAnamnesis,
    consents,
    setConsents,
    clientDocuments,
    setClientDocuments,
    addProfessional,
    updateProfessional,
    deleteProfessional,
    addClient,
    updateClient,
    deleteClient,
    addBooking,
    updateBooking,
    addService,
    updateService,
    deleteService,
    addPayment,
    deletePayment,
    generatePaymentLink,
    addSchedule,
    addAnamnesis,
    addConsent,
    uploadDocument,
    addLead,
    updateLead,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    addUser,
    uploadPortfolioFile,
    deletePortfolioItem,
    businesses: business ? [business] : [],
    artists: professionals,
    // Legacy aliases kept for backward compatibility with older views/components.
    tattooSessions: bookings,
    studios: business ? [business] : [],
    currentStudioId: currentUser?.businessId,
    addArtist: addProfessional,
    updateArtist: updateProfessional,
    deleteArtist: deleteProfessional,
    addSession: addBooking,
    updateSession: updateBooking,
    updateStudio: updateBusiness,
    db,
    metrics: getFinanceMetrics(),
    getArtistPeriodMetrics: getProfessionalPeriodMetrics,
    getProfessionalPeriodMetrics,
    sendWhatsAppMessage,
    triggerArtistNotification: triggerProfessionalNotification,
    triggerProfessionalNotification,
    handleCompleteAppointment,
    fetchAll,
  };

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}
