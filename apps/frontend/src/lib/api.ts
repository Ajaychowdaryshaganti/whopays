const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export const api = {
  // Users
  getUsers: async () => {
    try {
      const response = await fetch(`${API_BASE}/users`);
      if (!response.ok) {
        const text = await response.text();
        console.error('Response status:', response.status, 'Body:', text);
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      return response.json();
    } catch (error) {
      console.error('getUsers error:', error);
      throw error;
    }
  },
  
  createUser: async (user: Partial<{ name: string; coffeePreference: string; coffeePrice: number; addons: string[] }>) => {
    try {
      const response = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      });
      if (!response.ok) {
        const text = await response.text();
        console.error('Response status:', response.status, 'Body:', text);
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      return response.json();
    } catch (error) {
      console.error('createUser error:', error);
      throw error;
    }
  },
  
  updateUser: async (id: string, user: Partial<{ name: string; coffeePreference: string; coffeePrice: number; addons: string[] }>) => {
    try {
      const response = await fetch(`${API_BASE}/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      });
      if (!response.ok) {
        const text = await response.text();
        console.error('Response status:', response.status, 'Body:', text);
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      return response.json();
    } catch (error) {
      console.error('updateUser error:', error);
      throw error;
    }
  },
  
  deleteUser: async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/users/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const text = await response.text();
        console.error('Response status:', response.status, 'Body:', text);
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      return response.json();
    } catch (error) {
      console.error('deleteUser error:', error);
      throw error;
    }
  },
  
  getSuggestedBuyer: async () => {
    try {
      const response = await fetch(`${API_BASE}/users/suggest/next-buyer`);
      if (!response.ok) {
        const text = await response.text();
        console.error('Response status:', response.status, 'Body:', text);
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      return response.json();
    } catch (error) {
      console.error('getSuggestedBuyer error:', error);
      throw error;
    }
  },
  
  // Transactions
  getTransactions: async () => {
    try {
      const response = await fetch(`${API_BASE}/transactions`);
      if (!response.ok) {
        const text = await response.text();
        console.error('Response status:', response.status, 'Body:', text);
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      return response.json();
    } catch (error) {
      console.error('getTransactions error:', error);
      throw error;
    }
  },
  
  createTransaction: async (transaction: { buyer: string; participants: string[]; description?: string; priceOverrides?: Record<string, number>; freeCoffees?: string[] }) => {
    try {
      const response = await fetch(`${API_BASE}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction),
      });
      if (!response.ok) {
        const text = await response.text();
        console.error('Response status:', response.status, 'Body:', text);
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      return response.json();
    } catch (error) {
      console.error('createTransaction error:', error);
      throw error;
    }
  },
  
  getMonthlySummary: async (month: number, year: number) => {
    try {
      const response = await fetch(`${API_BASE}/transactions/summary/monthly?month=${month}&year=${year}`);
      if (!response.ok) {
        const text = await response.text();
        console.error('Response status:', response.status, 'Body:', text);
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      return response.json();
    } catch (error) {
      console.error('getMonthlySummary error:', error);
      throw error;
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
      if (!response.ok) {
        const text = await response.text();
        console.error('Response status:', response.status, 'Body:', text);
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      return response.json();
    } catch (error) {
      console.error('adminVerify error:', error);
      throw error;
    }
  },

  adminDeleteTransaction: async (id: string, pin: string) => {
    try {
      const response = await fetch(`${API_BASE}/admin/transactions/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-pin': pin },
      });
      if (!response.ok) {
        const text = await response.text();
        console.error('Response status:', response.status, 'Body:', text);
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      return response.json();
    } catch (error) {
      console.error('adminDeleteTransaction error:', error);
      throw error;
    }
  },

  adminClearAllTransactions: async (pin: string) => {
    try {
      const response = await fetch(`${API_BASE}/admin/transactions`, {
        method: 'DELETE',
        headers: { 'x-admin-pin': pin },
      });
      if (!response.ok) {
        const text = await response.text();
        console.error('Response status:', response.status, 'Body:', text);
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      return response.json();
    } catch (error) {
      console.error('adminClearAllTransactions error:', error);
      throw error;
    }
  },

  adminResetBalances: async (pin: string) => {
    try {
      const response = await fetch(`${API_BASE}/admin/reset-balances`, {
        method: 'POST',
        headers: { 'x-admin-pin': pin },
      });
      if (!response.ok) {
        const text = await response.text();
        console.error('Response status:', response.status, 'Body:', text);
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      return response.json();
    } catch (error) {
      console.error('adminResetBalances error:', error);
      throw error;
    }
  },

  adminResetAll: async (pin: string) => {
    try {
      const response = await fetch(`${API_BASE}/admin/reset-all`, {
        method: 'POST',
        headers: { 'x-admin-pin': pin },
      });
      if (!response.ok) {
        const text = await response.text();
        console.error('Response status:', response.status, 'Body:', text);
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      return response.json();
    } catch (error) {
      console.error('adminResetAll error:', error);
      throw error;
    }
  },

  adminDeleteUser: async (id: string, pin: string) => {
    try {
      const response = await fetch(`${API_BASE}/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-pin': pin },
      });
      if (!response.ok) {
        const text = await response.text();
        console.error('Response status:', response.status, 'Body:', text);
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      return response.json();
    } catch (error) {
      console.error('adminDeleteUser error:', error);
      throw error;
    }
  },

  adminEditUser: async (id: string, pin: string, data: Record<string, any>) => {
    try {
      const response = await fetch(`${API_BASE}/admin/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const text = await response.text();
        console.error('Response status:', response.status, 'Body:', text);
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      return response.json();
    } catch (error) {
      console.error('adminEditUser error:', error);
      throw error;
    }
  },

  adminEditTransaction: async (id: string, pin: string, data: Record<string, any>) => {
    try {
      const response = await fetch(`${API_BASE}/admin/transactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const text = await response.text();
        console.error('Response status:', response.status, 'Body:', text);
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      return response.json();
    } catch (error) {
      console.error('adminEditTransaction error:', error);
      throw error;
    }
  },

  adminGetLogs: async (pin: string) => {
    try {
      const response = await fetch(`${API_BASE}/admin/logs`, {
        headers: { 'x-admin-pin': pin },
      });
      if (!response.ok) {
        const text = await response.text();
        console.error('Response status:', response.status, 'Body:', text);
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      return response.json();
    } catch (error) {
      console.error('adminGetLogs error:', error);
      throw error;
    }
  },

  // Menu
  getMenu: async () => {
    try {
      const response = await fetch(`${API_BASE}/menu`);
      if (!response.ok) {
        const text = await response.text();
        console.error('Response status:', response.status, 'Body:', text);
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      return response.json();
    } catch (error) {
      console.error('getMenu error:', error);
      throw error;
    }
  },

  adminUpdateMenu: async (menu: { basePrices: { name: string; price: number }[]; addons: { name: string; price: number }[] }, pin: string) => {
    try {
      const response = await fetch(`${API_BASE}/menu`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
        body: JSON.stringify(menu),
      });
      if (!response.ok) {
        const text = await response.text();
        console.error('Response status:', response.status, 'Body:', text);
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      return response.json();
    } catch (error) {
      console.error('adminUpdateMenu error:', error);
      throw error;
    }
  },
};
