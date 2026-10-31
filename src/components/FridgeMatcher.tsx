import React, { useState } from 'react';
import { Recipe, FridgeItem, GroceryItem } from '../types';
import { Refrigerator, Plus, Trash2, CheckCircle2, AlertTriangle, ArrowRight, ShoppingCart, Sparkles, Filter } from 'lucide-react';
import { scaleQuantity, formatAmount } from '../lib/nutritionDatabase';

interface FridgeMatcherProps {
  recipes: Recipe[];
  fridgeItems: FridgeItem[];
  onAddFridgeItem: (item: FridgeItem) => void;
  onRemoveFridgeItem: (id: string) => void;
  onAddMissingToGrocery: (items: any[]) => void;
  onSelectRecipe: (recipe: Recipe, servings: number) => void;
}

export const FridgeMatcher: React.FC<FridgeMatcherProps> = ({
  recipes,
  fridgeItems,
  onAddFridgeItem,
  onRemoveFridgeItem,
  onAddMissingToGrocery,
  onSelectRecipe,
}) => {
  // New item form state
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemUnit, setNewItemUnit] = useState('piece');
  const [newItemCategory, setNewItemCategory] = useState<'produce' | 'dairy' | 'protein' | 'pantry' | 'spices'>('produce');
  const [newItemExpiry, setNewItemExpiry] = useState('7');

  // Filter state for recipe matches
  const [filterMode, setFilterMode] = useState<'all' | 'ready' | 'almost' | 'eighty'>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [batchGroceryFeedback, setBatchGroceryFeedback] = useState<string | null>(null);

  const handleCreateFridgeItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const item: FridgeItem = {
      id: `fr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: newItemName.trim().toLowerCase(),
      quantity: parseFloat(newItemQty) || 1,
      unit: newItemUnit.trim(),
      category: newItemCategory,
      expiresInDays: parseInt(newItemExpiry, 10) || 7,
      addedAt: new Date().toISOString(),
    };

    onAddFridgeItem(item);
    setNewItemName('');
    setNewItemQty('1');
  };

  // Match analysis
  const fridgeNames = fridgeItems.map((f) => f.name.toLowerCase().trim());

  const recipeMatches = recipes.map((recipe) => {
    const total = recipe.ingredients.length;
    const inStock: string[] = [];
    const missing: any[] = [];

    for (const ing of recipe.ingredients) {
      const ingName = ing.name.toLowerCase().trim();
      const available = fridgeNames.some((fn) => fn.includes(ingName) || ingName.includes(fn));
      if (available) {
        inStock.push(ing.name);
      } else {
        missing.push(ing);
      }
    }

    const matchScore = total > 0 ? Math.round((inStock.length / total) * 100) : 0;

    return {
      recipe,
      matchScore,
      inStockCount: inStock.length,
      totalCount: total,
      inStockNames: inStock,
      missingIngredients: missing,
    };
  }).sort((a, b) => b.matchScore - a.matchScore);

  const meetsEightyPercent = (item: typeof recipeMatches[0]) =>
    item.totalCount > 0 && item.inStockCount / item.totalCount >= 0.8;

  const filteredMatches = recipeMatches.filter((item) => {
    if (filterMode === 'ready') return item.matchScore === 100;
    if (filterMode === 'almost') return item.matchScore >= 60 && item.matchScore < 100;
    if (filterMode === 'eighty') return meetsEightyPercent(item);
    return true;
  });

  const handleAddMissingForRecipe = (match: typeof recipeMatches[0]) => {
    const groceryList = match.missingIngredients.map((ing) => ({
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      category: ing.category || 'pantry',
      recipeSource: match.recipe.title,
      purchased: false,
    }));

    onAddMissingToGrocery(groceryList);
    setBatchGroceryFeedback(match.recipe.id);
    setTimeout(() => setBatchGroceryFeedback(null), 2500);
  };

  const filteredFridgeItems = selectedCategoryFilter === 'all'
    ? fridgeItems
    : fridgeItems.filter((i) => i.category === selectedCategoryFilter);

  return (
    <div className="max-w-7xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-1">
          <span>Smart Kitchen Pantry & Fridge Assistant</span>
        </div>
        <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight">
          What Can I Cook Tonight?
        </h1>
        <p className="mt-2 text-sm text-zinc-600 max-w-2xl leading-relaxed">
          CulinaryVault cross-references your current fridge inventory against your recipe repository to calculate cooking readiness and automatically build an ordered missing grocery list.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Fridge Inventory Management (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Refrigerator className="w-5 h-5 text-emerald-700" />
              <h2 className="text-base font-bold text-zinc-900">
                Pantry & Fridge Stock ({fridgeItems.length})
              </h2>
            </div>
            <span className="text-xs text-zinc-400">Items on hand</span>
          </div>

          {/* Quick Add Form */}
          <form onSubmit={handleCreateFridgeItem} className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2.5">
            <div className="text-xs font-semibold text-zinc-700">Add Available Ingredient</div>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Item name (e.g. spinach, eggs, chicken)"
                className="flex-1 px-3 py-1.5 text-xs border border-zinc-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <input
                type="number"
                step="any"
                min="0.1"
                value={newItemQty}
                onChange={(e) => setNewItemQty(e.target.value)}
                className="w-16 px-2 py-1.5 text-xs border border-zinc-300 rounded-lg bg-white text-center font-mono tabular-nums"
                placeholder="Qty"
              />
              <input
                type="text"
                value={newItemUnit}
                onChange={(e) => setNewItemUnit(e.target.value)}
                className="w-16 px-2 py-1.5 text-xs border border-zinc-300 rounded-lg bg-white text-center"
                placeholder="unit"
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <select
                  value={newItemCategory}
                  onChange={(e: any) => setNewItemCategory(e.target.value)}
                  className="px-2 py-1 text-xs border border-zinc-300 rounded-lg bg-white text-zinc-700"
                >
                  <option value="produce">Produce</option>
                  <option value="protein">Protein</option>
                  <option value="dairy">Dairy</option>
                  <option value="pantry">Pantry</option>
                  <option value="spices">Spices</option>
                </select>

                <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                  <span>Expires in:</span>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={newItemExpiry}
                    onChange={(e) => setNewItemExpiry(e.target.value)}
                    className="w-10 px-1 py-0.5 border border-zinc-300 rounded text-center text-xs font-mono tabular-nums bg-white"
                  />
                  <span>days</span>
                </div>
              </div>

              <button
                type="submit"
                className="px-3 py-1 text-xs font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors shadow-2xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </form>

          {/* Category filter pills (functional button tabs) */}
          <div className="flex flex-wrap gap-1">
            {['all', 'produce', 'protein', 'dairy', 'pantry'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategoryFilter(cat)}
                className={`px-2.5 py-1 text-xs rounded-md capitalize transition-colors ${
                  selectedCategoryFilter === cat
                    ? 'bg-zinc-900 text-white font-medium shadow-2xs'
                    : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Inventory list */}
          <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
            {filteredFridgeItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400">
                No items recorded in this category.
              </div>
            ) : (
              filteredFridgeItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 bg-zinc-50 hover:bg-zinc-100/80 rounded-lg border border-zinc-200 transition-colors text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="font-medium text-zinc-900 capitalize">{item.name}</span>
                    <span className="text-[11px] text-zinc-400">· {item.category}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono tabular-nums font-semibold text-zinc-700">
                      {item.quantity} {item.unit}
                    </span>
                    {typeof item.expiresInDays === 'number' && (
                      <span className={`text-[10px] ${item.expiresInDays <= 2 ? 'text-rose-600 font-semibold' : 'text-zinc-400'}`}>
                        {item.expiresInDays}d left
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemoveFridgeItem(item.id)}
                      className="text-zinc-400 hover:text-rose-600 p-0.5"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Recipe Match Rankings & Missing Grocery Actions (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Controls Bar */}
          <div className="flex items-center justify-between bg-white rounded-xl border border-zinc-200 p-3 shadow-xs">
            <span className="text-xs font-semibold text-zinc-700">
              Matching {filteredMatches.length} Recipes to Fridge
            </span>

            {/* Filter buttons */}
            <div className="flex flex-wrap items-center gap-1 bg-zinc-100 p-1 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1 rounded transition-colors ${
                  filterMode === 'all' ? 'bg-white text-zinc-900 shadow-2xs font-semibold' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                All ({recipeMatches.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('ready')}
                className={`px-3 py-1 rounded transition-colors ${
                  filterMode === 'ready' ? 'bg-white text-zinc-900 shadow-2xs font-semibold' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                100% Ready ({recipeMatches.filter((m) => m.matchScore === 100).length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('almost')}
                className={`px-3 py-1 rounded transition-colors ${
                  filterMode === 'almost' ? 'bg-white text-zinc-900 shadow-2xs font-semibold' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Missing 1-2 ({recipeMatches.filter((m) => m.matchScore >= 60 && m.matchScore < 100).length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('eighty')}
                className={`px-3 py-1 rounded transition-colors ${
                  filterMode === 'eighty' ? 'bg-white text-zinc-900 shadow-2xs font-semibold' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                80%+ Ingredients ({recipeMatches.filter(meetsEightyPercent).length})
              </button>
            </div>
          </div>

          {/* Match Cards */}
          <div className="space-y-4">
            {filteredMatches.length === 0 ? (
              <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center">
                <Refrigerator className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-zinc-800">No recipes match current filter</h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                  Try switching back to "All" or add more staples to your fridge stock.
                </p>
              </div>
            ) : (
              filteredMatches.map((match) => {
                const isFullMatch = match.matchScore === 100;
                const isHighMatch = match.matchScore >= 70;
                const feedbackActive = batchGroceryFeedback === match.recipe.id;

                return (
                  <div
                    key={match.recipe.id}
                    className="bg-white rounded-xl border border-zinc-200 p-5 shadow-xs hover:border-zinc-300 transition-all space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isFullMatch ? 'bg-emerald-500' : isHighMatch ? 'bg-amber-500' : 'bg-zinc-400'
                            }`}
                          />
                          <h3
                            onClick={() => onSelectRecipe(match.recipe, match.recipe.standardServings)}
                            className="text-base font-bold text-zinc-900 hover:text-emerald-700 cursor-pointer transition-colors"
                          >
                            {match.recipe.title}
                          </h3>
                        </div>
                        <div className="text-xs text-zinc-500 mt-1 flex items-center gap-2">
                          <span>{match.recipe.cuisine || 'Home Cooking'}</span>
                          <span>·</span>
                          <span className="font-mono tabular-nums">{match.recipe.nutritionPerServing.calories} kcal/serving</span>
                          <span>·</span>
                          <span className="font-mono tabular-nums text-emerald-700 font-semibold">{match.recipe.nutritionPerServing.proteinGrams}g Protein</span>
                        </div>
                      </div>

                      {/* Score Indicator */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <div className="text-sm font-bold font-mono tabular-nums text-zinc-900">
                            {match.matchScore}% Match
                          </div>
                          <div className="text-[10px] text-zinc-400 font-mono tabular-nums">
                            {match.inStockCount} of {match.totalCount} items
                          </div>
                        </div>

                        {/* Visual Ring/Bar */}
                        <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center font-bold text-xs border border-zinc-200">
                          {isFullMatch ? (
                            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                          ) : (
                            <span className="font-mono tabular-nums text-zinc-700">{match.matchScore}%</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stock breakdown */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1 border-t border-zinc-100">
                      {/* What you have */}
                      <div>
                        <span className="text-[11px] font-semibold text-emerald-800 uppercase block mb-1">
                          In Your Fridge ({match.inStockNames.length})
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {match.inStockNames.map((name, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded text-xs capitalize"
                            >
                              ✓ {name}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* What is missing */}
                      <div>
                        <span className="text-[11px] font-semibold text-amber-800 uppercase block mb-1">
                          Missing ({match.missingIngredients.length})
                        </span>
                        {match.missingIngredients.length === 0 ? (
                          <span className="text-xs text-zinc-400 italic">None! Ready to cook now.</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {match.missingIngredients.map((ing, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-100 rounded text-xs capitalize font-medium"
                              >
                                + {ing.name} ({ing.quantity} {ing.unit})
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => onSelectRecipe(match.recipe, match.recipe.standardServings)}
                        className="text-xs font-semibold text-zinc-700 hover:text-zinc-900 flex items-center gap-1"
                      >
                        <span>View Recipe & Scale Portions</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      {match.missingIngredients.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => handleAddMissingForRecipe(match)}
                          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs"
                        >
                          {feedbackActive ? (
                            <span>Added to Cart!</span>
                          ) : (
                            <>
                              <ShoppingCart className="w-3.5 h-3.5" />
                              <span>Add {match.missingIngredients.length} Missing to Grocery List</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onSelectRecipe(match.recipe, match.recipe.standardServings)}
                          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Cook This Meal Now</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
