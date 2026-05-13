import { api } from './apiClient';

export const ApiService = {
  // 🔐 AUTH ----------------------------

  login: async (data, config = {}) => {
    const response = await api.post('/login', data, config);
    return response.data;
  },

  logout: async (config = {}) => {
    const response = await api.post('/logout', undefined, config);
    return response.data;
  },

  // 🍽️ TABLES --------------------------

  getTables: async (config = {}) => {
    const response = await api.get('/tables', config);
    return response.data;
  },

  // 🛒 PRODUCTS -------------------------

  getProducts: async (config = {}) => {
    const response = await api.get('/products', config);
    return response.data;
  },

  // 🧾 ORDERS ---------------------------

  // Create order
  createOrder: async (data, config = {}) => {
    const response = await api.post('/order', data, config);
    return response.data;
  },

  // Get order by table
  getOrderByTable: async (tableId, config = {}) => {
    const response = await api.get(`/order/table/${tableId}`, config);
    return response.data;
  },

  // Add items to order
  addItemsToOrder: async (orderId, data, config = {}) => {
    const response = await api.post(`/order/${orderId}/add-items`, data, config);
    return response.data;
  },

  // Generate bill
  generateBill: async (orderId, config = {}) => {
    const response = await api.post(`/order/${orderId}/bill`, undefined, config);
    return response.data;
  },

  // Cancel order
  cancelOrder: async (orderId, data, config = {}) => {
    const response = await api.post(`/order/${orderId}/cancel`, data, config);
    return response.data;
  },

  // 📊 REPORTS --------------------------

  // Daily report (today)
  getDailyReport: async (config = {}) => {
    const response = await api.get('/report/daily', config);
    return response.data;
  },

  // Daily report by date
  getDailyReportByDate: async (date, config = {}) => {
    const response = await api.get('/report/daily', {
      ...config,
      params: { date },
    });
    return response.data;
  },

  // Report by table
  getTableReport: async (tableId, config = {}) => {
    const response = await api.get(`/report/daily/table/${tableId}`, config);
    return response.data;
  },

  // Report by table + date
  getTableReportByDate: async (tableId, date, config = {}) => {
    const response = await api.get(`/report/daily/table/${tableId}`, {
      ...config,
      params: { date },
    });
    return response.data;
  },

  // Report by table + date
  orderEdit_show: async (orderId, config = {}) => {
    const response = await api.get(`/waiter-orders/${orderId}`, config);
    return response.data;
  },
  // Report by table + date
  orderUpdate: async (orderId, data, config = {}) => {
    const response = await api.put(`/waiter-orders/${orderId}/update`, data, config);
    return response.data;
  },
  getCategories:async (config = {}) => {
    const response = await api.get(`/categories`, config);
    return response.data;
  },
  changepassword:async(data, config = {})=>{
    const response =await api.post("/change-password",data, config)
    return response.data
  },
  moveTable:async(orderId, data, config = {})=>{
    const response =await api.post(`/waiter-orders/${orderId}/move-table`,data, config)
    return response.data
  }
};
