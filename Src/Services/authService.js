import { api } from './apiClient';

export const ApiService = {
  // 🔐 AUTH ----------------------------

  login: async data => {
    const response = await api.post('/login', data);
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/logout');
    return response.data;
  },

  // 🍽️ TABLES --------------------------

  getTables: async () => {
    const response = await api.get('/tables');
    return response.data;
  },

  // 🛒 PRODUCTS -------------------------

  getProducts: async () => {
    const response = await api.get('/products');
    return response.data;
  },

  // 🧾 ORDERS ---------------------------

  // Create order
  createOrder: async data => {
    const response = await api.post('/order', data);
    return response.data;
  },

  // Get order by table
  getOrderByTable: async tableId => {
    const response = await api.get(`/order/table/${tableId}`);
    return response.data;
  },

  // Add items to order
  addItemsToOrder: async (orderId, data) => {
    const response = await api.post(`/order/${orderId}/add-items`, data);
    return response.data;
  },

  // Generate bill
  generateBill: async orderId => {
    const response = await api.post(`/order/${orderId}/bill`);
    return response.data;
  },

  // Cancel order
  cancelOrder: async (orderId, data) => {
    const response = await api.post(`/order/${orderId}/cancel`, data);
    return response.data;
  },

  // 📊 REPORTS --------------------------

  // Daily report (today)
  getDailyReport: async () => {
    const response = await api.get('/report/daily');
    return response.data;
  },

  // Daily report by date
  getDailyReportByDate: async date => {
    const response = await api.get('/report/daily', {
      params: { date },
    });
    return response.data;
  },

  // Report by table
  getTableReport: async tableId => {
    const response = await api.get(`/report/daily/table/${tableId}`);
    return response.data;
  },

  // Report by table + date
  getTableReportByDate: async (tableId, date) => {
    const response = await api.get(`/report/daily/table/${tableId}`, {
      params: { date },
    });
    return response.data;
  },

  // Report by table + date
  orderEdit_show: async orderId => {
    const response = await api.get(`/waiter-orders/${orderId}`);
    return response.data;
  },
  // Report by table + date
  orderUpdate: async (orderId, data) => {
    const response = await api.put(`/waiter-orders/${orderId}/update`, data);
    return response.data;
  },
};
