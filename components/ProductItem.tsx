import React, { useState } from 'react';
import { ShoppingItem } from '../types';

interface Props {
  item: ShoppingItem;
  fontSize: 'sm' | 'base' | 'lg';
  onDelete: (id: string) => void;
  onUpdate: (item: ShoppingItem) => void;
}

// Diccionario de correcciones manuales para desambiguar términos de búsqueda
const SEARCH_OVERRIDES: Record<string, string> = {
  'papa': 'papa verdura hortaliza',
  'papas': 'papas verdura hortaliza',
  'batata': 'batata verdura',
  'yerba': 'yerba mate paquete',
  'facturas': 'facturas panaderia medialunas',
  'tapa': 'tapa de tarta',
  'tapas': 'tapas de empanadas',
  'galletitas': 'galletitas paquete',
  'masitas': 'galletitas dulces',
  'fibron': 'marcador fibron',
  'pila': 'pilas alcalinas',
  'pilas': 'pilas alcalinas',
  'coca': 'coca cola botella',
  'fanta': 'fanta gaseosa botella',
  'sprite': 'sprite gaseosa botella',
  'manaos': 'manaos gaseosa',
  'levite': 'levite agua saborizada',
  'cepita': 'jugo cepita',
  'tang': 'jugo tang sobre',
  'clight': 'jugo clight sobre'
};

const cleanProductName = (name: string) => {
  const stopWords = [
    'un', 'una', 'unos', 'unas', 'el', 'la', 'los', 'las', 'de', 'del', 'para', 'y', 'o', 'con', 'sin', 
    'kilo', 'kilos', 'kg', 'k', 'gramos', 'gr', 'g', 
    'litro', 'litros', 'l', 'ml', 'cc', 
    'botella', 'botellas', 'paquete', 'paquetes', 'caja', 'cajas', 'lata', 'latas', 'bolsa', 'bolsas', 
    'unidad', 'unidades', 'docena', 'docenas'
  ];

  let cleaned = name.toLowerCase();
  cleaned = cleaned.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  cleaned = cleaned.replace(/[^a-z\s]/g, '');
  const words = cleaned.split(/\s+/).filter(w => w.length > 1 && !stopWords.includes(w));
  if (words.length === 0) return name.split(' ')[0].toLowerCase();
  return words.join(' ');
};

export const ProductItem: React.FC<Props> = ({ item, fontSize, onDelete, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [editQty, setEditQty] = useState(item.quantity || '');
  const [editCost, setEditCost] = useState(item.cost !== undefined ? item.cost.toString() : '');
  const [editCurrency, setEditCurrency] = useState<'ARS' | 'USD'>(item.currency || 'ARS');
  const [imgError, setImgError] = useState(false);

  const dateStr = new Date(item.timestamp).toLocaleString('es-AR', {
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit'
  });

  let query = cleanProductName(item.name);
  if (SEARCH_OVERRIDES[query]) {
      query = SEARCH_OVERRIDES[query];
  }
  
  const imageUrl = `https://tse2.mm.bing.net/th?q=${encodeURIComponent(query)}&w=120&h=120&c=7&rs=1`;

  const handleSave = () => {
    onUpdate({
      ...item,
      name: editName,
      quantity: editQty,
      cost: editCost ? parseFloat(editCost) : undefined,
      currency: editCurrency
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditName(item.name);
    setEditQty(item.quantity || '');
    setEditCost(item.cost !== undefined ? item.cost.toString() : '');
    setEditCurrency(item.currency || 'ARS');
    setIsEditing(false);
  };

  // Font size classes mapping
  const getTitleSize = () => {
    switch (fontSize) {
      case 'sm': return 'text-base';
      case 'lg': return 'text-xl';
      default: return 'text-lg'; // base
    }
  };

  const getNoteSize = () => {
    switch (fontSize) {
      case 'sm': return 'text-xs';
      case 'lg': return 'text-base';
      default: return 'text-sm'; // base
    }
  };

  if (isEditing) {
    return (
      <div className="p-3 mb-2 bg-white dark:bg-slate-800 rounded-xl shadow-md border border-indigo-100 dark:border-slate-700 flex flex-col gap-2 transition-colors duration-300">
        <div className="flex gap-2">
          <input 
            type="text" 
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Producto"
            className="flex-1 p-2 border border-slate-200 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:border-indigo-500 outline-none"
            autoFocus
          />
          <div className="flex border border-slate-200 dark:border-slate-600 rounded overflow-hidden">
             <select 
               value={editCurrency}
               onChange={(e) => setEditCurrency(e.target.value as 'ARS' | 'USD')}
               className="bg-slate-50 dark:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm px-1 outline-none"
             >
               <option value="ARS">$</option>
               <option value="USD">u$s</option>
             </select>
             <input 
              type="number" 
              value={editCost}
              onChange={(e) => setEditCost(e.target.value)}
              placeholder="0.00"
              className="w-20 p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:border-indigo-500 outline-none"
            />
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <input 
            type="text" 
            value={editQty}
            onChange={(e) => setEditQty(e.target.value)}
            placeholder="Cant. / Nota"
            className="flex-1 p-2 border border-slate-200 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:border-indigo-500 outline-none"
          />
          <button onClick={handleCancel} className="p-2 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 rounded hover:bg-slate-200 dark:hover:bg-slate-600">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
               <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
             </svg>
          </button>
          <button onClick={handleSave} className="p-2 text-white bg-green-500 rounded hover:bg-green-600 dark:hover:bg-green-400">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
               <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
             </svg>
          </button>
        </div>
      </div>
    );
  }

  const isUSD = item.currency === 'USD';
  const currencySymbol = isUSD ? 'u$s' : '$';

  return (
    <div className={`flex items-start justify-between p-3 mb-2 rounded-xl shadow-sm border transition-all duration-300 ${item.bought ? 'opacity-60 bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}>
      <div className="flex items-start gap-3 flex-1 overflow-hidden">
        {/* Toggle Bought */}
        <div 
          onClick={() => onUpdate({ ...item, bought: !item.bought })}
          className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 cursor-pointer transition-colors ${item.bought ? 'bg-green-500 border-green-500' : 'border-slate-300 dark:border-slate-500'}`}
        >
          {item.bought && (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </div>

        {/* Product Image (Bing Thumbnails) */}
        <div className="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 flex items-center justify-center">
           {!imgError ? (
             <img 
               src={imageUrl} 
               alt={item.name}
               className="w-full h-full object-cover"
               loading="lazy"
               onError={() => setImgError(true)}
             />
           ) : (
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-300 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
             </svg>
           )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold leading-tight line-clamp-4 ${getTitleSize()} ${item.bought ? 'line-through text-slate-500 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'}`}>
            {item.name}
          </h3>
          <div className="flex flex-col gap-0.5 mt-1">
            {item.quantity && (
              <p className={`${getNoteSize()} text-slate-500 dark:text-slate-400 line-clamp-2`}>{item.quantity}</p>
            )}
            <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
               <span>{dateStr}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col items-end gap-2 ml-2 flex-shrink-0">
        <div className="text-right">
          {item.cost !== undefined ? (
            <span className={`block font-bold px-2 py-1 rounded-md text-sm ${isUSD ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30' : 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30'}`}>
              {currencySymbol} {item.cost.toFixed(2)}
            </span>
          ) : (
            <span className="text-xs text-slate-400 dark:text-slate-600 italic px-1">--</span>
          )}
        </div>

        <div className="flex gap-1">
          <button 
            onClick={() => setIsEditing(true)} 
            className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded"
            title="Editar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button 
            onClick={() => onDelete(item.id)} 
            className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
            title="Eliminar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};