import React, { useState } from 'react';
import { GroceryItem } from '../types';
import { ShoppingBag, Check, Trash2, Copy, Plus, ExternalLink, CheckCheck } from 'lucide-react';
import { formatAmount } from '../lib/nutritionDatabase';

interface GroceryListProps {
  groceryItems: GroceryItem[];
  onTogglePurchased: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onClearPurchased: () => void;
  onClearAll: () => void;
  onAddCustomItem: (item: GroceryItem) => void;
}

export const GroceryList: React.FC<GroceryListProps> = ({
  groceryItems,
  onTogglePurchased,
  onDeleteItem,
  onClearPurchased,
  onClearAll,
  onAddCustomItem,
}) => {
  const [manualName, setManualName] = useState('');
  const [manualQty, setManualQty] = useState('1');
  const [manualUnit, setManualUnit] = useState('item');
  const [manualCategory, setManualCategory] = useState('produce');
  const [copiedFeedback, setCopiedFeedback] = useState(false);

  const handleAddManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) return;

    onAddCustomItem({
      id: `groc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: manualName.trim().toLowerCase(),
      quantity: parseFloat(manualQty) || 1,
      unit: manualUnit.trim(),
      category: manualCategory,
      recipeSource: 'Custom Item',
      purchased: false,
    });

    setManualName('');
    setManualQty('1');
  };

  const handleCopyShoppingList = () => {
    if (groceryItems.length === 0) return;

    const lines = ['--- CulinaryVault Grocery Order List ---'];
    for (const item of groceryItems) {
      lines.push(`${item.purchased ? '[X]' : '[ ]'} ${formatAmount(item.quantity)} ${item.unit} ${item.name} (${item.recipeSource || 'Pantry'})`);
    }

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedFeedback(true);
    setTimeout(() => setCopiedFeedback(false), 2000);
  };

  // Group by category
  const categories: Record<string, GroceryItem[]> = {};
  for (const item of groceryItems) {
    const cat = item.category || 'pantry';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(item);
  }

  const purchasedCount = groceryItems.filter((i) => i.purchased).length;
  const remainingCount = groceryItems.length - purchasedCount;

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-1">
            <span>Automated Grocery Order & Cart</span>
          </div>
          <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight">
            Missing Ingredients Shopping List
          </h1>
          <p className="mt-1 text-xs text-zinc-500">
            {remainingCount} items remaining · {purchasedCount} checked off
          </p>
        </div>

        {/* Top actions */}
        <div className="flex items-center gap-2">
          {groceryItems.length > 0 && (
            <>
              <button
                type="button"
                onClick={handleCopyShoppingList}
                className="px-3 py-1.5 text-xs font-semibold text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-50 rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                {copiedFeedback ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedFeedback ? 'Copied to Clipboard!' : 'Copy List'}</span>
              </button>

              {purchasedCount > 0 && (
                <button
                  type="button"
                  onClick={onClearPurchased}
                  className="px-3 py-1.5 text-xs font-semibold text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-50 rounded-lg transition-colors shadow-2xs"
                >
                  Clear Checked
                </button>
              )}

              <button
                type="button"
                onClick={onClearAll}
                className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 border border-rose-200 rounded-lg transition-colors shadow-2xs"
              >
                Clear Cart
              </button>
            </>
          )}
        </div>
      </div>

      {/* Manual add input */}
      <form onSubmit={handleAddManual} className="p-3 bg-white rounded-xl border border-zinc-200 shadow-xs flex flex-wrap gap-2 items-center">
        <input
          type="text"
          value={manualName}
          onChange={(e) => setManualName(e.target.value)}
          placeholder="Add manual item (e.g. olive oil, sea salt)..."
          className="flex-1 min-w-[200px] px-3 py-1.5 text-xs border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <input
          type="number"
          step="any"
          min="0.1"
          value={manualQty}
          onChange={(e) => setManualQty(e.target.value)}
          className="w-16 px-2 py-1.5 text-xs border border-zinc-300 rounded-lg text-center font-mono tabular-nums"
        />
        <input
          type="text"
          value={manualUnit}
          onChange={(e) => setManualUnit(e.target.value)}
          placeholder="unit"
          className="w-16 px-2 py-1.5 text-xs border border-zinc-300 rounded-lg text-center"
        />
        <select
          value={manualCategory}
          onChange={(e) => setManualCategory(e.target.value)}
          className="px-2 py-1.5 text-xs border border-zinc-300 rounded-lg text-zinc-700"
        >
          <option value="produce">Produce</option>
          <option value="protein">Protein</option>
          <option value="dairy">Dairy</option>
          <option value="pantry">Pantry</option>
          <option value="spices">Spices</option>
        </select>
        <button
          type="submit"
          className="px-4 py-1.5 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center gap-1 shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>
      </form>

      {/* Online delivery ordering quick panel */}
      {groceryItems.length > 0 && (
        <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-zinc-900 block">
              Ready to Order Grocery Delivery?
            </span>
            <span className="text-xs text-zinc-600 mt-0.5 block">
              Search missing items directly in your preferred grocery cart:
            </span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`https://www.instacart.com/store/s?k=${encodeURIComponent(
                groceryItems.filter((i) => !i.purchased).map((i) => i.name).slice(0, 5).join(' ')
              )}`}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-1.5 text-xs font-semibold text-emerald-800 bg-white border border-emerald-200 hover:bg-emerald-50 rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors"
            >
              <span>Instacart</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <a
              href={`https://www.amazon.com/s?k=${encodeURIComponent(
                groceryItems.filter((i) => !i.purchased).map((i) => i.name).slice(0, 5).join(' ') + ' grocery'
              )}`}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-1.5 text-xs font-semibold text-zinc-800 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors"
            >
              <span>Amazon Fresh</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

      {/* Grocery list groups */}
      {groceryItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center shadow-xs">
          <ShoppingBag className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-zinc-800">Your Grocery Cart is Empty</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            Choose any recipe and click "Add Missing to Cart" or use the Fridge Matcher to automatically aggregate what you need to cook.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(categories).map(([category, items]) => (
            <div key={category} className="bg-white rounded-xl border border-zinc-200 p-4 shadow-xs space-y-2">
              <div className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center justify-between pb-1 border-b border-zinc-100">
                <span className="capitalize">{category} Aisle</span>
                <span className="text-[11px] font-normal text-zinc-400 font-mono tabular-nums">
                  {items.length} {items.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              <div className="space-y-1.5 pt-1">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                      item.purchased
                        ? 'bg-zinc-50 border-zinc-200 text-zinc-400 line-through'
                        : 'bg-white border-zinc-200 text-zinc-800 hover:border-zinc-300'
                    }`}
                  >
                    <div
                      onClick={() => onTogglePurchased(item.id)}
                      className="flex items-center gap-3 cursor-pointer flex-1"
                    >
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                          item.purchased
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-zinc-300 bg-white'
                        }`}
                      >
                        {item.purchased && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>

                      <div className="flex flex-col">
                        <span className="text-sm font-medium capitalize text-zinc-900">{item.name}</span>
                        {item.recipeSource && (
                          <span className="text-[10px] text-zinc-400">
                            Needed for: {item.recipeSource}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono tabular-nums font-semibold text-xs text-zinc-800">
                        {formatAmount(item.quantity)} {item.unit}
                      </span>
                      <button
                        type="button"
                        onClick={() => onDeleteItem(item.id)}
                        className="text-zinc-400 hover:text-rose-600 p-1"
                        title="Delete from list"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
