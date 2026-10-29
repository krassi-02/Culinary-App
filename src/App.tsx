import React, { useState, useEffect } from 'react';
import { Recipe, FridgeItem, GroceryItem } from './types';
import { INITIAL_RECIPES, INITIAL_FRIDGE_ITEMS } from './data/defaultRecipes';
import { Navbar, ActiveTab } from './components/Navbar';
import { RecipeCard } from './components/RecipeCard';
import { RecipeDetailModal } from './components/RecipeDetailModal';
import { RecipeEditorModal } from './components/RecipeEditorModal';
import { IngestionHub } from './components/IngestionHub';
import { FridgeMatcher } from './components/FridgeMatcher';
import { GroceryList } from './components/GroceryList';
import { McpConsole } from './components/McpConsole';
import { UserProfileModal } from './components/UserProfileModal';
import {
  auth,
  testConnection,
  ensureUserProfileExists,
  UserProfileData,
} from './lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { Search, Filter, Plus, Sparkles, ChefHat, CheckCircle2, ArrowRight } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('recipes');
  const [recipes, setRecipes] = useState<Recipe[]>(INITIAL_RECIPES);
  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>(INITIAL_FRIDGE_ITEMS);
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([]);

  // User Profile & Firebase Auth
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [cuisineFilter, setCuisineFilter] = useState('all');
  const [macroFilter, setMacroFilter] = useState<'all' | 'high-protein' | 'low-carb' | 'low-cal'>('all');

  // Modals state
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [modalServings, setModalServings] = useState<number>(2);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingDraft, setEditingDraft] = useState<Partial<Recipe> | undefined>(undefined);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. Initialize Firestore connection test & Auth listener
  useEffect(() => {
    testConnection().then((connected) => {
      if (connected) {
        console.log('Firestore database connection verified.');
      }
    });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const profile = await ensureUserProfileExists(user);
          setUserProfile(profile);
          if (profile.defaultServings) {
            setModalServings(profile.defaultServings);
          }
          showToast(`Welcome back, ${profile.displayName || 'Chef'}!`);
        } catch (e: any) {
          console.error('Failed to load profile:', e);
        }
      } else {
        setUserProfile(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Sync with backend API on mount
  useEffect(() => {
    fetch('/api/recipes')
      .then((res) => res.json())
      .then((data) => {
        if (data.recipes && data.recipes.length > 0) {
          setRecipes(data.recipes);
        }
      })
      .catch(() => {});

    fetch('/api/fridge')
      .then((res) => res.json())
      .then((data) => {
        if (data.fridge && data.fridge.length > 0) {
          setFridgeItems(data.fridge);
        }
      })
      .catch(() => {});

    fetch('/api/grocery')
      .then((res) => res.json())
      .then((data) => {
        if (data.grocery) {
          setGroceryItems(data.grocery);
        }
      })
      .catch(() => {});
  }, []);

  // Save recipe
  const handleSaveRecipe = async (recipe: Recipe) => {
    const existingIndex = recipes.findIndex((r) => r.id === recipe.id);
    let updated: Recipe[];

    if (existingIndex >= 0) {
      updated = [...recipes];
      updated[existingIndex] = recipe;
      fetch(`/api/recipes/${recipe.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipe),
      }).catch(() => {});
    } else {
      updated = [recipe, ...recipes];
      fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipe),
      }).catch(() => {});
    }

    setRecipes(updated);
    setIsEditorOpen(false);
    setEditingDraft(undefined);
    showToast(`Recipe "${recipe.title}" saved!`);
  };

  // Batch Save Recipes (e.g. from browser bookmark export)
  const handleBatchSaveRecipes = (newRecipes: Recipe[]) => {
    if (newRecipes.length === 0) return;
    setRecipes((prev) => [...newRecipes, ...prev]);
    for (const r of newRecipes) {
      fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(r),
      }).catch(() => {});
    }
    showToast(`Imported ${newRecipes.length} bookmark recipes into your collection!`);
    setActiveTab('recipes');
  };

  // Delete recipe
  const handleDeleteRecipe = (id: string) => {
    setRecipes(recipes.filter((r) => r.id !== id));
    fetch(`/api/recipes/${id}`, { method: 'DELETE' }).catch(() => {});
    showToast('Recipe deleted.');
  };

  // Add items to grocery cart
  const handleAddItemsToGrocery = (items: any[]) => {
    const newItems: GroceryItem[] = items.map((it) => ({
      id: `groc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: it.name,
      quantity: it.quantity,
      unit: it.unit,
      category: it.category || 'pantry',
      recipeSource: it.recipeSource || 'Recipe Match',
      purchased: false,
    }));

    setGroceryItems((prev) => [...prev, ...newItems]);
    fetch('/api/grocery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItems),
    }).catch(() => {});

    showToast(`Added ${newItems.length} items to your grocery cart!`);
  };

  // Toggle grocery purchased
  const handleToggleGroceryPurchased = (id: string) => {
    setGroceryItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, purchased: !item.purchased };
          fetch(`/api/grocery/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ purchased: updated.purchased }),
          }).catch(() => {});
          return updated;
        }
        return item;
      })
    );
  };

  // Delete single grocery item
  const handleDeleteGroceryItem = (id: string) => {
    setGroceryItems((prev) => prev.filter((i) => i.id !== id));
    fetch(`/api/grocery/${id}`, { method: 'DELETE' }).catch(() => {});
  };

  // Clear purchased grocery items
  const handleClearPurchasedGrocery = () => {
    setGroceryItems((prev) => prev.filter((i) => !i.purchased));
    fetch('/api/grocery?clearPurchasedOnly=true', { method: 'DELETE' }).catch(() => {});
    showToast('Cleared purchased items.');
  };

  // Clear all grocery items
  const handleClearAllGrocery = () => {
    setGroceryItems([]);
    fetch('/api/grocery', { method: 'DELETE' }).catch(() => {});
    showToast('Grocery cart emptied.');
  };

  // Add fridge item
  const handleAddFridgeItem = (item: FridgeItem) => {
    setFridgeItems((prev) => [...prev, item]);
    fetch('/api/fridge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    }).catch(() => {});
    showToast(`Added ${item.name} to fridge.`);
  };

  // Remove fridge item
  const handleRemoveFridgeItem = (id: string) => {
    setFridgeItems((prev) => prev.filter((f) => f.id !== id));
    fetch(`/api/fridge/${id}`, { method: 'DELETE' }).catch(() => {});
  };

  // Recipe selection
  const handleSelectRecipe = (recipe: Recipe, servings: number) => {
    setSelectedRecipe(recipe);
    setModalServings(servings);
  };

  // Calculate fridge match score for a recipe
  const fridgeNames = fridgeItems.map((f) => f.name.toLowerCase().trim());
  const calculateMatch = (recipe: Recipe): number => {
    if (recipe.ingredients.length === 0) return 0;
    let inStock = 0;
    for (const ing of recipe.ingredients) {
      const name = ing.name.toLowerCase().trim();
      if (fridgeNames.some((fn) => fn.includes(name) || name.includes(fn))) {
        inStock++;
      }
    }
    return Math.round((inStock / recipe.ingredients.length) * 100);
  };

  // Filter recipes
  const filteredRecipes = recipes.filter((r) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = r.title.toLowerCase().includes(q);
      const matchDesc = r.description.toLowerCase().includes(q);
      const matchIng = r.ingredients.some((i) => i.name.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchIng) return false;
    }

    if (cuisineFilter !== 'all') {
      if (r.cuisine?.toLowerCase() !== cuisineFilter.toLowerCase()) return false;
    }

    if (macroFilter === 'high-protein') {
      if (r.nutritionPerServing.proteinGrams < 30) return false;
    } else if (macroFilter === 'low-carb') {
      if (r.nutritionPerServing.carbsGrams > 30) return false;
    } else if (macroFilter === 'low-cal') {
      if (r.nutritionPerServing.calories > 500) return false;
    }

    return true;
  });

  // Extract unique cuisines
  const availableCuisines = Array.from(new Set(recipes.map((r) => r.cuisine).filter(Boolean))) as string[];

  return (
    <div className="min-h-screen bg-[#fbfbf9] text-zinc-900 flex flex-col font-sans">
      {/* Top Bar Navigation with User Profile Trigger */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenNewRecipe={() => {
          setEditingDraft(undefined);
          setIsEditorOpen(true);
        }}
        onOpenProfile={() => setIsProfileOpen(true)}
        currentUser={currentUser}
        profileName={userProfile?.displayName}
        recipeCount={recipes.length}
        groceryCount={groceryItems.filter((i) => !i.purchased).length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* TAB 1: RECIPES REPOSITORY */}
        {activeTab === 'recipes' && (
          <div className="space-y-6">
            {/* Hero / Filter Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-zinc-200">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                    Recipe Repository
                  </h1>
                  {userProfile && (
                    <span className="text-xs text-emerald-800 font-medium bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                      Profile Active: {userProfile.displayName}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Standardized vault of your saved recipes with dynamic serving proportions and macro calculations
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('ingest')}
                  className="px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Import from URL or Pin</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('fridge')}
                  className="px-3.5 py-2 text-xs font-semibold text-zinc-700 bg-white hover:bg-zinc-50 border border-zinc-300 rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  <span>Match Fridge Items</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Search and Macro Segmented Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search recipes by title or ingredient (e.g. salmon, spinach, pasta)..."
                  className="w-full pl-9 pr-4 py-2 text-xs border border-zinc-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                />
              </div>

              {/* Cuisine Dropdown */}
              <select
                value={cuisineFilter}
                onChange={(e) => setCuisineFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-zinc-300 rounded-lg bg-white text-zinc-700 focus:outline-none"
              >
                <option value="all">All Cuisines</option>
                {availableCuisines.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              {/* Macro Segmented Buttons */}
              <div className="flex items-center gap-1 bg-zinc-200/80 p-1 rounded-lg text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setMacroFilter('all')}
                  className={`px-3 py-1 rounded transition-colors whitespace-nowrap ${
                    macroFilter === 'all' ? 'bg-white text-zinc-900 shadow-2xs font-semibold' : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setMacroFilter('high-protein')}
                  className={`px-3 py-1 rounded transition-colors whitespace-nowrap ${
                    macroFilter === 'high-protein' ? 'bg-white text-emerald-800 shadow-2xs font-semibold' : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  High Protein (&gt;30g)
                </button>
                <button
                  type="button"
                  onClick={() => setMacroFilter('low-carb')}
                  className={`px-3 py-1 rounded transition-colors whitespace-nowrap ${
                    macroFilter === 'low-carb' ? 'bg-white text-amber-800 shadow-2xs font-semibold' : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Low Carb (&lt;30g)
                </button>
                <button
                  type="button"
                  onClick={() => setMacroFilter('low-cal')}
                  className={`px-3 py-1 rounded transition-colors whitespace-nowrap ${
                    macroFilter === 'low-cal' ? 'bg-white text-zinc-900 shadow-2xs font-semibold' : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Under 500 kcal
                </button>
              </div>
            </div>

            {/* Recipes Grid */}
            {filteredRecipes.length === 0 ? (
              <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center shadow-xs">
                <ChefHat className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-zinc-800">No matching recipes found</h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                  Try adjusting your search filters or import a new recipe from a URL, image, or pin.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setCuisineFilter('all');
                    setMacroFilter('all');
                  }}
                  className="mt-4 px-4 py-1.5 text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredRecipes.map((recipe) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    onSelect={handleSelectRecipe}
                    onAddToGrocery={(rec, serv) => {
                      const ratio = serv / rec.standardServings;
                      const groceryItems = rec.ingredients.map((ing) => ({
                        name: ing.name,
                        quantity: Math.round(ing.quantity * ratio * 100) / 100,
                        unit: ing.unit,
                        category: ing.category || 'pantry',
                        recipeSource: rec.title,
                        purchased: false,
                      }));
                      handleAddItemsToGrocery(groceryItems);
                    }}
                    fridgeMatchScore={calculateMatch(recipe)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: INGESTION HUB */}
        {activeTab === 'ingest' && (
          <IngestionHub
            onRecipeImported={(newRec) => {
              handleSaveRecipe(newRec);
              setActiveTab('recipes');
            }}
            onOpenRecipeEditor={(draft) => {
              setEditingDraft(draft);
              setIsEditorOpen(true);
            }}
            onBatchRecipesImported={handleBatchSaveRecipes}
          />
        )}

        {/* TAB 3: FRIDGE MATCHER */}
        {activeTab === 'fridge' && (
          <FridgeMatcher
            recipes={recipes}
            fridgeItems={fridgeItems}
            onAddFridgeItem={handleAddFridgeItem}
            onRemoveFridgeItem={handleRemoveFridgeItem}
            onAddMissingToGrocery={(items) => handleAddItemsToGrocery(items)}
            onSelectRecipe={handleSelectRecipe}
          />
        )}

        {/* TAB 4: GROCERY CART */}
        {activeTab === 'grocery' && (
          <GroceryList
            groceryItems={groceryItems}
            onTogglePurchased={handleToggleGroceryPurchased}
            onDeleteItem={handleDeleteGroceryItem}
            onClearPurchased={handleClearPurchasedGrocery}
            onClearAll={handleClearAllGrocery}
            onAddCustomItem={(item) => {
              setGroceryItems((prev) => [...prev, item]);
              fetch('/api/grocery', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item),
              }).catch(() => {});
              showToast(`Added ${item.name} to grocery list.`);
            }}
          />
        )}

        {/* TAB 5: MCP CONSOLE */}
        {activeTab === 'mcp' && <McpConsole />}
      </main>

      {/* User Profile Modal */}
      {isProfileOpen && (
        <UserProfileModal
          currentUser={currentUser}
          profile={userProfile}
          onClose={() => setIsProfileOpen(false)}
          onProfileUpdated={(updated) => {
            setUserProfile(updated);
            if (updated.defaultServings) {
              setModalServings(updated.defaultServings);
            }
            showToast('User profile saved to Firestore database!');
          }}
        />
      )}

      {/* Recipe Detail Modal */}
      {selectedRecipe && (
        <RecipeDetailModal
          recipe={selectedRecipe}
          initialServings={modalServings}
          fridgeItems={fridgeItems}
          onClose={() => setSelectedRecipe(null)}
          onAddMissingToGrocery={handleAddItemsToGrocery}
          onEditRecipe={(rec) => {
            setSelectedRecipe(null);
            setEditingDraft(rec);
            setIsEditorOpen(true);
          }}
          onDeleteRecipe={handleDeleteRecipe}
        />
      )}

      {/* Recipe Editor Modal */}
      {isEditorOpen && (
        <RecipeEditorModal
          initialRecipe={editingDraft}
          onSave={handleSaveRecipe}
          onClose={() => {
            setIsEditorOpen(false);
            setEditingDraft(undefined);
          }}
        />
      )}

      {/* Toast Notification Pill */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 text-white px-4 py-2.5 rounded-xl shadow-lg border border-zinc-800 text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
