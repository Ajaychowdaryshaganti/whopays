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
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'transactions' | 'history'>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [suggestedBuyer, setSuggestedBuyer] = useState<User | null>(null);
  
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersData, transactionsData, suggestedData] = await Promise.all([
        api.getUsers(),
        api.getTransactions(),
        api.getSuggestedBuyer()
      ]);
      setUsers(usersData);
      setTransactions(transactionsData);
      setSuggestedBuyer(suggestedData.suggestedBuyer);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
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
        priceOverrides: Object.keys(priceOverrides).length > 0 ? priceOverrides : undefined
      });
      setSelectedBuyer('');
      setSelectedParticipants([]);
      setTransactionDescription('');
      setPriceOverrides({});
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
  };

  const setParticipantPrice = (userId: string, price: number) => {
    setPriceOverrides(prev => ({ ...prev, [userId]: price }));
  };

  const getEffectivePrice = (userId: string): number => {
    const user = users.find(u => u._id === userId);
    if (!user) return 0;
    return priceOverrides[userId] ?? user.coffeePrice;
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

  if (!unlocked) {
    const handlePinSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (pin === '0571') {
        setUnlocked(true);
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
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="px-4 pt-4 space-y-3 animate-fadeIn">

        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-3">
            {/* Suggested Buyer */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                  <span className="text-sm">🎯</span>
                </div>
                <h2 className="text-sm font-semibold text-slate-700">Suggested Next Buyer</h2>
              </div>
              {suggestedBuyer ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-base">
                      {suggestedBuyer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-lg font-bold text-slate-900 leading-tight">{suggestedBuyer.name}</p>
                      <p className="text-xs text-slate-400">
                        {suggestedBuyer.coffeePreference} · ${suggestedBuyer.coffeePrice.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${getBalanceColor(suggestedBuyer.balance)}`}>
                      ${suggestedBuyer.balance.toFixed(2)}
                    </p>
                    <p className="text-[11px] text-slate-400">{suggestedBuyer.timesBought}x bought</p>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 text-sm py-2">Add team members to get suggestions</p>
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
                      <p className="text-[11px] text-slate-400">{user.timesBought}B · {user.coffeesDrank}D</p>
                      {user.loyaltyCount > 0 && (
                        <div className="mt-1 flex items-center gap-1 justify-end">
                          <div className="w-12 h-1 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(user.loyaltyCount / 8) * 100}%` }} />
                          </div>
                          <span className="text-[10px] text-amber-500 font-medium">{user.loyaltyCount}/8</span>
                        </div>
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
                      return (
                        <div key={userId} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-slate-700 flex-1 min-w-0 truncate">{user.name}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
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
                      return (
                        <div key={userId} className="flex justify-between text-slate-600">
                          <span>{user.name} {isOverridden && <span className="text-amber-500 text-xs">✏️</span>}</span>
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
            <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                  <span className="text-sm">📜</span>
                </div>
                <h2 className="text-sm font-semibold text-slate-700">Transaction History</h2>
              </div>
              <div className="flex gap-2 mb-3">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="flex-1 px-3 py-2 text-base bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(0, i).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-3 py-2 text-base bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
                >
                  {Array.from({ length: 5 }, (_, i) => (
                    <option key={i} value={new Date().getFullYear() - i}>
                      {new Date().getFullYear() - i}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleExportMonthlySummary}
                className="w-full bg-slate-100 text-slate-700 py-2.5 rounded-xl active:bg-slate-200 transition-all font-medium text-sm mb-3 flex items-center justify-center gap-1.5"
              >
                <span>📥</span> Export CSV
              </button>
              {transactions.length === 0 ? (
                <p className="text-slate-400 text-sm py-2">No transactions yet</p>
              ) : (
                <div className="space-y-2">
                  {transactions.map((transaction) => (
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
              )}
            </div>
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
    </div>
  );
}

export default App;
