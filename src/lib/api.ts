const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

export const api = {
  // Users
  getUsers: async () => {
    try {
      const response = await fetch(`${API_BASE}/users`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    } catch (error) {
      console.error('getUsers error:', error);
      throw new Error('Load failed');
    }
  },
  
  createUser: async (user: Partial<{ name: string; coffeePreference: string; coffeePrice: number; addons: string[] }>) => {
    try {
      const response = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    } catch (error) {
      console.error('createUser error:', error);
      throw new Error('Load failed');
    }
  },
  
  updateUser: async (id: string, user: Partial<{ name: string; coffeePreference: string; coffeePrice: number; addons: string[] }>) => {
    try {
      const response = await fetch(`${API_BASE}/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    } catch (error) {
      console.error('updateUser error:', error);
      throw new Error('Load failed');
    }
  },
  
  deleteUser: async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/users/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    } catch (error) {
      console.error('deleteUser error:', error);
      throw new Error('Load failed');
    }
  },
  
  getSuggestedBuyer: async () => {
    try {
      const response = await fetch(`${API_BASE}/users/suggest/next-buyer`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    } catch (error) {
      console.error('getSuggestedBuyer error:', error);
      throw new Error('Load failed');
    }
  },
  
  // Transactions
  getTransactions: async () => {
    try {
      const response = await fetch(`${API_BASE}/transactions`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    } catch (error) {
      console.error('getTransactions error:', error);
      throw new Error('Load failed');
    }
  },
  
  createTransaction: async (transaction: { buyer: string; participants: string[]; description?: string; priceOverrides?: Record<string, number> }) => {
    try {
      const response = await fetch(`${API_BASE}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    } catch (error) {
      console.error('createTransaction error:', error);
      throw new Error('Load failed');
    }
  },
  
  getMonthlySummary: async (month: number, year: number) => {
    try {
      const response = await fetch(`${API_BASE}/transactions/summary/monthly?month=${month}&year=${year}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    } catch (error) {
      console.error('getMonthlySummary error:', error);
      throw new Error('Load failed');
    }
  },

  // Admin
  adminVerify: async (pin: string) => {
    try {
      const response = await fetch(`${API_BASE}/admin/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    } catch (error) {
      console.error('adminVerify error:', error);
      throw new Error('Load failed');
    }
  },

  adminDeleteTransaction: async (id: string, pin: string) => {
    try {
      const response = await fetch(`${API_BASE}/admin/transactions/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-pin': pin },
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    } catch (error) {
      console.error('adminDeleteTransaction error:', error);
      throw new Error('Load failed');
    }
  },

  adminClearAllTransactions: async (pin: string) => {
    try {
      const response = await fetch(`${API_BASE}/admin/transactions`, {
        method: 'DELETE',
        headers: { 'x-admin-pin': pin },
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    } catch (error) {
      console.error('adminClearAllTransactions error:', error);
      throw new Error('Load failed');
    }
  },

  adminResetBalances: async (pin: string) => {
    try {
      const response = await fetch(`${API_BASE}/admin/reset-balances`, {
        method: 'POST',
        headers: { 'x-admin-pin': pin },
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    } catch (error) {
      console.error('adminResetBalances error:', error);
      throw new Error('Load failed');
    }
  },

  adminResetAll: async (pin: string) => {
    try {
      const response = await fetch(`${API_BASE}/admin/reset-all`, {
        method: 'POST',
        headers: { 'x-admin-pin': pin },
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    } catch (error) {
      console.error('adminResetAll error:', error);
      throw new Error('Load failed');
    }
  },

  adminDeleteUser: async (id: string, pin: string) => {
    try {
      const response = await fetch(`${API_BASE}/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-pin': pin },
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    } catch (error) {
      console.error('adminDeleteUser error:', error);
      throw new Error('Load failed');
    }
  },
};
