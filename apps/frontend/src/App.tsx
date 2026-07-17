import { useState, useEffect } from 'react';
import { api } from './lib/api';
import type { User, Transaction } from './types';
import './App.css';

const BASE_PRICES: Record<string, number> = {
  Cappuccino: 5.00, Latte: 5.00, 'Flat White': 5.00, 'Long Black': 4.50,
  Espresso: 4.00, Americano: 4.50, Mocha: 5.50, 'Hot Chocolate': 5.00,
  'Chai Latte': 5.50, 'Matcha Latte': 6.00,
  'Iced Latte': 5.50, 'Iced Cappuccino': 5.50, 'Iced Long Black': 5.00,
  'Cold Brew': 5.00, 'Iced Mocha': 6.00, 'Frappé': 6.50,
  'Fresh Juice': 8.00, Smoothie: 9.00, Milkshake: 7.00,
  'Soft Drink': 4.00, Tea: 4.00, 'Iced Tea': 4.50,
  Pastry: 5.00, Croissant: 4.50, Muffin: 4.50,
  Toast: 5.00, Bagel: 6.00, 'Breakfast Roll': 12.00,
};

const ADDONS: { name: string; price: number }[] = [
  { name: 'Oat Milk', price: 0.50 },
  { name: 'Almond Milk', price: 0.50 },
  { name: 'Soy Milk', price: 0.50 },
  { name: 'Lactose Free Milk', price: 0.50 },
  { name: 'Skim Milk', price: 0 },
  { name: 'Extra Shot', price: 1.00 },
  { name: 'Decaf', price: 0.50 },
  { name: 'Caramel Syrup', price: 0.50 },
  { name: 'Vanilla Syrup', price: 0.50 },
  { name: 'Hazelnut Syrup', price: 0.50 },
  { name: 'Extra Hot', price: 0 },
  { name: 'Half Strength', price: 0 },
];

function App() {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem('whopays_unlocked') === 'true');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'transactions' | 'history'>('dashboard');
  const [selectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear] = useState(new Date().getFullYear());
  const [historyPeriod, setHistoryPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [presentToday, setPresentToday] = useState<string[]>([]);
  const [buyerOverride, setBuyerOverride] = useState<string | null>(null);

  // Admin
  const [adminMode, setAdminMode] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [adminPinError, setAdminPinError] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(() => sessionStorage.getItem('whopays_admin_unlocked') === 'true');
  const [adminTab, setAdminTab] = useState<'actions' | 'users' | 'transactions' | 'logs'>('actions');
  const [adminLogs, setAdminLogs] = useState<any[]>([]);
  const [adminEditUser, setAdminEditUser] = useState<User | null>(null);
  const [adminEditTx, setAdminEditTx] = useState<Transaction | null>(null);
  
  // New user form
  const [newUserName, setNewUserName] = useState('');
  const [newUserPreference, setNewUserPreference] = useState('Cappuccino');
  const [newUserPrice, setNewUserPrice] = useState(5.00);
  const [newUserPriceOverride, setNewUserPriceOverride] = useState(false);
  const [newUserAddons, setNewUserAddons] = useState<string[]>([]);
  
  // Edit user
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editPreference, setEditPreference] = useState('Cappuccino');
  const [editPrice, setEditPrice] = useState(5.00);
  const [editPriceOverride, setEditPriceOverride] = useState(false);
  const [editAddons, setEditAddons] = useState<string[]>([]);
  
  // New transaction form
  const [selectedBuyer, setSelectedBuyer] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [transactionDescription, setTransactionDescription] = useState('');
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>({});
  const [freeCoffees, setFreeCoffees] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersData, transactionsData] = await Promise.all([
        api.getUsers(),
        api.getTransactions()
      ]);
      setUsers(usersData);
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const togglePresent = (userId: string) => {
    setPresentToday(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
    setBuyerOverride(null);
  };

  const computeSuggestedBuyer = (): User | null => {
    if (presentToday.length === 0) return null;
    const presentUsers = users.filter(u => presentToday.includes(u._id));
    if (presentUsers.length === 0) return null;
    const sorted = [...presentUsers].sort((a, b) => {
      const scoreA = a.balance - (a.timesBought * 10);
      const scoreB = b.balance - (b.timesBought * 10);
      return scoreA - scoreB;
    });
    return sorted[0];
  };

  const getEffectiveBuyer = (): User | null => {
    if (buyerOverride) {
      return users.find(u => u._id === buyerOverride) || null;
    }
    return computeSuggestedBuyer();
  };

  const proceedToRecord = () => {
    const buyer = getEffectiveBuyer();
    if (!buyer) return;
    setSelectedBuyer(buyer._id);
    setSelectedParticipants(presentToday);
    setPriceOverrides({});
    setFreeCoffees([]);
    setTransactionDescription('');
    setActiveTab('transactions');
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;
    
    try {
      const finalPrice = newUserPriceOverride ? newUserPrice : calculateTotalPrice();
      await api.createUser({
        name: newUserName,
        coffeePreference: newUserPreference,
        coffeePrice: finalPrice,
        addons: newUserAddons
      });
      setNewUserName('');
      setNewUserPreference('Cappuccino');
      setNewUserPrice(5.00);
      setNewUserPriceOverride(false);
      setNewUserAddons([]);
      loadData();
    } catch (error) {
      console.error('Failed to add user:', error);
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      await api.deleteUser(id);
      loadData();
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBuyer || selectedParticipants.length === 0) return;
    
    try {
      await api.createTransaction({
        buyer: selectedBuyer,
        participants: selectedParticipants,
        description: transactionDescription || undefined,
        priceOverrides: Object.keys(priceOverrides).length > 0 ? priceOverrides : undefined,
        freeCoffees: freeCoffees.length > 0 ? freeCoffees : undefined
      });
      setSelectedBuyer('');
      setSelectedParticipants([]);
      setTransactionDescription('');
      setPriceOverrides({});
      setFreeCoffees([]);
      loadData();
    } catch (error) {
      console.error('Failed to create transaction:', error);
    }
  };

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
    setPriceOverrides(prev => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
    setFreeCoffees(prev => prev.filter(id => id !== userId));
  };

  const toggleFreeCoffee = (userId: string) => {
    setFreeCoffees(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
    setPriceOverrides(prev => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  };

  const setParticipantPrice = (userId: string, price: number) => {
    setPriceOverrides(prev => ({ ...prev, [userId]: price }));
    setFreeCoffees(prev => prev.filter(id => id !== userId));
  };

  const getEffectivePrice = (userId: string): number => {
    if (freeCoffees.includes(userId)) return 0;
    const user = users.find(u => u._id === userId);
    if (!user) return 0;
    return priceOverrides[userId] ?? user.coffeePrice;
  };

  const getAvailableFreeCoffees = (user: User): number => {
    const earned = Math.floor(user.coffeesDrank / 8);
    return earned - (user.freeCoffeesUsed || 0);
  };

  const toggleAddon = (addonName: string) => {
    setNewUserAddons(prev =>
      prev.includes(addonName)
        ? prev.filter(a => a !== addonName)
        : [...prev, addonName]
    );
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditPreference(user.coffeePreference);
    setEditPrice(user.coffeePrice);
    setEditPriceOverride(true);
    setEditAddons(user.addons || []);
  };

  const closeEditModal = () => {
    setEditingUser(null);
  };

  const toggleEditAddon = (addonName: string) => {
    setEditAddons(prev =>
      prev.includes(addonName)
        ? prev.filter(a => a !== addonName)
        : [...prev, addonName]
    );
  };

  const calculateEditPrice = () => {
    const base = BASE_PRICES[editPreference] ?? 5.00;
    const addonsTotal = editAddons.reduce((sum, name) => {
      const addon = ADDONS.find(a => a.name === name);
      return sum + (addon?.price ?? 0);
    }, 0);
    return base + addonsTotal;
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editName.trim()) return;
    const finalPrice = editPriceOverride ? editPrice : calculateEditPrice();
    try {
      await api.updateUser(editingUser._id, {
        name: editName,
        coffeePreference: editPreference,
        coffeePrice: finalPrice,
        addons: editAddons
      });
      setEditingUser(null);
      loadData();
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  // Admin handlers
  const handleAdminPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await api.adminVerify(adminPinInput);
      if (result.authorized) {
        setAdminUnlocked(true);
        sessionStorage.setItem('whopays_admin_unlocked', 'true');
        setAdminPinError(false);
        setAdminPinInput('');
      } else {
        setAdminPinError(true);
        setAdminPinInput('');
        setTimeout(() => setAdminPinError(false), 600);
      }
    } catch (error) {
      setAdminPinError(true);
      setTimeout(() => setAdminPinError(false), 600);
    }
  };

  const handleAdminDeleteTransaction = async (id: string) => {
    if (!confirm('Delete this transaction? Balance changes will be reversed.')) return;
    try {
      await api.adminDeleteTransaction(id, '110125');
      loadData();
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      alert('Failed to delete transaction');
    }
  };

  const handleAdminClearTransactions = async () => {
    if (!confirm('Clear ALL transactions? This cannot be undone.')) return;
    try {
      await api.adminClearAllTransactions('110125');
      loadData();
      alert('All transactions cleared');
    } catch (error) {
      alert('Failed to clear transactions');
    }
  };

  const handleAdminResetBalances = async () => {
    if (!confirm('Reset ALL user balances to 0? This cannot be undone.')) return;
    try {
      await api.adminResetBalances('110125');
      loadData();
      alert('All balances reset');
    } catch (error) {
      alert('Failed to reset balances');
    }
  };

  const handleAdminResetAll = async () => {
    if (!confirm('NUKE: Delete all transactions AND reset all balances? This cannot be undone.')) return;
    if (!confirm('Are you absolutely sure? This wipes everything.')) return;
    try {
      await api.adminResetAll('110125');
      loadData();
      alert('Everything has been reset');
    } catch (error) {
      alert('Failed to reset all');
    }
  };

  const handleAdminLoadLogs = async () => {
    try {
      const logs = await api.adminGetLogs('110125');
      setAdminLogs(logs);
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
  };

  const handleAdminEditUser = async (id: string, data: Record<string, any>) => {
    try {
      await api.adminEditUser(id, '110125', data);
      setAdminEditUser(null);
      loadData();
      alert('User updated');
    } catch (error) {
      console.error('Failed to edit user:', error);
      alert('Failed to edit user');
    }
  };

  const handleAdminEditTransaction = async (id: string, data: Record<string, any>) => {
    try {
      await api.adminEditTransaction(id, '110125', data);
      setAdminEditTx(null);
      loadData();
      alert('Transaction updated');
    } catch (error) {
      console.error('Failed to edit transaction:', error);
      alert('Failed to edit transaction');
    }
  };

  const handleAdminDeleteUser = async (id: string, name: string) => {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    try {
      await api.adminDeleteUser(id, '110125');
      loadData();
    } catch (error) {
      alert('Failed to delete user');
    }
  };

  const calculateTotalPrice = () => {
    const base = BASE_PRICES[newUserPreference] ?? 5.00;
    const addonsTotal = newUserAddons.reduce((sum, name) => {
      const addon = ADDONS.find(a => a.name === name);
      return sum + (addon?.price ?? 0);
    }, 0);
    return base + addonsTotal;
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return 'text-emerald-600';
    if (balance < 0) return 'text-rose-500';
    return 'text-slate-400';
  };

  const handleExportMonthlySummary = async () => {
    try {
      const summary = await api.getMonthlySummary(selectedMonth, selectedYear);
      
      // Create CSV content
      let csv = 'WhoPays Monthly Summary\n';
      csv += `Month: ${selectedMonth}/${selectedYear}\n`;
      csv += `Total Transactions: ${summary.totalTransactions}\n`;
      csv += `Total Spent: $${summary.totalSpent.toFixed(2)}\n\n`;
      csv += 'Date,Buyer,Participants,Total Cost,Cost Per Person,Description\n';
      
      summary.transactions.forEach((t: any) => {
        const date = new Date(t.date).toLocaleDateString();
        const buyer = t.buyer.name;
        const participants = t.participants.map((p: any) => p.name).join('; ');
        csv += `"${date}","${buyer}","${participants}",${t.totalCost.toFixed(2)},${t.costPerPerson.toFixed(2)},"${t.description}"\n`;
      });

      // Download the file
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `coffee-summary-${selectedMonth}-${selectedYear}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export summary:', error);
      alert('Failed to export monthly summary');
    }
  };

  const getFilteredTransactions = () => {
    const now = new Date();
    let startDate: Date;
    if (historyPeriod === 'week') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else if (historyPeriod === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      startDate = new Date(now.getFullYear(), 0, 1);
    }
    return transactions.filter(t => new Date(t.date) >= startDate);
  };

  const getSpendingBreakdown = () => {
    const filtered = getFilteredTransactions();
    const breakdown: Record<string, Record<string, number>> = {};

    filtered.forEach(t => {
      const buyerName = t.buyer.name;
      if (!breakdown[buyerName]) breakdown[buyerName] = {};

      t.participants.forEach(p => {
        const participantName = p.name;
        const pp = t.participantPrices?.find(pr => pr.user === p._id);
        const share = pp ? pp.price : p.coffeePrice;
        if (!breakdown[buyerName][participantName]) breakdown[buyerName][participantName] = 0;
        breakdown[buyerName][participantName] += share;
      });
    });

    return breakdown;
  };

  const getSpendingTotals = () => {
    const breakdown = getSpendingBreakdown();
    const totals: Record<string, { spent: number; received: number; net: number }> = {};

    Object.entries(breakdown).forEach(([buyer, recipients]) => {
      if (!totals[buyer]) totals[buyer] = { spent: 0, received: 0, net: 0 };
      Object.entries(recipients).forEach(([recipient, amount]) => {
        if (!totals[recipient]) totals[recipient] = { spent: 0, received: 0, net: 0 };
        totals[buyer].spent += amount;
        totals[recipient].received += amount;
      });
    });

    Object.keys(totals).forEach(name => {
      totals[name].net = totals[name].spent - totals[name].received;
    });

    return totals;
  };

  if (!unlocked) {
    const handlePinSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (pin === '0571') {
        setUnlocked(true);
        sessionStorage.setItem('whopays_unlocked', 'true');
      } else {
        setPinError(true);
        setPin('');
        setTimeout(() => setPinError(false), 600);
      }
    };

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6">
        <img src="/logo.svg" alt="WhoPays" className="w-20 h-20 mb-4" />
        <h1 className="text-xl font-bold text-slate-900 mb-1">WhoPays</h1>
        <p className="text-xs text-slate-400 mb-8">Enter PIN to continue</p>
        <form onSubmit={handlePinSubmit} className="w-full max-w-[260px]">
          <input
            type="tel"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setPinError(false); }}
            className={`w-full text-center text-3xl tracking-[0.5em] font-bold py-3 bg-slate-50 border-2 rounded-2xl focus:outline-none transition-all ${
              pinError
                ? 'border-rose-400 bg-rose-50 text-rose-500 animate-pulse'
                : 'border-slate-200 focus:border-amber-500 focus:bg-white text-slate-900'
            }`}
            placeholder="••••"
            autoFocus
          />
          <button
            type="submit"
            disabled={pin.length < 4}
            className="w-full mt-4 bg-slate-900 text-white py-3 rounded-xl active:bg-slate-800 transition-all font-semibold text-base shadow-sm disabled:bg-slate-200 disabled:text-slate-400"
          >
            Unlock
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
        <div className="px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="WhoPays" className="w-9 h-9" />
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">WhoPays</h1>
              <p className="text-[11px] text-slate-400 leading-tight">Fair team coffee rotation</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-medium">
              {users.length} members
            </div>
            <button
              onClick={() => setAdminMode(true)}
              className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 active:text-slate-600 transition-all"
            >
              ⚙️
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="px-4 pt-4 space-y-3 animate-fadeIn">

        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-3">
            {/* Coffee Stats Summary */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                  <span className="text-sm">☕</span>
                </div>
                <h2 className="text-sm font-semibold text-slate-700">Coffee Stats</h2>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl p-3 bg-slate-50 border border-slate-100 text-center">
                  <p className="text-2xl font-bold text-slate-800">{users.reduce((sum, u) => sum + u.coffeesDrank, 0)}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Total Coffees</p>
                </div>
                <div className="rounded-xl p-3 bg-green-50 border border-green-100 text-center">
                  <p className="text-2xl font-bold text-green-600">{users.reduce((sum, u) => sum + getAvailableFreeCoffees(u), 0)}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Free Available</p>
                </div>
                <div className="rounded-xl p-3 bg-amber-50 border border-amber-100 text-center">
                  <p className="text-2xl font-bold text-amber-600">{users.reduce((sum, u) => sum + (u.freeCoffeesUsed || 0), 0)}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Free Used</p>
                </div>
              </div>
            </div>

            {/* Who's Present Today */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                  <span className="text-sm">🎯</span>
                </div>
                <h2 className="text-sm font-semibold text-slate-700">Who's Present Today?</h2>
              </div>
              {users.length === 0 ? (
                <p className="text-slate-400 text-sm py-2">Add team members first</p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {users.map((user) => (
                      <button
                        key={user._id}
                        onClick={() => togglePresent(user._id)}
                        className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                          presentToday.includes(user._id)
                            ? 'bg-amber-500 text-white'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {user.name}
                      </button>
                    ))}
                  </div>

                  {/* Buyer Selection */}
                  {presentToday.length > 0 && (() => {
                    const suggested = computeSuggestedBuyer();
                    const effective = getEffectiveBuyer();
                    if (!suggested || !effective) return null;
                    const presentUsers = users.filter(u => presentToday.includes(u._id));
                    const isOverridden = buyerOverride !== null && buyerOverride !== suggested._id;
                    return (
                      <div className="space-y-3">
                        {/* Effective Buyer Card */}
                        <div className={`rounded-xl p-4 border transition-all ${
                          isOverridden
                            ? 'bg-blue-50 border-blue-100'
                            : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100'
                        }`}>
                          <p className="text-xs text-slate-500 mb-2">
                            {isOverridden ? 'Override: selected buyer' : 'Suggested buyer from those present'}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base ${
                                isOverridden
                                  ? 'bg-gradient-to-br from-blue-400 to-indigo-500'
                                  : 'bg-gradient-to-br from-amber-400 to-orange-500'
                              }`}>
                                {effective.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-lg font-bold text-slate-900 leading-tight">{effective.name}</p>
                                <p className="text-xs text-slate-400">
                                  {effective.coffeePreference} · ${effective.coffeePrice.toFixed(2)}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`text-sm font-bold ${getBalanceColor(effective.balance)}`}>
                                ${effective.balance.toFixed(2)}
                              </p>
                              <p className="text-[11px] text-slate-400">{effective.timesBought}x bought</p>
                            </div>
                          </div>
                        </div>

                        {/* Override selector */}
                        <div>
                          <p className="text-xs text-slate-400 mb-2">Or pick a different buyer from those present:</p>
                          <div className="flex flex-wrap gap-2">
                            {presentUsers.map((user) => (
                              <button
                                key={user._id}
                                onClick={() => setBuyerOverride(user._id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                  effective._id === user._id
                                    ? (isOverridden ? 'bg-blue-500 text-white' : 'bg-amber-500 text-white')
                                    : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {user.name}
                                {user._id === suggested._id && !isOverridden && ' ✓'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Proceed button */}
                        <button
                          onClick={proceedToRecord}
                          className="w-full bg-slate-900 text-white py-3 rounded-xl active:bg-slate-800 transition-all font-semibold text-sm shadow-sm"
                        >
                          Record Transaction with {effective.name} →
                        </button>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>

            {/* Team Overview */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                  <span className="text-sm">👥</span>
                </div>
                <h2 className="text-sm font-semibold text-slate-700">Team Overview</h2>
              </div>
              <div className="space-y-2">
                {users.length === 0 && (
                  <p className="text-slate-400 text-sm py-2">No team members yet</p>
                )}
                {users.map((user) => (
                  <div key={user._id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 font-bold text-sm shrink-0">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 text-sm leading-tight">{user.name}</p>
                        <p className="text-xs text-slate-400 truncate">{user.coffeePreference} · ${user.coffeePrice.toFixed(2)}</p>
                        {user.addons && user.addons.length > 0 && (
                          <p className="text-[11px] text-amber-500 truncate mt-0.5">{user.addons.join(', ')}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className={`text-sm font-bold ${getBalanceColor(user.balance)}`}>
                        ${user.balance.toFixed(2)}
                      </p>
                      <p className="text-[11px] text-slate-400">{user.coffeesDrank} coffees · {user.freeCoffeesUsed || 0} free used</p>
                      {getAvailableFreeCoffees(user) > 0 && (
                        <p className="text-[11px] text-green-600 font-semibold mt-0.5">
                          🎟️ {getAvailableFreeCoffees(user)} free available
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                  <span className="text-sm">📋</span>
                </div>
                <h2 className="text-sm font-semibold text-slate-700">Recent Transactions</h2>
              </div>
              {transactions.length === 0 ? (
                <p className="text-slate-400 text-sm py-2">No transactions yet</p>
              ) : (
                <div className="space-y-2">
                  {transactions.slice(0, 5).map((transaction) => (
                    <div key={transaction._id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800">
                          {transaction.buyer.name} <span className="text-slate-400">→</span> {transaction.participants.length} ppl
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {new Date(transaction.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="text-sm font-bold text-slate-800">${transaction.totalCost.toFixed(2)}</p>
                        <p className="text-[11px] text-slate-400">${transaction.costPerPerson.toFixed(2)}/p</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Users Management */}
        {activeTab === 'users' && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                  <span className="text-sm">➕</span>
                </div>
                <h2 className="text-sm font-semibold text-slate-700">Add Team Member</h2>
              </div>
              <form onSubmit={handleAddUser} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Name</label>
                  <input
                    type="text"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-base bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 focus:bg-white transition-all"
                    placeholder="Enter name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Coffee Preference</label>
                  <select
                    value={newUserPreference}
                    onChange={(e) => setNewUserPreference(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-base bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 focus:bg-white transition-all"
                  >
                      <optgroup label="Hot Coffees">
                        <option>Cappuccino</option>
                        <option>Latte</option>
                        <option>Flat White</option>
                        <option>Long Black</option>
                        <option>Espresso</option>
                        <option>Americano</option>
                        <option>Mocha</option>
                        <option>Hot Chocolate</option>
                        <option>Chai Latte</option>
                        <option>Matcha Latte</option>
                      </optgroup>
                      <optgroup label="Iced Coffees">
                        <option>Iced Latte</option>
                        <option>Iced Cappuccino</option>
                        <option>Iced Long Black</option>
                        <option>Cold Brew</option>
                        <option>Iced Mocha</option>
                        <option>Frappé</option>
                      </optgroup>
                      <optgroup label="Other Drinks">
                        <option>Fresh Juice</option>
                        <option>Smoothie</option>
                        <option>Milkshake</option>
                        <option>Soft Drink</option>
                        <option>Tea</option>
                        <option>Iced Tea</option>
                      </optgroup>
                      <optgroup label="Food">
                        <option>Pastry</option>
                        <option>Croissant</option>
                        <option>Muffin</option>
                        <option>Toast</option>
                        <option>Bagel</option>
                        <option>Breakfast Roll</option>
                      </optgroup>
                    </select>
                </div>
                {/* Add-ons */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-2">Add-ons</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ADDONS.map((addon) => (
                      <button
                        type="button"
                        key={addon.name}
                        onClick={() => toggleAddon(addon.name)}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl border-2 transition-all text-sm ${
                          newUserAddons.includes(addon.name)
                            ? 'border-amber-500 bg-amber-50 text-slate-800'
                            : 'border-slate-200 bg-slate-50 text-slate-600'
                        }`}
                      >
                        <span className="font-medium">{addon.name}</span>
                        <span className="text-xs text-slate-400">
                          {addon.price > 0 ? `+$${addon.price.toFixed(2)}` : 'Free'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                {/* Price breakdown */}
                <div className="rounded-xl p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100">
                  <div className="flex justify-between items-center mb-3">
                    <div className="space-y-0.5">
                      <p className="text-xs text-slate-500">
                        Base: <span className="font-medium text-slate-700">${BASE_PRICES[newUserPreference]?.toFixed(2) ?? '5.00'}</span>
                      </p>
                      {newUserAddons.length > 0 && (
                        <p className="text-xs text-slate-500">
                          Add-ons: <span className="font-medium text-slate-700">+${newUserAddons.reduce((sum, name) => {
                            const addon = ADDONS.find(a => a.name === name);
                            return sum + (addon?.price ?? 0);
                          }, 0).toFixed(2)}</span>
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-slate-400 uppercase tracking-wide">Suggested</p>
                      <p className="text-lg font-bold text-slate-600">
                        ${calculateTotalPrice().toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-3 border-t border-amber-100">
                    <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newUserPriceOverride}
                        onChange={(e) => {
                          setNewUserPriceOverride(e.target.checked);
                          if (e.target.checked) {
                            setNewUserPrice(calculateTotalPrice());
                          }
                        }}
                        className="w-4 h-4 rounded accent-amber-500"
                      />
                      Override price
                    </label>
                  </div>
                  {newUserPriceOverride && (
                    <div className="mt-2">
                      <input
                        type="number"
                        step="0.10"
                        min="0"
                        value={newUserPrice}
                        onChange={(e) => setNewUserPrice(parseFloat(e.target.value) || 0)}
                        className="w-full px-3.5 py-2.5 text-base bg-white border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all font-semibold text-slate-900"
                        placeholder="Custom price"
                      />
                    </div>
                  )}
                </div>
                <input type="hidden" value={newUserPriceOverride ? newUserPrice : calculateTotalPrice()} onChange={() => {}} />
                <button
                  type="submit"
                  className="w-full bg-slate-900 text-white py-3 rounded-xl active:bg-slate-800 transition-all font-semibold text-base shadow-sm"
                >
                  Add Team Member
                </button>
              </form>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                  <span className="text-sm">👥</span>
                </div>
                <h2 className="text-sm font-semibold text-slate-700">Team Members</h2>
              </div>
              {users.length === 0 ? (
                <p className="text-slate-400 text-sm py-2">No team members yet</p>
              ) : (
                <div className="space-y-2">
                  {users.map((user) => (
                    <div key={user._id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 font-bold text-sm shrink-0">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 text-sm leading-tight">{user.name}</p>
                          <p className="text-xs text-slate-400 truncate">
                            {user.coffeePreference} · ${user.coffeePrice.toFixed(2)}
                          </p>
                          {user.addons && user.addons.length > 0 && (
                            <p className="text-[11px] text-amber-500 truncate mt-0.5">
                              {user.addons.join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="text-slate-400 active:text-slate-600 text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user._id)}
                          className="text-rose-400 active:text-rose-600 text-sm font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* New Transaction */}
        {activeTab === 'transactions' && (
          <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                <span className="text-sm">☕</span>
              </div>
              <h2 className="text-sm font-semibold text-slate-700">Record Coffee Run</h2>
            </div>
            <form onSubmit={handleCreateTransaction} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Who bought today?</label>
                <select
                  value={selectedBuyer}
                  onChange={(e) => setSelectedBuyer(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-base bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 focus:bg-white transition-all"
                  required
                >
                  <option value="">Select buyer</option>
                  {users.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.name} ({user.coffeePreference} - ${user.coffeePrice.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-2">Who is present today?</label>
                <div className="grid grid-cols-2 gap-2">
                  {users.map((user) => (
                    <button
                      type="button"
                      key={user._id}
                      onClick={() => toggleParticipant(user._id)}
                      className={`px-3 py-2.5 rounded-xl border-2 transition-all text-sm font-medium ${
                        selectedParticipants.includes(user._id)
                          ? 'border-amber-500 bg-amber-50 text-slate-800'
                          : 'border-slate-200 bg-slate-50 text-slate-600'
                      }`}
                    >
                      {user.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Per-participant price overrides */}
              {selectedParticipants.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-2">Prices <span className="text-slate-400">(tap to override)</span></label>
                  <div className="space-y-2">
                    {selectedParticipants.map((userId) => {
                      const user = users.find(u => u._id === userId);
                      if (!user) return null;
                      const isOverridden = priceOverrides[userId] !== undefined;
                      const isFreeCoffee = freeCoffees.includes(userId);
                      const availableFree = getAvailableFreeCoffees(user);
                      const canUseFree = availableFree > 0 || isFreeCoffee;
                      return (
                        <div key={userId} className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                          isFreeCoffee ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-100'
                        }`}>
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-slate-700 flex-1 min-w-0 truncate">{user.name}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {canUseFree && (
                              <button
                                type="button"
                                onClick={() => toggleFreeCoffee(userId)}
                                className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                  isFreeCoffee
                                    ? 'bg-green-500 text-white'
                                    : 'bg-green-100 text-green-600 active:bg-green-200'
                                }`}
                                title={`${availableFree} free coffee${availableFree !== 1 ? 's' : ''} available`}
                              >
                                🎟️ {availableFree} free
                              </button>
                            )}
                            {isFreeCoffee ? (
                              <span className="text-sm font-semibold text-green-600 w-20 text-right">FREE</span>
                            ) : (
                              <>
                                <span className="text-xs text-slate-400">$</span>
                                <input
                                  type="number"
                                  step="0.10"
                                  min="0"
                                  value={getEffectivePrice(userId).toFixed(2)}
                                  onChange={(e) => setParticipantPrice(userId, parseFloat(e.target.value) || 0)}
                                  className={`w-20 px-2 py-1.5 text-sm rounded-lg border text-right transition-all ${
                                    isOverridden
                                      ? 'border-amber-400 bg-amber-50 font-semibold text-slate-900'
                                      : 'border-slate-200 bg-white text-slate-600'
                                  } focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500`}
                                />
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Description <span className="text-slate-400">(optional)</span></label>
                <input
                  type="text"
                  value={transactionDescription}
                  onChange={(e) => setTransactionDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-base bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 focus:bg-white transition-all"
                  placeholder="e.g., Morning coffee run"
                />
              </div>

              {/* Cost Preview */}
              {selectedBuyer && selectedParticipants.length > 0 && (
                <div className="rounded-xl p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100">
                  <h3 className="text-sm font-bold text-slate-700 mb-2">Cost Preview</h3>
                  <div className="space-y-1 text-sm">
                    {selectedParticipants.map((userId) => {
                      const user = users.find(u => u._id === userId);
                      if (!user) return null;
                      const effectivePrice = getEffectivePrice(userId);
                      const isOverridden = priceOverrides[userId] !== undefined;
                      const isFreeCoffee = freeCoffees.includes(userId);
                      return (
                        <div key={userId} className="flex justify-between text-slate-600">
                          <span>{user.name} {isOverridden && !isFreeCoffee && <span className="text-amber-500 text-xs">✏️</span>} {isFreeCoffee && <span className="text-green-500 text-xs">🎟️ Free</span>}</span>
                          <span className="font-medium">${effectivePrice.toFixed(2)}</span>
                        </div>
                      );
                    })}
                    <div className="border-t border-amber-200/60 pt-2 mt-2">
                      <div className="flex justify-between font-bold text-slate-800">
                        <span>Total</span>
                        <span>${selectedParticipants.reduce((sum, userId) => sum + getEffectivePrice(userId), 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-500 text-xs">
                        <span>Per person</span>
                        <span>${(selectedParticipants.reduce((sum, userId) => sum + getEffectivePrice(userId), 0) / selectedParticipants.length).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={!selectedBuyer || selectedParticipants.length === 0}
                className="w-full bg-slate-900 text-white py-3 rounded-xl active:bg-slate-800 transition-all font-semibold text-base shadow-sm disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
              >
                Record Transaction
              </button>
            </form>
          </div>
        )}

        {/* History */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            {/* Period Toggle & Export */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                  <span className="text-sm">📜</span>
                </div>
                <h2 className="text-sm font-semibold text-slate-700">Spending Breakdown</h2>
              </div>
              <div className="flex gap-1.5 mb-3">
                {(['week', 'month', 'year'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setHistoryPeriod(p)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
                      historyPeriod === p
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'This Year'}
                  </button>
                ))}
              </div>
              <button
                onClick={handleExportMonthlySummary}
                className="w-full bg-slate-100 text-slate-700 py-2.5 rounded-xl active:bg-slate-200 transition-all font-medium text-sm flex items-center justify-center gap-1.5"
              >
                <span>📥</span> Export CSV
              </button>
            </div>

            {/* Spending Breakdown Matrix */}
            {(() => {
              const breakdown = getSpendingBreakdown();
              const allNames = Array.from(new Set([
                ...Object.keys(breakdown),
                ...Object.values(breakdown).flatMap(r => Object.keys(r))
              ])).sort();
              const totals = getSpendingTotals();
              const filtered = getFilteredTransactions();

              if (filtered.length === 0) {
                return (
                  <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm">
                    <p className="text-slate-400 text-sm py-2 text-center">No transactions in this period</p>
                  </div>
                );
              }

              return (
                <>
                  {/* Who spent on whom */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm">
                    <h3 className="text-xs font-semibold text-slate-500 mb-3">Who Spent On Whom</h3>
                    <div className="space-y-3">
                      {allNames.map(buyer => {
                        const recipients = breakdown[buyer] || {};
                        const recipientNames = Object.keys(recipients).sort();
                        if (recipientNames.length === 0) return null;
                        const totalSpent = Object.values(recipients).reduce((a, b) => a + b, 0);
                        return (
                          <div key={buyer} className="rounded-xl bg-slate-50/80 border border-slate-100 p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                                  {buyer.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-sm font-semibold text-slate-800">{buyer}</span>
                              </div>
                              <span className="text-sm font-bold text-slate-700">${totalSpent.toFixed(2)}</span>
                            </div>
                            <div className="space-y-1 pl-9">
                              {recipientNames.map(recipient => (
                                <div key={recipient} className="flex justify-between items-center text-xs">
                                  <span className={recipient === buyer ? 'text-slate-400' : 'text-slate-600'}>
                                    {recipient === buyer ? '🧑 (self)' : `→ ${recipient}`}
                                  </span>
                                  <span className={`font-medium ${recipient === buyer ? 'text-slate-400' : 'text-slate-700'}`}>
                                    ${recipients[recipient].toFixed(2)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Totals Summary */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm">
                    <h3 className="text-xs font-semibold text-slate-500 mb-3">Summary</h3>
                    <div className="space-y-2">
                      {allNames.map(name => {
                        const t = totals[name];
                        if (!t) return null;
                        return (
                          <div key={name} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 border border-slate-100">
                            <span className="text-sm font-medium text-slate-700">{name}</span>
                            <div className="flex items-center gap-3 text-xs">
                              <div className="text-right">
                                <p className="text-slate-400">Spent</p>
                                <p className="font-semibold text-slate-700">${t.spent.toFixed(2)}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-slate-400">Received</p>
                                <p className="font-semibold text-slate-700">${t.received.toFixed(2)}</p>
                              </div>
                              <div className="text-right min-w-[60px]">
                                <p className="text-slate-400">Net</p>
                                <p className={`font-bold ${t.net > 0 ? 'text-emerald-600' : t.net < 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                                  {t.net > 0 ? '+' : ''}${t.net.toFixed(2)}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Transaction List */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm">
                    <h3 className="text-xs font-semibold text-slate-500 mb-3">Transactions</h3>
                    <div className="space-y-2">
                      {filtered.map((transaction) => (
                        <div key={transaction._id} className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                                {transaction.buyer.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-800">
                                  <span className="text-amber-600">{transaction.buyer.name}</span> bought
                                </p>
                                <p className="text-[11px] text-slate-400">
                                  {new Date(transaction.date).toLocaleDateString()} · {new Date(transaction.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0 ml-2">
                              <p className="text-sm font-bold text-slate-800">${transaction.totalCost.toFixed(2)}</p>
                              <p className="text-[11px] text-slate-400">${transaction.costPerPerson.toFixed(2)}/p</p>
                            </div>
                          </div>
                          <div className="border-t border-slate-100 pt-2">
                            <p className="text-xs text-slate-500 truncate">
                              {transaction.participants.map(p => p.name).join(', ')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 bg-white/90 backdrop-blur-xl border-t border-slate-200/60 px-2 py-1.5 flex justify-around items-center max-w-[430px] mx-auto">
        {[
          { id: 'dashboard', icon: '🏠', label: 'Home' },
          { id: 'users', icon: '👥', label: 'Team' },
          { id: 'transactions', icon: '☕', label: 'Record' },
          { id: 'history', icon: '📜', label: 'History' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all min-w-[64px] ${
              activeTab === tab.id
                ? 'text-amber-600'
                : 'text-slate-400'
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className="text-[11px] font-semibold">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm flex items-end justify-center" onClick={closeEditModal}>
          <div
            className="bg-white w-full max-w-[430px] rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                  <span className="text-sm">✏️</span>
                </div>
                <h2 className="text-sm font-semibold text-slate-700">Edit Team Member</h2>
              </div>
              <button onClick={closeEditModal} className="text-slate-400 active:text-slate-600 text-lg leading-none">×</button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-base bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 focus:bg-white transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Coffee Preference</label>
                <select
                  value={editPreference}
                  onChange={(e) => setEditPreference(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-base bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 focus:bg-white transition-all"
                >
                  <optgroup label="Hot Coffees">
                    <option>Cappuccino</option><option>Latte</option><option>Flat White</option>
                    <option>Long Black</option><option>Espresso</option><option>Americano</option>
                    <option>Mocha</option><option>Hot Chocolate</option><option>Chai Latte</option>
                    <option>Matcha Latte</option>
                  </optgroup>
                  <optgroup label="Iced Coffees">
                    <option>Iced Latte</option><option>Iced Cappuccino</option><option>Iced Long Black</option>
                    <option>Cold Brew</option><option>Iced Mocha</option><option>Frappé</option>
                  </optgroup>
                  <optgroup label="Other Drinks">
                    <option>Fresh Juice</option><option>Smoothie</option><option>Milkshake</option>
                    <option>Soft Drink</option><option>Tea</option><option>Iced Tea</option>
                  </optgroup>
                  <optgroup label="Food">
                    <option>Pastry</option><option>Croissant</option><option>Muffin</option>
                    <option>Toast</option><option>Bagel</option><option>Breakfast Roll</option>
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-2">Add-ons</label>
                <div className="grid grid-cols-2 gap-2">
                  {ADDONS.map((addon) => (
                    <button
                      type="button"
                      key={addon.name}
                      onClick={() => toggleEditAddon(addon.name)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl border-2 transition-all text-sm ${
                        editAddons.includes(addon.name)
                          ? 'border-amber-500 bg-amber-50 text-slate-800'
                          : 'border-slate-200 bg-slate-50 text-slate-600'
                      }`}
                    >
                      <span className="font-medium">{addon.name}</span>
                      <span className="text-xs text-slate-400">
                        {addon.price > 0 ? `+$${addon.price.toFixed(2)}` : 'Free'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-xl p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100">
                <div className="flex justify-between items-center mb-3">
                  <div className="space-y-0.5">
                    <p className="text-xs text-slate-500">
                      Base: <span className="font-medium text-slate-700">${BASE_PRICES[editPreference]?.toFixed(2) ?? '5.00'}</span>
                    </p>
                    {editAddons.length > 0 && (
                      <p className="text-xs text-slate-500">
                        Add-ons: <span className="font-medium text-slate-700">+${editAddons.reduce((sum, name) => {
                          const addon = ADDONS.find(a => a.name === name);
                          return sum + (addon?.price ?? 0);
                        }, 0).toFixed(2)}</span>
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-slate-400 uppercase tracking-wide">Suggested</p>
                    <p className="text-lg font-bold text-slate-600">
                      ${calculateEditPrice().toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-3 border-t border-amber-100">
                  <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editPriceOverride}
                      onChange={(e) => {
                        setEditPriceOverride(e.target.checked);
                        if (e.target.checked) setEditPrice(calculateEditPrice());
                      }}
                      className="w-4 h-4 rounded accent-amber-500"
                    />
                    Override price
                  </label>
                </div>
                {editPriceOverride && (
                  <div className="mt-2">
                    <input
                      type="number"
                      step="0.10"
                      min="0"
                      value={editPrice}
                      onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)}
                      className="w-full px-3.5 py-2.5 text-base bg-white border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all font-semibold text-slate-900"
                      placeholder="Custom price"
                    />
                  </div>
                )}
              </div>
              <button
                type="submit"
                className="w-full bg-slate-900 text-white py-3 rounded-xl active:bg-slate-800 transition-all font-semibold text-base shadow-sm"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Admin Modal */}
      {adminMode && (
        <div className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm flex items-end justify-center" onClick={() => { setAdminMode(false); setAdminUnlocked(false); sessionStorage.removeItem('whopays_admin_unlocked'); setAdminPinInput(''); }}>
          <div
            className="bg-white w-full max-w-[430px] rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center">
                  <span className="text-sm">⚙️</span>
                </div>
                <h2 className="text-sm font-semibold text-slate-700">Admin Panel</h2>
              </div>
              <button onClick={() => { setAdminMode(false); setAdminUnlocked(false); sessionStorage.removeItem('whopays_admin_unlocked'); setAdminPinInput(''); }} className="text-slate-400 active:text-slate-600 text-lg leading-none">×</button>
            </div>

            {!adminUnlocked ? (
              <form onSubmit={handleAdminPinSubmit} className="space-y-3">
                <p className="text-xs text-slate-400 text-center">Enter admin PIN to continue</p>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={adminPinInput}
                  onChange={(e) => { setAdminPinInput(e.target.value.replace(/\D/g, '')); setAdminPinError(false); }}
                  className={`w-full text-center text-2xl tracking-[0.3em] font-bold py-3 bg-slate-50 border-2 rounded-2xl focus:outline-none transition-all ${
                    adminPinError
                      ? 'border-rose-400 bg-rose-50 text-rose-500 animate-pulse'
                      : 'border-slate-200 focus:border-slate-900 focus:bg-white text-slate-900'
                  }`}
                  placeholder="••••••"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={adminPinInput.length < 4}
                  className="w-full bg-slate-900 text-white py-3 rounded-xl active:bg-slate-800 transition-all font-semibold text-base shadow-sm disabled:bg-slate-200 disabled:text-slate-400"
                >
                  Unlock Admin
                </button>
              </form>
            ) : (
              <div className="space-y-3">
                {/* Admin Tabs */}
                <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
                  {(['actions', 'users', 'transactions', 'logs'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => {
                        setAdminTab(tab);
                        if (tab === 'logs') handleAdminLoadLogs();
                      }}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-all ${
                        adminTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Actions Tab */}
                {adminTab === 'actions' && (
                  <div className="rounded-xl p-4 bg-rose-50 border border-rose-100">
                    <h3 className="text-xs font-semibold text-rose-600 mb-3">Danger Zone</h3>
                    <div className="space-y-2">
                      <button
                        onClick={handleAdminClearTransactions}
                        className="w-full bg-white text-rose-600 py-2.5 rounded-xl active:bg-rose-50 transition-all font-medium text-sm border border-rose-200"
                      >
                        🗑️ Clear All Transactions
                      </button>
                      <button
                        onClick={handleAdminResetBalances}
                        className="w-full bg-white text-rose-600 py-2.5 rounded-xl active:bg-rose-50 transition-all font-medium text-sm border border-rose-200"
                      >
                        💰 Reset All Balances to 0
                      </button>
                      <button
                        onClick={handleAdminResetAll}
                        className="w-full bg-rose-600 text-white py-2.5 rounded-xl active:bg-rose-700 transition-all font-semibold text-sm"
                      >
                        ☢️ Reset Everything (Nuke)
                      </button>
                    </div>
                  </div>
                )}

                {/* Users Tab */}
                {adminTab === 'users' && (
                  <div className="space-y-2">
                    {users.length === 0 ? (
                      <p className="text-slate-400 text-sm text-center py-4">No users</p>
                    ) : (
                      users.map(user => (
                        <div key={user._id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-slate-700 truncate">{user.name}</p>
                            <p className="text-[11px] text-slate-400">
                              {user.coffeePreference} · ${user.coffeePrice.toFixed(2)} · Bal: ${user.balance.toFixed(2)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <button
                              onClick={() => setAdminEditUser(user)}
                              className="text-slate-500 active:text-slate-700 text-xs font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleAdminDeleteUser(user._id, user.name)}
                              className="text-rose-400 active:text-rose-600 text-xs font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Transactions Tab */}
                {adminTab === 'transactions' && (
                  <div className="space-y-2">
                    {transactions.length === 0 ? (
                      <p className="text-slate-400 text-sm text-center py-4">No transactions</p>
                    ) : (
                      <div className="max-h-[400px] overflow-y-auto space-y-2">
                        {transactions.map(t => (
                          <div key={t._id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-slate-700 truncate">
                                {t.buyer.name} → {t.participants.map((p: any) => p.name).join(', ')}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                {new Date(t.date).toLocaleDateString()} · ${t.totalCost.toFixed(2)} · {t.description}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              <button
                                onClick={() => setAdminEditTx(t)}
                                className="text-slate-500 active:text-slate-700 text-xs font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleAdminDeleteTransaction(t._id)}
                                className="text-rose-400 active:text-rose-600 text-xs font-medium"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Logs Tab */}
                {adminTab === 'logs' && (
                  <div className="space-y-2">
                    {adminLogs.length === 0 ? (
                      <p className="text-slate-400 text-sm text-center py-4">No logs yet</p>
                    ) : (
                      <div className="max-h-[400px] overflow-y-auto space-y-2">
                        {adminLogs.map((log: any) => (
                          <div key={log._id} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                log.action.startsWith('DELETE') ? 'bg-rose-100 text-rose-600' :
                                log.action.startsWith('EDIT') ? 'bg-blue-100 text-blue-600' :
                                log.action.startsWith('RESET') || log.action.startsWith('CLEAR') ? 'bg-amber-100 text-amber-600' :
                                'bg-slate-100 text-slate-500'
                              }`}>
                                {log.action.replace(/_/g, ' ')}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(log.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-xs text-slate-700">{log.description}</p>
                            {log.details?.before && log.details?.after && (
                              <p className="text-[10px] text-slate-400 mt-1">
                                Changed from: {JSON.stringify(log.details.before)} → {JSON.stringify(log.details.after)}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={() => { setAdminMode(false); setAdminUnlocked(false); sessionStorage.removeItem('whopays_admin_unlocked'); setAdminPinInput(''); setAdminTab('actions'); }}
                  className="w-full bg-slate-100 text-slate-600 py-2.5 rounded-xl active:bg-slate-200 transition-all font-medium text-sm"
                >
                  Exit Admin
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin Edit User Modal */}
      {adminEditUser && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-end justify-center" onClick={() => setAdminEditUser(null)}>
          <div className="bg-white w-full max-w-[430px] rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-700">Edit User (Admin)</h2>
              <button onClick={() => setAdminEditUser(null)} className="text-slate-400 text-lg leading-none">×</button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const formData = new FormData(form);
              handleAdminEditUser(adminEditUser._id, {
                name: formData.get('name'),
                coffeePreference: formData.get('coffeePreference'),
                coffeePrice: parseFloat(formData.get('coffeePrice') as string) || 0,
                balance: parseFloat(formData.get('balance') as string) || 0,
                timesBought: parseInt(formData.get('timesBought') as string) || 0,
                coffeesDrank: parseInt(formData.get('coffeesDrank') as string) || 0,
                loyaltyCount: parseInt(formData.get('loyaltyCount') as string) || 0,
                freeCoffeesUsed: parseInt(formData.get('freeCoffeesUsed') as string) || 0,
              });
            }} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
                <input name="name" type="text" defaultValue={adminEditUser.name} className="w-full px-3 py-2.5 text-base bg-slate-50 border border-slate-200 rounded-xl" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Coffee Preference</label>
                <input name="coffeePreference" type="text" defaultValue={adminEditUser.coffeePreference} className="w-full px-3 py-2.5 text-base bg-slate-50 border border-slate-200 rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Coffee Price</label>
                  <input name="coffeePrice" type="number" step="0.10" defaultValue={adminEditUser.coffeePrice} className="w-full px-3 py-2.5 text-base bg-slate-50 border border-slate-200 rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Balance</label>
                  <input name="balance" type="number" step="0.01" defaultValue={adminEditUser.balance} className="w-full px-3 py-2.5 text-base bg-slate-50 border border-slate-200 rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Times Bought</label>
                  <input name="timesBought" type="number" defaultValue={adminEditUser.timesBought} className="w-full px-3 py-2.5 text-base bg-slate-50 border border-slate-200 rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Coffees Drank</label>
                  <input name="coffeesDrank" type="number" defaultValue={adminEditUser.coffeesDrank} className="w-full px-3 py-2.5 text-base bg-slate-50 border border-slate-200 rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Loyalty Count</label>
                  <input name="loyaltyCount" type="number" defaultValue={adminEditUser.loyaltyCount} className="w-full px-3 py-2.5 text-base bg-slate-50 border border-slate-200 rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Free Coffees Used</label>
                  <input name="freeCoffeesUsed" type="number" defaultValue={adminEditUser.freeCoffeesUsed || 0} className="w-full px-3 py-2.5 text-base bg-slate-50 border border-slate-200 rounded-xl" />
                </div>
              </div>
              <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-xl font-semibold text-sm">
                Save Changes (Logged)
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Admin Edit Transaction Modal */}
      {adminEditTx && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-end justify-center" onClick={() => setAdminEditTx(null)}>
          <div className="bg-white w-full max-w-[430px] rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-700">Edit Transaction (Admin)</h2>
              <button onClick={() => setAdminEditTx(null)} className="text-slate-400 text-lg leading-none">×</button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const formData = new FormData(form);
              handleAdminEditTransaction(adminEditTx._id, {
                description: formData.get('description') as string,
                totalCost: parseFloat(formData.get('totalCost') as string) || 0,
              });
            }} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
                <input name="description" type="text" defaultValue={adminEditTx.description} className="w-full px-3 py-2.5 text-base bg-slate-50 border border-slate-200 rounded-xl" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Total Cost</label>
                <input name="totalCost" type="number" step="0.01" defaultValue={adminEditTx.totalCost} className="w-full px-3 py-2.5 text-base bg-slate-50 border border-slate-200 rounded-xl" />
              </div>
              <div className="rounded-xl p-3 bg-slate-50 border border-slate-100">
                <p className="text-xs text-slate-400 mb-1">Buyer: {adminEditTx.buyer.name}</p>
                <p className="text-xs text-slate-400">Participants: {adminEditTx.participants.map((p: any) => p.name).join(', ')}</p>
              </div>
              <p className="text-[11px] text-slate-400">Changing total cost will reverse and re-apply balance changes. This action will be logged.</p>
              <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-xl font-semibold text-sm">
                Save Changes (Logged)
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
