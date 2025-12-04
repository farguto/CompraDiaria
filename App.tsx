import React, { useState, useEffect, useMemo } from 'react';
import { ProductItem } from './components/ProductItem';
import { Visualizer } from './components/Visualizer';
import { useLiveSession } from './hooks/useLiveSession';
import { ShoppingItem, ConnectionState, ShoppingList } from './types';
import { Auth } from './components/Auth';
import { auth } from './services/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Multiple Lists State
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [activeListId, setActiveListId] = useState<string>('');

  // Derived state for current list items
  const activeList = useMemo(() => lists.find(l => l.id === activeListId), [lists, activeListId]);
  const currentItems = activeList?.items || [];
  
  // Real-time Clock
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  // History Tab State
  const [historyView, setHistoryView] = useState<'day' | 'week' | 'month'>('month');

  // Font Size Preference
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>(() => {
    try {
      const saved = localStorage.getItem('vocalshop-fontsize');
      return (saved as 'sm' | 'base' | 'lg') || 'base';
    } catch {
      return 'base';
    }
  });

  useEffect(() => {
    localStorage.setItem('vocalshop-fontsize', fontSize);
  }, [fontSize]);

  // Advanced Expenses Calculation (Daily, Weekly, Monthly) - Based on ACTIVE LIST
  const expenseStats = useMemo(() => {
    const daily: Record<string, { ars: number, usd: number }> = {};
    const weekly: Record<string, { ars: number, usd: number }> = {};
    const monthly: Record<string, { ars: number, usd: number }> = {};

    const boughtItems = currentItems.filter(i => i.bought);

    boughtItems.forEach(item => {
        const date = new Date(item.timestamp);
        const cost = item.cost || 0;
        const isUSD = item.currency === 'USD';

        // 1. Daily Key: "15 de Sep"
        const dayKey = date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
        if (!daily[dayKey]) daily[dayKey] = { ars: 0, usd: 0 };
        if (isUSD) daily[dayKey].usd += cost; else daily[dayKey].ars += cost;

        // 2. Weekly Key: "Semana del 12/09"
        // Calculate Monday of the week
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        const monday = new Date(d.setDate(diff));
        const weekKey = `Semana del ${monday.getDate()}/${monday.getMonth() + 1}`;
        
        if (!weekly[weekKey]) weekly[weekKey] = { ars: 0, usd: 0 };
        if (isUSD) weekly[weekKey].usd += cost; else weekly[weekKey].ars += cost;

        // 3. Monthly Key: "Septiembre 2025"
        const monthName = date.toLocaleString('es-AR', { month: 'long', year: 'numeric' });
        const monthKey = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        
        if (!monthly[monthKey]) monthly[monthKey] = { ars: 0, usd: 0 };
        if (isUSD) monthly[monthKey].usd += cost; else monthly[monthKey].ars += cost;
    });

    return {
        day: Object.entries(daily).reverse(),
        week: Object.entries(weekly).reverse(),
        month: Object.entries(monthly).reverse()
    };
  }, [currentItems]);

  // Listen for auth state changes
  useEffect(() => {
    if (!auth) {
        setAuthLoading(false);
        return;
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Initialize/Load lists when user changes
  useEffect(() => {
    if (user) {
        try {
            const listKey = `vocalshop-lists-${user.uid}`;
            const savedLists = localStorage.getItem(listKey);

            if (savedLists) {
                const parsedLists = JSON.parse(savedLists);
                if (parsedLists.length > 0) {
                    setLists(parsedLists);
                    setActiveListId(parsedLists[0].id);
                } else {
                    // Initialize default
                    const defaultList: ShoppingList = { id: crypto.randomUUID(), name: 'Lista Principal', items: [], createdAt: Date.now() };
                    setLists([defaultList]);
                    setActiveListId(defaultList.id);
                }
            } else {
                // MIGRATION LOGIC: Check for old items format
                const oldKey = `vocalshop-items-${user.uid}`;
                const oldItems = localStorage.getItem(oldKey);
                
                let initialItems: ShoppingItem[] = [];
                if (oldItems) {
                    initialItems = JSON.parse(oldItems);
                }

                const defaultList: ShoppingList = { 
                    id: crypto.randomUUID(), 
                    name: 'Lista Principal', 
                    items: initialItems, 
                    createdAt: Date.now() 
                };
                setLists([defaultList]);
                setActiveListId(defaultList.id);
            }
        } catch (e) {
            console.error("Failed to load lists", e);
            const defaultList: ShoppingList = { id: crypto.randomUUID(), name: 'Lista Principal', items: [], createdAt: Date.now() };
            setLists([defaultList]);
            setActiveListId(defaultList.id);
        }
    } else {
        setLists([]);
        setActiveListId('');
    }
  }, [user]);

  // Save lists to local storage
  useEffect(() => {
    if (user && !authLoading && lists.length > 0) {
        const key = `vocalshop-lists-${user.uid}`;
        localStorage.setItem(key, JSON.stringify(lists));
    }
  }, [lists, user, authLoading]);


  // Initialize Dark Mode from localstorage
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('vocalshop-darkmode');
      return saved ? JSON.parse(saved) : true;
    } catch (e) {
      return true;
    }
  });

  const [showInfo, setShowInfo] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteListConfirm, setShowDeleteListConfirm] = useState(false);
  const [isReading, setIsReading] = useState(false);
  
  // Manual Add States
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualQty, setManualQty] = useState('');
  const [manualCost, setManualCost] = useState('');
  const [manualCurrency, setManualCurrency] = useState<'ARS' | 'USD'>('ARS');
  
  // List Management States
  const [showNewListModal, setShowNewListModal] = useState(false);
  const [newListName, setNewListName] = useState('');

  // Handle Dark Mode changes
  useEffect(() => {
    localStorage.setItem('vocalshop-darkmode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Adapter for setItems to support multiple lists structure
  const handleSetItems = (action: React.SetStateAction<ShoppingItem[]>) => {
    setLists(prevLists => {
        return prevLists.map(list => {
            if (list.id !== activeListId) return list;
            
            const newItems = typeof action === 'function' 
                ? (action as Function)(list.items) 
                : action;
            
            return { ...list, items: newItems };
        });
    });
  };

  const { connect, disconnect, connectionState, isTalking } = useLiveSession({ 
      items: currentItems, 
      setItems: handleSetItems 
  });

  // Calculate totals for active list
  const totalARS = currentItems.reduce((sum, item) => sum + (item.currency !== 'USD' ? (item.cost || 0) : 0), 0);
  const totalUSD = currentItems.reduce((sum, item) => sum + (item.currency === 'USD' ? (item.cost || 0) : 0), 0);
  const remainingCount = currentItems.filter(i => !i.bought).length;

  const handleSignOut = () => {
      disconnect(); // Ensure voice is disconnected
      if(auth) signOut(auth);
  };

  const handleCreateList = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newListName.trim()) return;
      
      const newList: ShoppingList = {
          id: crypto.randomUUID(),
          name: newListName.trim(),
          items: [],
          createdAt: Date.now()
      };
      
      setLists(prev => [...prev, newList]);
      setActiveListId(newList.id);
      setNewListName('');
      setShowNewListModal(false);
  };

  const handleDeleteList = () => {
      if (lists.length <= 1) return; // Prevent deleting last list
      
      const newLists = lists.filter(l => l.id !== activeListId);
      setLists(newLists);
      setActiveListId(newLists[0].id); // Switch to another list
      setShowDeleteListConfirm(false);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) return;

    const newItem: ShoppingItem = {
      id: crypto.randomUUID(),
      name: manualName.trim().charAt(0).toUpperCase() + manualName.trim().slice(1),
      quantity: manualQty.trim(),
      cost: manualCost ? parseFloat(manualCost) : undefined,
      currency: manualCurrency,
      bought: !!manualCost, 
      timestamp: Date.now()
    };

    handleSetItems(prev => [...prev, newItem]);
    
    // Reset and close
    setManualName('');
    setManualQty('');
    setManualCost('');
    setManualCurrency('ARS');
    setShowManualAdd(false);
  };

  if (authLoading) {
      return (
          <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
      );
  }

  if (!user) {
      return <Auth />;
  }

  const handleToggleConnection = () => {
    if (connectionState === ConnectionState.CONNECTED || connectionState === ConnectionState.CONNECTING) {
      disconnect();
    } else {
      connect();
    }
  };

  const handleClearAll = () => {
    setShowDeleteConfirm(true);
  };

  const confirmClearAll = () => {
    handleSetItems([]);
    setShowDeleteConfirm(false);
  };

  const handleDeleteItem = (id: string) => {
    handleSetItems(prev => prev.filter(item => item.id !== id));
  };

  const handleUpdateItem = (updatedItem: ShoppingItem) => {
    handleSetItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
  };

  const handleReadList = () => {
    if ('speechSynthesis' in window) {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        setIsReading(false);
        return;
      }

      setIsReading(true);

      const toBuy = currentItems.filter(i => !i.bought);
      const spentItems = currentItems.filter(i => i.bought);
      
      const spentARS = spentItems.reduce((acc, i) => acc + (i.currency !== 'USD' ? (i.cost || 0) : 0), 0);
      const spentUSD = spentItems.reduce((acc, i) => acc + (i.currency === 'USD' ? (i.cost || 0) : 0), 0);

      let text = "";

      if (toBuy.length === 0 && spentItems.length === 0) {
        text = `La lista ${activeList?.name} está vacía.`;
      } else {
        if (toBuy.length > 0) {
          text += `En ${activeList?.name} te falta comprar: `;
          const itemTexts = toBuy.map(item => {
            let itemText = item.name;
            if (item.quantity && item.quantity.trim() !== '') itemText += `, ${item.quantity}`;
            return itemText;
          });
          text += itemTexts.join(". ");
          text += ". ";
        } else {
          text += "¡Bien ahí! Ya compraste todo lo de esta lista. ";
        }

        if (spentARS > 0 || spentUSD > 0) {
          text += `En total llevás gastados: `;
          if (spentARS > 0) text += `${spentARS} pesos. `;
          if (spentUSD > 0) text += `${spentUSD} dólares. `;
        }
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-AR';
      utterance.onend = () => setIsReading(false);
      utterance.onerror = () => setIsReading(false);
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Tu navegador es medio viejo, no banca lectura de texto.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-56 relative transition-colors duration-300">
      
      {/* Account Info Modal */}
      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 zoom-in-95 flex flex-col">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Información de la Cuenta</h2>
            <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300 flex-1">
              <p>
                <strong>👤 Usuario:</strong> {user.displayName || user.email}
              </p>
              <p>
                <strong>📧 Email:</strong> {user.email}
              </p>
            </div>

            {/* Font Size Settings */}
            <div className="mt-6 mb-2">
               <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Tamaño de letra de productos</h3>
               <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
                  <button 
                     onClick={() => setFontSize('sm')}
                     className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${fontSize === 'sm' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                  >
                     Chica
                  </button>
                  <button 
                     onClick={() => setFontSize('base')}
                     className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${fontSize === 'base' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                  >
                     Normal
                  </button>
                  <button 
                     onClick={() => setFontSize('lg')}
                     className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${fontSize === 'lg' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                  >
                     Grande
                  </button>
               </div>
            </div>
            
            <button 
              onClick={handleSignOut}
              className="mt-6 w-full py-2 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 rounded-lg font-medium transition-colors"
            >
              Cerrar Sesión
            </button>

            <button 
              onClick={() => setShowInfo(false)}
              className="mt-3 w-full py-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Volver a la App
            </button>
          </div>
        </div>
      )}

      {/* New List Modal */}
      {showNewListModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 zoom-in-95">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Nueva Lista</h2>
              <form onSubmit={handleCreateList} className="space-y-4">
                 <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Nombre de la lista</label>
                    <input 
                       type="text" 
                       value={newListName}
                       onChange={(e) => setNewListName(e.target.value)}
                       placeholder="Ej: Cumpleaños, Navidad..."
                       className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                       autoFocus
                    />
                 </div>
                 <div className="flex gap-3 pt-2">
                    <button 
                      type="button"
                      onClick={() => setShowNewListModal(false)}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-medium"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      disabled={!newListName.trim()}
                      className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium shadow-lg disabled:opacity-50"
                    >
                      Crear
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Delete List Confirm Modal */}
      {showDeleteListConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-sm w-full p-6 zoom-in-95">
             <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">¿Borrar lista "{activeList?.name}"?</h3>
             <p className="text-slate-500 dark:text-slate-400 mb-6">
               Se borrarán todos los items de esta lista. Esta acción no se puede deshacer.
             </p>
             <div className="flex gap-3">
               <button 
                 onClick={() => setShowDeleteListConfirm(false)}
                 className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-medium"
               >
                 Cancelar
               </button>
               <button 
                 onClick={handleDeleteList}
                 className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium shadow-lg"
               >
                 Borrar Lista
               </button>
             </div>
          </div>
        </div>
      )}

      {/* Manual Add Modal */}
      {showManualAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 zoom-in-95">
             <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Agregar a mano</h2>
             
             <form onSubmit={handleManualSubmit} className="space-y-4">
                <div>
                   <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Producto</label>
                   <input 
                      type="text" 
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      placeholder="Ej: Pan, Leche..."
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                      autoFocus
                   />
                </div>

                <div>
                   <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Cantidad / Nota</label>
                   <input 
                      type="text" 
                      value={manualQty}
                      onChange={(e) => setManualQty(e.target.value)}
                      placeholder="Ej: 2 unidades, 1kg..."
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                   />
                </div>

                <div className="flex gap-2">
                   <div className="flex-1">
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Precio (Opcional)</label>
                      <input 
                          type="number" 
                          value={manualCost}
                          onChange={(e) => setManualCost(e.target.value)}
                          placeholder="0.00"
                          className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                      />
                   </div>
                   <div className="w-24">
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Moneda</label>
                      <select 
                         value={manualCurrency}
                         onChange={(e) => setManualCurrency(e.target.value as 'ARS' | 'USD')}
                         className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                      >
                         <option value="ARS">ARS</option>
                         <option value="USD">USD</option>
                      </select>
                   </div>
                </div>

                <div className="pt-2 flex gap-3">
                   <button 
                     type="button"
                     onClick={() => setShowManualAdd(false)}
                     className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-medium transition-colors"
                   >
                     Cancelar
                   </button>
                   <button 
                     type="submit"
                     disabled={!manualName.trim()}
                     className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium shadow-lg shadow-indigo-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     Agregar
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* History / Expenses Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 zoom-in-95 flex flex-col max-h-[85vh]">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              📅 Historial: {activeList?.name}
            </h2>
            
            {/* Tabs */}
            <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl mb-4">
                <button 
                  onClick={() => setHistoryView('day')}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${historyView === 'day' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                >
                    Día
                </button>
                <button 
                  onClick={() => setHistoryView('week')}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${historyView === 'week' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                >
                    Semana
                </button>
                <button 
                  onClick={() => setHistoryView('month')}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${historyView === 'month' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                >
                    Mes
                </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {expenseStats[historyView].length === 0 ? (
                <p className="text-center text-slate-500 dark:text-slate-400 py-8">
                  Todavía no compraste nada en esta lista che.
                </p>
              ) : (
                expenseStats[historyView].map(([period, totals]) => (
                  <div key={period} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
                    <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-2">{period}</h3>
                    <div className="flex justify-between items-center text-sm">
                       <span className="text-slate-500 dark:text-slate-400">Pesos:</span>
                       <span className="font-bold text-slate-800 dark:text-white">${totals.ars.toLocaleString('es-AR')}</span>
                    </div>
                    {totals.usd > 0 && (
                      <div className="flex justify-between items-center text-sm mt-1">
                         <span className="text-slate-500 dark:text-slate-400">Dólares:</span>
                         <span className="font-bold text-emerald-600 dark:text-emerald-400">u$s {totals.usd.toLocaleString('es-AR')}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <button 
              onClick={() => setShowHistory(false)}
              className="mt-6 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium shadow-lg shadow-indigo-500/30 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Privacy/Credits Modal */}
      {showPrivacy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 zoom-in-95 flex flex-col">
            <div className="text-center mb-6">
               <h2 className="text-xl font-bold text-slate-800 dark:text-white">Uso de Datos y Voz</h2>
            </div>
            
            <div className="space-y-5 text-sm">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                   </svg>
                </div>
                <div>
                   <h3 className="font-semibold text-slate-800 dark:text-slate-100">Inteligencia Artificial</h3>
                   <p className="text-slate-500 dark:text-slate-400 mt-1">
                     Usamos la API de Gemini (Google) para procesar tu voz.
                   </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                   </svg>
                </div>
                <div>
                   <h3 className="font-semibold text-slate-800 dark:text-slate-100">Autenticación Segura</h3>
                   <p className="text-slate-500 dark:text-slate-400 mt-1">
                     Usamos Google Firebase para que puedas iniciar sesión de forma segura.
                   </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                   </svg>
                </div>
                <div>
                   <h3 className="font-semibold text-slate-800 dark:text-slate-100">Almacenamiento Local</h3>
                   <p className="text-slate-500 dark:text-slate-400 mt-1">
                     Tu lista de compras se guarda únicamente en tu dispositivo.
                   </p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 text-center">
               <p className="text-sm font-medium text-slate-400 dark:text-slate-500">
                 Creado por Federico Arguto
               </p>
            </div>

            <button 
              onClick={() => setShowPrivacy(false)}
              className="mt-6 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium shadow-lg shadow-indigo-500/30 transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Empty List) */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-sm w-full p-6 zoom-in-95">
             <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">¿Vaciar {activeList?.name}?</h3>
             <p className="text-slate-500 dark:text-slate-400 mb-6">
               Se borrarán todos los productos de esta lista.
             </p>
             <div className="flex gap-3">
               <button 
                 onClick={() => setShowDeleteConfirm(false)}
                 className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-medium"
               >
                 Cancelar
               </button>
               <button 
                 onClick={confirmClearAll}
                 className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium shadow-lg"
               >
                 Sí, borrar
               </button>
             </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-all">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                 </svg>
               </div>
               <div>
                  <h1 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">CompraDiaria</h1>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                     <span>{now.toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'})}</span>
                     <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                     <span>{now.toLocaleDateString('es-AR', {weekday: 'short', day: 'numeric'})}</span>
                  </p>
               </div>
            </div>
            
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setShowHistory(true)}
                className="p-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                title="Historial de Gastos"
              >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                 </svg>
              </button>
              <button 
                onClick={handleReadList}
                className={`p-2 rounded-lg transition-colors ${isReading ? 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-900/30' : 'text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'}`}
                title="Leer lista"
              >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                 </svg>
              </button>
              <button 
                onClick={() => setShowInfo(true)}
                className="ml-1 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-sm font-bold text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-600"
              >
                 {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}
              </button>
            </div>
          </div>

          {/* List Selector Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              <select 
                  value={activeListId}
                  onChange={(e) => setActiveListId(e.target.value)}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white text-sm font-semibold py-2 px-3 rounded-xl border border-transparent focus:border-indigo-500 outline-none appearance-none truncate"
                  style={{ backgroundImage: 'none' }}
              >
                  {lists.map(list => (
                      <option key={list.id} value={list.id}>{list.name}</option>
                  ))}
              </select>
              
              <button 
                  onClick={() => setShowNewListModal(true)}
                  className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                  title="Nueva Lista"
              >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
              </button>
              
              {lists.length > 1 && (
                  <button 
                    onClick={() => setShowDeleteListConfirm(true)}
                    className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                    title="Borrar Lista Actual"
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                         <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                  </button>
              )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto p-4">
        {currentItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
             <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
               </svg>
             </div>
             <p className="text-lg font-medium text-slate-600 dark:text-slate-300">
                Tu lista "{activeList?.name}" está vacía
             </p>
             <p className="text-sm text-slate-400 max-w-[250px]">
               Tocá el micrófono y decí algo como "Agregá papas" o "Compré leche por 2000 pesos".
             </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {currentItems.slice().reverse().map(item => (
                <ProductItem 
                  key={item.id} 
                  item={item} 
                  fontSize={fontSize}
                  onDelete={handleDeleteItem}
                  onUpdate={handleUpdateItem}
                />
              ))}
            </div>
            
            {/* Footer List Actions: Delete All */}
            <div className="mt-8 mb-4 text-center">
              <p className="text-sm text-slate-400 mb-3">
                 {remainingCount > 0 ? `Te faltan ${remainingCount} productos` : '¡Completaste esta lista!'}
              </p>
              <button
                onClick={handleClearAll}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Vaciar lista "{activeList?.name}"
              </button>
            </div>
          </>
        )}
      </main>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 pb-safe z-40">
         <div className="max-w-md mx-auto px-4 py-3">
            
            {/* Totals */}
            <div className="flex justify-between items-center mb-4 px-2">
               <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">Total Estimado</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-slate-800 dark:text-white">${totalARS}</span>
                    {totalUSD > 0 && (
                       <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">+ u$s {totalUSD}</span>
                    )}
                  </div>
               </div>
               <div className="text-right">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">Faltan</p>
                  <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{remainingCount}</p>
               </div>
            </div>

            {/* Mic and Add Buttons */}
            <div className="flex justify-center items-center relative">
               <button
                 onClick={handleToggleConnection}
                 className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${
                   connectionState === ConnectionState.CONNECTED
                     ? 'bg-red-500 hover:bg-red-600 shadow-red-500/40'
                     : connectionState === ConnectionState.CONNECTING
                     ? 'bg-amber-400 hover:bg-amber-500 shadow-amber-400/40'
                     : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/40'
                 }`}
               >
                 {connectionState === ConnectionState.CONNECTED ? (
                   isTalking ? (
                     <Visualizer isActive={true} />
                   ) : (
                     <div className="w-6 h-6 bg-white rounded-sm"></div>
                   )
                 ) : connectionState === ConnectionState.CONNECTING ? (
                    <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                 ) : (
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                   </svg>
                 )}
               </button>

               {/* Manual Add Button */}
               <button 
                  onClick={() => setShowManualAdd(true)}
                  className="absolute right-4 p-3 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors"
                  title="Agregar manualmente"
               >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
               </button>
            </div>
            
            <p className="text-center text-xs text-slate-400 mt-2 font-medium">
               {connectionState === ConnectionState.CONNECTED 
                 ? (isTalking ? 'Escuchando...' : 'Hablale a Gemini...') 
                 : 'Tocá para hablar'}
            </p>
         </div>
      </div>
    </div>
  );
};

export default App;