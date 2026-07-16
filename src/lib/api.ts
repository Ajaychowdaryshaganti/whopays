const API_BASE = 'http://localhost:5001/api';

export const api = {
  // Users
  getUsers: async () => {
    const response = await fetch(`${API_BASE}/users`);
    return response.json();
  },
  
  createUser: async (user: Partial<{ name: string; coffeePreference: string; coffeePrice: number; addons: string[] }>) => {
    const response = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    return response.json();
  },
  
  updateUser: async (id: string, user: Partial<{ name: string; coffeePreference: string; coffeePrice: number; addons: string[] }>) => {
    const response = await fetch(`${API_BASE}/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    return response.json();
  },
  
  deleteUser: async (id: string) => {
    const response = await fetch(`${API_BASE}/users/${id}`, {
      method: 'DELETE',
    });
    return response.json();
  },
  
  getSuggestedBuyer: async () => {
    const response = await fetch(`${API_BASE}/users/suggest/next-buyer`);
    return response.json();
  },
  
  // Transactions
  getTransactions: async () => {
    const response = await fetch(`${API_BASE}/transactions`);
    return response.json();
  },
  
  createTransaction: async (transaction: { buyer: string; participants: string[]; description?: string; priceOverrides?: Record<string, number> }) => {
    const response = await fetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transaction),
    });
    return response.json();
  },
  
  getMonthlySummary: async (month: number, year: number) => {
    const response = await fetch(`${API_BASE}/transactions/summary/monthly?month=${month}&year=${year}`);
    return response.json();
  },

  // Admin
  adminVerify: async (pin: string) => {
    const response = await fetch(`${API_BASE}/admin/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    return response.json();
  },

  adminDeleteTransaction: async (id: string, pin: string) => {
    const response = await fetch(`${API_BASE}/admin/transactions/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-pin': pin },
    });
    return response.json();
  },

  adminClearAllTransactions: async (pin: string) => {
    const response = await fetch(`${API_BASE}/admin/transactions`, {
      method: 'DELETE',
      headers: { 'x-admin-pin': pin },
    });
    return response.json();
  },

  adminResetBalances: async (pin: string) => {
    const response = await fetch(`${API_BASE}/admin/reset-balances`, {
      method: 'POST',
      headers: { 'x-admin-pin': pin },
    });
    return response.json();
  },

  adminResetAll: async (pin: string) => {
    const response = await fetch(`${API_BASE}/admin/reset-all`, {
      method: 'POST',
      headers: { 'x-admin-pin': pin },
    });
    return response.json();
  },

  adminDeleteUser: async (id: string, pin: string) => {
    const response = await fetch(`${API_BASE}/admin/users/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-pin': pin },
    });
    return response.json();
  },
};
