import React, { useState } from 'react';
import { Recipe, Ingredient } from '../types';
import { X, Plus, Trash2, Sparkles, ChefHat, AlertCircle } from 'lucide-react';
import { parseIngredientLine } from '../lib/recipeParser';
import { calculateRecipeNutrition } from '../lib/nutritionDatabase';

interface RecipeEditorModalProps {
  initialRecipe?: Partial<Recipe>;
  onSave: (recipe: Recipe) => void;
  onClose: () => void;
}

export const RecipeEditorModal: React.FC<RecipeEditorModalProps> = ({
  initialRecipe,
  onSave,
  onClose,
}) => {
  const [title, setTitle] = useState(initialRecipe?.title || '');
  const [description, setDescription] = useState(initialRecipe?.description || '');
  const [cuisine, setCuisine] = useState(initialRecipe?.cuisine || 'American');
  const [imageUrl, setImageUrl] = useState(initialRecipe?.imageUrl || '');
  const [prepTimeMinutes, setPrepTimeMinutes] = useState(initialRecipe?.prepTimeMinutes || 15);
  const [cookTimeMinutes, setCookTimeMinutes] = useState(initialRecipe?.cookTimeMinutes || 20);
  const [standardServings, setStandardServings] = useState(initialRecipe?.standardServings || 2);
  const [tagsInput, setTagsInput] = useState((initialRecipe?.tags || ['Healthy']).join(', '));
  const [sourceUrl, setSourceUrl] = useState(initialRecipe?.sourceUrl || '');

  const [ingredients, setIngredients] = useState<Ingredient[]>(
    initialRecipe?.ingredients || [
      { id: 'ing_1', name: 'rolled oats', quantity: 60, unit: 'g', category: 'pantry' },
      { id: 'ing_2', name: 'milk', quantity: 150, unit: 'ml', category: 'dairy' },
    ]
  );

  const [quickIngText, setQuickIngText] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const [instructions, setInstructions] = useState<string[]>(
    initialRecipe?.instructions || [
      'Combine all dry ingredients in a mixing bowl.',
      'Gently stir in liquids until well blended.',
      'Cook over medium heat until desired consistency is achieved.',
    ]
  );

  const handleAddQuickIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickIngText.trim()) return;
    const parsed = parseIngredientLine(quickIngText);
    setIngredients([...ingredients, parsed]);
    setQuickIngText('');
  };

  const handleRemoveIngredient = (id: string) => {
    setIngredients(ingredients.filter((i) => i.id !== id));
  };

  const handleUpdateIngredient = (id: string, field: keyof Ingredient, value: any) => {
    setIngredients(
      ingredients.map((i) => (i.id === id ? { ...i, [field]: value } : i))
    );
  };

  const handleAddInstructionStep = () => {
    setInstructions([...instructions, '']);
  };

  const handleUpdateInstructionStep = (index: number, text: string) => {
    const updated = [...instructions];
    updated[index] = text;
    setInstructions(updated);
  };

  const handleRemoveInstructionStep = (index: number) => {
    setInstructions(instructions.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setValidationError('Recipe title is required');
      return;
    }
    setValidationError(null);

    const calculatedNutrition = calculateRecipeNutrition(ingredients, standardServings);
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const fullRecipe: Recipe = {
      id: initialRecipe?.id || `rec_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      title: title.trim(),
      description: description.trim() || 'A standardized home recipe with calculated macro balance.',
      sourceUrl: sourceUrl.trim() || undefined,
      sourceType: initialRecipe?.sourceType || 'manual',
      imageUrl: imageUrl.trim() || '/src/assets/images/recipe_salmon_bowl_1793168926160.jpg',
      prepTimeMinutes: Number(prepTimeMinutes) || 10,
      cookTimeMinutes: Number(cookTimeMinutes) || 15,
      standardServings: Number(standardServings) || 2,
      ingredients,
      instructions: instructions.filter((i) => i.trim().length > 0),
      nutritionPerServing: calculatedNutrition,
      tags: tags.length > 0 ? tags : ['General'],
      cuisine: cuisine.trim(),
      difficulty: 'Easy',
      createdAt: initialRecipe?.createdAt || new Date().toISOString(),
    };

    onSave(fullRecipe);
  };

  const currentEstimatedNutrition = calculateRecipeNutrition(ingredients, standardServings);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-[#fbfbf9]">
          <div className="flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-emerald-700" />
            <h2 className="text-base font-bold text-zinc-900">
              {initialRecipe?.id ? 'Edit Recipe' : 'Standardize & Save Recipe'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1">
          {validationError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Main Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Recipe Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Garlic Butter Salmon with Asparagus"
                className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Short Description</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary of flavors, textures, or recipe notes..."
                className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Cuisine</label>
              <input
                type="text"
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value)}
                placeholder="e.g. Mediterranean, Mexican, Italian"
                className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Tags (comma separated)</label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="High Protein, Quick Dinner, Meal Prep"
                className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Standard Servings</label>
              <input
                type="number"
                min="1"
                max="24"
                value={standardServings}
                onChange={(e) => setStandardServings(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono tabular-nums"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Prep Time (min)</label>
                <input
                  type="number"
                  min="0"
                  value={prepTimeMinutes}
                  onChange={(e) => setPrepTimeMinutes(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Cook Time (min)</label>
                <input
                  type="number"
                  min="0"
                  value={cookTimeMinutes}
                  onChange={(e) => setCookTimeMinutes(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none font-mono tabular-nums"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Image URL</label>
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="/src/assets/images/... or https://..."
                className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none text-xs"
              />
            </div>
          </div>

          {/* Live Calculated Macro Indicator */}
          <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-zinc-800">
                Calculated Nutrition Per Serving ({standardServings} servings)
              </span>
              <span className="text-[11px] text-zinc-500">Auto-computed from ingredients</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="bg-white p-2 rounded border border-zinc-200">
                <span className="text-zinc-500 text-[10px] block">Calories</span>
                <span className="font-mono font-bold tabular-nums text-zinc-900">{currentEstimatedNutrition.calories} kcal</span>
              </div>
              <div className="bg-white p-2 rounded border border-zinc-200">
                <span className="text-emerald-600 text-[10px] block">Protein</span>
                <span className="font-mono font-bold tabular-nums text-emerald-700">{currentEstimatedNutrition.proteinGrams}g</span>
              </div>
              <div className="bg-white p-2 rounded border border-zinc-200">
                <span className="text-amber-600 text-[10px] block">Carbs</span>
                <span className="font-mono font-bold tabular-nums text-amber-700">{currentEstimatedNutrition.carbsGrams}g</span>
              </div>
              <div className="bg-white p-2 rounded border border-zinc-200">
                <span className="text-rose-600 text-[10px] block">Fat</span>
                <span className="font-mono font-bold tabular-nums text-rose-700">{currentEstimatedNutrition.fatGrams}g</span>
              </div>
            </div>
          </div>

          {/* Ingredients Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-zinc-800 uppercase tracking-wide">
                Ingredients ({ingredients.length})
              </label>
              <span className="text-xs text-zinc-500">Type natural measurements below</span>
            </div>

            {/* Quick add box */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={quickIngText}
                onChange={(e) => setQuickIngText(e.target.value)}
                placeholder="e.g. 1 1/2 cups Greek yogurt or 300g chicken breast"
                className="flex-1 px-3 py-1.5 text-xs border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={handleAddQuickIngredient}
                className="px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 shrink-0"
              >
                Add Ingredient
              </button>
            </div>

            {/* List */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {ingredients.map((ing) => (
                <div key={ing.id} className="flex items-center gap-2 p-2 bg-zinc-50 rounded-lg border border-zinc-200 text-xs">
                  <input
                    type="number"
                    step="any"
                    value={ing.quantity}
                    onChange={(e) => handleUpdateIngredient(ing.id, 'quantity', parseFloat(e.target.value) || 0)}
                    className="w-16 px-2 py-1 border border-zinc-200 rounded font-mono tabular-nums bg-white text-center"
                  />
                  <input
                    type="text"
                    value={ing.unit}
                    onChange={(e) => handleUpdateIngredient(ing.id, 'unit', e.target.value)}
                    className="w-20 px-2 py-1 border border-zinc-200 rounded bg-white text-center"
                    placeholder="unit"
                  />
                  <input
                    type="text"
                    value={ing.name}
                    onChange={(e) => handleUpdateIngredient(ing.id, 'name', e.target.value)}
                    className="flex-1 px-2 py-1 border border-zinc-200 rounded bg-white font-medium"
                    placeholder="ingredient name"
                  />
                  <select
                    value={ing.category || 'pantry'}
                    onChange={(e) => handleUpdateIngredient(ing.id, 'category', e.target.value)}
                    className="px-2 py-1 border border-zinc-200 rounded bg-white text-zinc-600"
                  >
                    <option value="produce">Produce</option>
                    <option value="protein">Protein</option>
                    <option value="dairy">Dairy</option>
                    <option value="pantry">Pantry</option>
                    <option value="spices">Spices</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemoveIngredient(ing.id)}
                    className="text-zinc-400 hover:text-rose-600 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Instructions Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-zinc-800 uppercase tracking-wide">
                Instructions ({instructions.length} steps)
              </label>
              <button
                type="button"
                onClick={handleAddInstructionStep}
                className="text-xs font-medium text-emerald-700 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Add Step</span>
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {instructions.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-zinc-200 text-zinc-800 text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-1">
                    {idx + 1}
                  </span>
                  <textarea
                    rows={2}
                    value={step}
                    onChange={(e) => handleUpdateInstructionStep(idx, e.target.value)}
                    placeholder={`Step ${idx + 1} directions...`}
                    className="flex-1 px-3 py-1.5 text-xs border border-zinc-300 rounded-lg focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveInstructionStep(idx)}
                    className="text-zinc-400 hover:text-rose-600 p-1 mt-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-zinc-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg shadow-2xs"
            >
              Save Standard Recipe
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
