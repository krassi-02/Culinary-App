import React, { useState } from 'react';
import { Recipe } from '../types';
import { Clock, Users, ArrowUpRight, Minus, Plus, Utensils, CheckCircle2 } from 'lucide-react';
import { scaleQuantity } from '../lib/nutritionDatabase';

interface RecipeCardProps {
  recipe: Recipe;
  onSelect: (recipe: Recipe, servings: number) => void;
  onAddToGrocery: (recipe: Recipe, servings: number) => void;
  fridgeMatchScore?: number;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  onSelect,
  onAddToGrocery,
  fridgeMatchScore,
}) => {
  const [servings, setServings] = useState<number>(recipe.standardServings);
  const [imageError, setImageError] = useState(false);

  const ratio = servings / recipe.standardServings;
  // Scaled nutrition values
  const scaledCalories = Math.round(recipe.nutritionPerServing.calories * ratio);
  const scaledProtein = Math.round(recipe.nutritionPerServing.proteinGrams * ratio * 10) / 10;
  const scaledCarbs = Math.round(recipe.nutritionPerServing.carbsGrams * ratio * 10) / 10;
  const scaledFat = Math.round(recipe.nutritionPerServing.fatGrams * ratio * 10) / 10;

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (servings > 1) setServings(servings - 1);
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (servings < 16) setServings(servings + 1);
  };

  const handleGroceryClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToGrocery(recipe, servings);
  };

  const getSourceLabel = (type: string) => {
    switch (type) {
      case 'pinterest': return 'Pinterest Pin';
      case 'instagram': return 'Instagram Reel';
      case 'facebook': return 'Facebook Post';
      case 'bookmark': return 'Web Bookmark';
      case 'video': return 'Video Card';
      case 'image': return 'Photo OCR';
      default: return 'Recipe';
    }
  };

  return (
    <div
      onClick={() => onSelect(recipe, servings)}
      className="group bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-xs hover:border-zinc-300 hover:shadow-md transition-all cursor-pointer flex flex-col"
    >
      {/* Media slot */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-100">
        {!imageError && recipe.imageUrl ? (
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-100 text-zinc-400 p-6 text-center">
            <Utensils className="w-8 h-8 mb-2 opacity-60" />
            <span className="text-xs font-medium text-zinc-500">{recipe.title}</span>
          </div>
        )}

        {/* Fridge Match Indicator if available */}
        {typeof fridgeMatchScore === 'number' && (
          <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-md text-xs font-semibold shadow-xs flex items-center gap-1.5 border border-zinc-200/80">
            <span className={`w-2 h-2 rounded-full ${fridgeMatchScore >= 80 ? 'bg-emerald-500' : fridgeMatchScore >= 50 ? 'bg-amber-500' : 'bg-zinc-400'}`} />
            <span className="font-mono tabular-nums text-zinc-800">{fridgeMatchScore}% In Fridge</span>
          </div>
        )}

        {/* Source kicker badge */}
        <div className="absolute bottom-3 left-3 bg-zinc-900/80 backdrop-blur-xs text-white text-[11px] font-medium px-2 py-0.5 rounded-sm">
          {getSourceLabel(recipe.sourceType)}
        </div>
      </div>

      {/* Content body */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Metadata line without pill clutter */}
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
            <span>{recipe.cuisine || 'Home Cooking'}</span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-zinc-400" />
              <span>{recipe.prepTimeMinutes + recipe.cookTimeMinutes}m total</span>
            </span>
            <span aria-hidden="true">·</span>
            <span>{recipe.ingredients.length} items</span>
          </div>

          <h3 className="text-base font-bold text-zinc-900 group-hover:text-emerald-700 transition-colors line-clamp-1">
            {recipe.title}
          </h3>

          <p className="mt-1.5 text-xs text-zinc-600 line-clamp-2 leading-relaxed">
            {recipe.description}
          </p>
        </div>

        {/* Serving size scaler & Macro proportion strip */}
        <div className="mt-4 pt-3.5 border-t border-zinc-100 space-y-3">
          {/* Serving Stepper */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500 font-medium flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-zinc-400" />
              <span>Servings</span>
            </span>
            <div className="flex items-center gap-2 bg-zinc-100 p-0.5 rounded-md">
              <button
                type="button"
                onClick={handleDecrement}
                disabled={servings <= 1}
                className="w-6 h-6 rounded flex items-center justify-center text-zinc-700 hover:bg-white disabled:opacity-30 transition-colors shadow-2xs"
                title="Decrease servings"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-6 text-center font-mono tabular-nums font-semibold text-zinc-900">
                {servings}
              </span>
              <button
                type="button"
                onClick={handleIncrement}
                disabled={servings >= 16}
                className="w-6 h-6 rounded flex items-center justify-center text-zinc-700 hover:bg-white disabled:opacity-30 transition-colors shadow-2xs"
                title="Increase servings"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Macro Breakdown Strip (Tabular Numerals) */}
          <div className="grid grid-cols-4 gap-1.5 text-center bg-zinc-50 p-2 rounded-lg border border-zinc-100">
            <div>
              <div className="text-[10px] uppercase font-semibold text-zinc-400">Calories</div>
              <div className="text-xs font-mono font-bold tabular-nums text-zinc-800">
                {scaledCalories}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-semibold text-emerald-600">Protein</div>
              <div className="text-xs font-mono font-bold tabular-nums text-emerald-700">
                {scaledProtein}g
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-semibold text-amber-600">Carbs</div>
              <div className="text-xs font-mono font-bold tabular-nums text-amber-700">
                {scaledCarbs}g
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-semibold text-rose-600">Fat</div>
              <div className="text-xs font-mono font-bold tabular-nums text-rose-700">
                {scaledFat}g
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-zinc-400">
              {servings === recipe.standardServings ? 'Standard batch' : `Scaled ×${ratio.toFixed(1)}`}
            </span>
            <button
              type="button"
              onClick={handleGroceryClick}
              className="text-xs font-medium text-zinc-700 hover:text-emerald-700 hover:underline flex items-center gap-1 transition-colors"
            >
              <span>Add to Cart</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
