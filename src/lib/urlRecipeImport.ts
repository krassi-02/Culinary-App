import { Recipe, Ingredient } from '../types';
import { parseIngredientLine } from './recipeParser';
import { calculateRecipeNutrition } from './nutritionDatabase';

type Nutrition = NonNullable<Recipe['nutritionPerServing']>;

export const isDraftComplete = (
  ingredients: Ingredient[],
  instructions: string[],
  servings: number,
  nutrition?: { calories: number; proteinGrams: number; carbsGrams: number; fatGrams: number } | null
): boolean => {
  if (ingredients.length === 0 || instructions.length === 0) return false;
  if (nutrition && (nutrition.calories > 0 || nutrition.proteinGrams > 0 || nutrition.carbsGrams > 0 || nutrition.fatGrams > 0)) {
    return true;
  }
  const calculated = calculateRecipeNutrition(ingredients, servings || 2);
  return calculated.calories > 0 || calculated.proteinGrams > 0 || calculated.carbsGrams > 0 || calculated.fatGrams > 0;
};

export const mapAiFallbackToRecipe = (data: any, base: Partial<Recipe>): Partial<Recipe> => {
  const formattedIngredients: Ingredient[] = (data.ingredients || []).map((i: any, idx: number) => ({
    id: `ing_fb_${Date.now()}_${idx}`,
    name: i.name,
    quantity: Number(i.quantity) || 1,
    unit: i.unit || 'item',
    category: i.category || 'pantry',
  }));

  const nutrition: Nutrition = data.nutritionPerServing || (
    formattedIngredients.length > 0
      ? calculateRecipeNutrition(formattedIngredients, data.standardServings || 4)
      : { calories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0, fiberGrams: 0 }
  );

  return {
    ...base,
    title: data.title || base.title || 'Standardized Recipe',
    description: data.description || 'Standardized with complete macro profile via AI Fallback.',
    sourceUrl: base.sourceUrl,
    sourceType: (base.sourceType as Recipe['sourceType']) || 'bookmark',
    imageUrl: base.imageUrl || '',
    cuisine: data.cuisine || base.cuisine || 'International',
    prepTimeMinutes: data.prepTimeMinutes || 15,
    cookTimeMinutes: data.cookTimeMinutes || 20,
    standardServings: data.standardServings || 4,
    ingredients: formattedIngredients,
    instructions: data.instructions || [],
    nutritionPerServing: nutrition,
    tags: [...(base.tags || []), 'AI Standardized'],
  };
};

export const importRecipeFromUrl = async (url: string): Promise<Partial<Recipe> | null> => {
  const res = await fetch('/api/scrape-recipe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to extract recipe from URL');
  }

  const scraped = json.data;
  if (scraped.requiresManualPaste) return null;

  const ingredients: Ingredient[] = (scraped.rawIngredients || []).map((raw: string) => parseIngredientLine(raw));
  const instructions: string[] = scraped.instructions || [];

  const base: Partial<Recipe> = {
    title: scraped.title,
    description: scraped.description,
    sourceUrl: scraped.sourceUrl || url,
    sourceType: scraped.sourceType || 'bookmark',
    imageUrl: scraped.imageUrl || '',
    prepTimeMinutes: scraped.prepTimeMinutes,
    cookTimeMinutes: scraped.cookTimeMinutes,
    standardServings: scraped.standardServings,
    ingredients,
    instructions,
    nutritionPerServing: scraped.detectedNutrition?.calories ? scraped.detectedNutrition : undefined,
    tags: ['Web Ingested'],
  };

  if (isDraftComplete(ingredients, instructions, scraped.standardServings, scraped.detectedNutrition)) {
    return base;
  }

  const promptSnippet = `${scraped.title || ''}\n${scraped.description || ''}\nIngredients:\n${(scraped.rawIngredients || []).join('\n')}\nInstructions:\n${instructions.join('\n')}`;
  const fallbackRes = await fetch('/api/ai-recipe-fallback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: promptSnippet, context: `URL: ${url} (Ingredients or macros missing from web page)` }),
  });
  const fallbackJson = await fallbackRes.json();
  if (!fallbackRes.ok || !fallbackJson.success) {
    throw new Error(fallbackJson.error || 'Fallback model failed to extract recipe and macros');
  }
  return mapAiFallbackToRecipe(fallbackJson.data, base);
};
