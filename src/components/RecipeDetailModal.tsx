import React, { useState } from 'react';
import { Recipe, FridgeItem } from '../types';
import { X, Clock, Users, ExternalLink, Check, ShoppingCart, Minus, Plus, Utensils, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatAmount, scaleQuantity } from '../lib/nutritionDatabase';

interface RecipeDetailModalProps {
  recipe: Recipe | null;
  initialServings?: number;
  fridgeItems: FridgeItem[];
  onClose: () => void;
  onAddMissingToGrocery: (items: any[]) => void;
  onEditRecipe: (recipe: Recipe) => void;
  onDeleteRecipe: (recipeId: string) => void;
}

export const RecipeDetailModal: React.FC<RecipeDetailModalProps> = ({
  recipe,
  initialServings,
  fridgeItems,
  onClose,
  onAddMissingToGrocery,
  onEditRecipe,
  onDeleteRecipe,
}) => {
  if (!recipe) return null;

  const [servings, setServings] = useState<number>(initialServings || recipe.standardServings);
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});
  const [addedGroceryFeedback, setAddedGroceryFeedback] = useState(false);

  const ratio = servings / recipe.standardServings;
  const scaledCalories = Math.round(recipe.nutritionPerServing.calories * ratio);
  const scaledProtein = Math.round(recipe.nutritionPerServing.proteinGrams * ratio * 10) / 10;
  const scaledCarbs = Math.round(recipe.nutritionPerServing.carbsGrams * ratio * 10) / 10;
  const scaledFat = Math.round(recipe.nutritionPerServing.fatGrams * ratio * 10) / 10;

  // Fridge matching logic
  const fridgeNames = fridgeItems.map((f) => f.name.toLowerCase().trim());
  const ingredientsAnalysis = recipe.ingredients.map((ing) => {
    const ingName = ing.name.toLowerCase().trim();
    const isAvailable = fridgeNames.some((fn) => fn.includes(ingName) || ingName.includes(fn));
    const scaledQty = scaleQuantity(ing.quantity, recipe.standardServings, servings);
    return {
      ...ing,
      scaledQty,
      isAvailable,
    };
  });

  const missingIngredients = ingredientsAnalysis.filter((i) => !i.isAvailable);

  const toggleCheck = (id: string) => {
    setCheckedIngredients((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddMissing = () => {
    const groceryItems = missingIngredients.map((ing) => ({
      name: ing.name,
      quantity: ing.scaledQty,
      unit: ing.unit,
      category: ing.category || 'pantry',
      recipeSource: recipe.title,
      purchased: false,
    }));
    onAddMissingToGrocery(groceryItems);
    setAddedGroceryFeedback(true);
    setTimeout(() => setAddedGroceryFeedback(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Sticky Header with Title & Close */}
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-[#fbfbf9]">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              {recipe.cuisine || 'Standard Recipe'}
            </span>
            {recipe.sourceUrl && (
              <a
                href={recipe.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-emerald-700 hover:underline flex items-center gap-1 font-medium"
              >
                <span>View Original Source</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-6 space-y-6">
          {/* Top Banner & Overview */}
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="w-full sm:w-64 h-48 rounded-xl overflow-hidden bg-zinc-100 shrink-0 border border-zinc-200">
              {recipe.imageUrl ? (
                <img
                  src={recipe.imageUrl}
                  alt={recipe.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-400">
                  <Utensils className="w-10 h-10" />
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col justify-between">
              <div>
                <h2 className="text-2xl font-bold text-zinc-900">{recipe.title}</h2>
                <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
                  {recipe.description}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                  <span>Prep: {recipe.prepTimeMinutes}m</span>
                  <span>·</span>
                  <span>Cook: {recipe.cookTimeMinutes}m</span>
                  <span>·</span>
                  <span>{recipe.ingredients.length} items</span>
                  {recipe.difficulty && (
                    <>
                      <span>·</span>
                      <span>Difficulty: {recipe.difficulty}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Servings control bar */}
              <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-zinc-700">Recipe Servings:</span>
                  <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => servings > 1 && setServings(servings - 1)}
                      className="w-6 h-6 rounded flex items-center justify-center text-zinc-700 hover:bg-white shadow-2xs"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center font-mono font-bold text-sm tabular-nums text-zinc-900">
                      {servings}
                    </span>
                    <button
                      type="button"
                      onClick={() => servings < 24 && setServings(servings + 1)}
                      className="w-6 h-6 rounded flex items-center justify-center text-zinc-700 hover:bg-white shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <span className="text-xs text-zinc-500">
                  {servings === recipe.standardServings ? 'Default portions' : `Scaled by ×${ratio.toFixed(2)}`}
                </span>
              </div>
            </div>
          </div>

          {/* Dynamic Macro Dashboard Card */}
          <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-zinc-900 uppercase tracking-wide">
                Nutritional Breakdown ({servings} {servings === 1 ? 'Serving' : 'Servings'})
              </span>
              <span className="text-xs text-zinc-500">
                Grounded in USDA ingredient density reference
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-white p-3 rounded-lg border border-zinc-200 shadow-2xs">
                <div className="text-[11px] font-semibold text-zinc-400 uppercase">Energy</div>
                <div className="text-xl font-bold font-mono tabular-nums text-zinc-900 mt-0.5">
                  {scaledCalories}
                </div>
                <div className="text-[10px] text-zinc-400">Total kcal</div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-zinc-200 shadow-2xs">
                <div className="text-[11px] font-semibold text-emerald-600 uppercase">Protein</div>
                <div className="text-xl font-bold font-mono tabular-nums text-emerald-700 mt-0.5">
                  {scaledProtein}g
                </div>
                <div className="text-[10px] text-zinc-400">
                  {Math.round((scaledProtein * 4 / (scaledCalories || 1)) * 100)}% of kcal
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-zinc-200 shadow-2xs">
                <div className="text-[11px] font-semibold text-amber-600 uppercase">Carbohydrates</div>
                <div className="text-xl font-bold font-mono tabular-nums text-amber-700 mt-0.5">
                  {scaledCarbs}g
                </div>
                <div className="text-[10px] text-zinc-400">
                  {Math.round((scaledCarbs * 4 / (scaledCalories || 1)) * 100)}% of kcal
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-zinc-200 shadow-2xs">
                <div className="text-[11px] font-semibold text-rose-600 uppercase">Healthy Fats</div>
                <div className="text-xl font-bold font-mono tabular-nums text-rose-700 mt-0.5">
                  {scaledFat}g
                </div>
                <div className="text-[10px] text-zinc-400">
                  {Math.round((scaledFat * 9 / (scaledCalories || 1)) * 100)}% of kcal
                </div>
              </div>
            </div>
          </div>

          {/* Fridge Availability & Missing Ingredients Callout */}
          <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-900">
                  Pantry & Fridge Status:
                </span>
                <span className="text-xs text-zinc-600">
                  {ingredientsAnalysis.length - missingIngredients.length} of {ingredientsAnalysis.length} items in stock
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                {missingIngredients.length === 0
                  ? 'All ingredients are currently available in your kitchen!'
                  : `You are missing ${missingIngredients.length} ingredients: ${missingIngredients.map((m) => m.name).join(', ')}.`}
              </p>
            </div>

            {missingIngredients.length > 0 && (
              <button
                type="button"
                onClick={handleAddMissing}
                disabled={addedGroceryFeedback}
                className="px-3.5 py-2 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5 transition-colors shrink-0 shadow-2xs"
              >
                {addedGroceryFeedback ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Added to Cart!</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>Add {missingIngredients.length} Missing to Cart</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Ingredients & Prep Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Ingredients column */}
            <div>
              <h3 className="text-base font-bold text-zinc-900 mb-3 flex items-center justify-between">
                <span>Ingredients</span>
                <span className="text-xs font-normal text-zinc-500">
                  Check off as you prep
                </span>
              </h3>

              <div className="space-y-1.5">
                {ingredientsAnalysis.map((ing) => {
                  const isChecked = !!checkedIngredients[ing.id];
                  return (
                    <div
                      key={ing.id}
                      onClick={() => toggleCheck(ing.id)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-zinc-100/70 border-zinc-200 text-zinc-400 line-through'
                          : 'bg-white border-zinc-200 text-zinc-800 hover:border-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                            isChecked
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'border-zinc-300 bg-white'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="capitalize">{ing.name}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold tabular-nums text-xs text-zinc-900">
                          {formatAmount(ing.scaledQty)} {ing.unit}
                        </span>
                        {ing.isAvailable ? (
                          <span
                            title="In Fridge"
                            className="w-1.5 h-1.5 rounded-full bg-emerald-500"
                          />
                        ) : (
                          <span
                            title="Missing from Fridge"
                            className="w-1.5 h-1.5 rounded-full bg-amber-400"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Preparation Steps column */}
            <div>
              <h3 className="text-base font-bold text-zinc-900 mb-3">Cooking Instructions</h3>
              <div className="space-y-3">
                {recipe.instructions.map((step, idx) => (
                  <div key={idx} className="flex gap-3 text-sm text-zinc-700 leading-relaxed">
                    <span className="w-5 h-5 rounded-full bg-zinc-200 text-zinc-800 text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="flex-1">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer with Actions */}
        <div className="px-6 py-3.5 border-t border-zinc-200 bg-[#fbfbf9] flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (confirm(`Are you sure you want to delete "${recipe.title}"?`)) {
                onDeleteRecipe(recipe.id);
                onClose();
              }
            }}
            className="text-xs text-rose-600 hover:text-rose-800 hover:underline transition-colors"
          >
            Delete Recipe
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onEditRecipe(recipe)}
              className="px-3.5 py-1.5 text-xs font-medium text-zinc-700 hover:text-zinc-900 bg-white border border-zinc-300 rounded-lg shadow-2xs hover:bg-zinc-50 transition-colors"
            >
              Edit Recipe
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg shadow-2xs transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
