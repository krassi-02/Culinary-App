import { NutritionInfo, Ingredient } from '../types';

export interface IngredientNutrientProfile {
  aliases: string[];
  category: 'produce' | 'dairy' | 'protein' | 'pantry' | 'spices' | 'baking' | 'other';
  standardUnit: string;
  unitWeightGrams: number;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g?: number;
}

// Comprehensive database of common culinary ingredients grounded in USDA FoodData averages
export const NUTRITION_DATABASE: Record<string, IngredientNutrientProfile> = {
  // Proteins
  'chicken breast': {
    aliases: ['chicken', 'chicken breasts', 'boneless chicken', 'skinless chicken'],
    category: 'protein',
    standardUnit: 'g',
    unitWeightGrams: 1,
    caloriesPer100g: 165,
    proteinPer100g: 31,
    carbsPer100g: 0,
    fatPer100g: 3.6,
  },
  'salmon': {
    aliases: ['salmon fillet', 'wild salmon', 'atlantic salmon', 'salmon steaks'],
    category: 'protein',
    standardUnit: 'g',
    unitWeightGrams: 1,
    caloriesPer100g: 208,
    proteinPer100g: 20,
    carbsPer100g: 0,
    fatPer100g: 13,
  },
  'egg': {
    aliases: ['eggs', 'large egg', 'large eggs', 'egg yolk', 'egg whites'],
    category: 'protein',
    standardUnit: 'piece',
    unitWeightGrams: 50,
    caloriesPer100g: 143,
    proteinPer100g: 12.6,
    carbsPer100g: 0.7,
    fatPer100g: 9.5,
  },
  'tofu': {
    aliases: ['firm tofu', 'extra firm tofu', 'tofu cubes', 'silken tofu'],
    category: 'protein',
    standardUnit: 'g',
    unitWeightGrams: 1,
    caloriesPer100g: 76,
    proteinPer100g: 8,
    carbsPer100g: 1.9,
    fatPer100g: 4.8,
  },
  'ground beef': {
    aliases: ['beef', 'minced beef', 'lean beef', 'ground sirloin'],
    category: 'protein',
    standardUnit: 'g',
    unitWeightGrams: 1,
    caloriesPer100g: 215,
    proteinPer100g: 26,
    carbsPer100g: 0,
    fatPer100g: 12,
  },
  'greek yogurt': {
    aliases: ['plain greek yogurt', 'yogurt', 'nonfat greek yogurt', 'skyr'],
    category: 'dairy',
    standardUnit: 'g',
    unitWeightGrams: 1,
    caloriesPer100g: 73,
    proteinPer100g: 10,
    carbsPer100g: 3.6,
    fatPer100g: 1.9,
  },
  // Grains & Pantry
  'brown rice': {
    aliases: ['rice', 'cooked brown rice', 'white rice', 'jasmine rice', 'basmati rice'],
    category: 'pantry',
    standardUnit: 'g',
    unitWeightGrams: 1,
    caloriesPer100g: 111,
    proteinPer100g: 2.6,
    carbsPer100g: 23,
    fatPer100g: 0.9,
  },
  'rolled oats': {
    aliases: ['oats', 'oatmeal', 'steel cut oats', 'rolled oat'],
    category: 'pantry',
    standardUnit: 'g',
    unitWeightGrams: 1,
    caloriesPer100g: 379,
    proteinPer100g: 13.2,
    carbsPer100g: 67.7,
    fatPer100g: 6.5,
    fiberPer100g: 10.1,
  },
  'penne pasta': {
    aliases: ['pasta', 'penne', 'spaghetti', 'rigatoni', 'noodles', 'linguine'],
    category: 'pantry',
    standardUnit: 'g',
    unitWeightGrams: 1,
    caloriesPer100g: 158, // cooked
    proteinPer100g: 5.8,
    carbsPer100g: 31,
    fatPer100g: 0.9,
  },
  'olive oil': {
    aliases: ['extra virgin olive oil', 'cooking oil', 'vegetable oil', 'avocado oil'],
    category: 'pantry',
    standardUnit: 'tbsp',
    unitWeightGrams: 14,
    caloriesPer100g: 884,
    proteinPer100g: 0,
    carbsPer100g: 0,
    fatPer100g: 100,
  },
  'coconut milk': {
    aliases: ['canned coconut milk', 'light coconut milk', 'coconut cream'],
    category: 'pantry',
    standardUnit: 'ml',
    unitWeightGrams: 1,
    caloriesPer100g: 197,
    proteinPer100g: 2,
    carbsPer100g: 2.8,
    fatPer100g: 21,
  },
  'peanut butter': {
    aliases: ['almond butter', 'nut butter', 'cashew butter'],
    category: 'pantry',
    standardUnit: 'tbsp',
    unitWeightGrams: 16,
    caloriesPer100g: 588,
    proteinPer100g: 25,
    carbsPer100g: 20,
    fatPer100g: 50,
  },
  'chia seeds': {
    aliases: ['chia', 'flax seeds', 'hemp seeds'],
    category: 'pantry',
    standardUnit: 'tbsp',
    unitWeightGrams: 12,
    caloriesPer100g: 486,
    proteinPer100g: 16.5,
    carbsPer100g: 42.1,
    fatPer100g: 30.7,
  },
  // Dairy
  'parmesan cheese': {
    aliases: ['parmesan', 'shaved parmesan', 'parmigiano', 'grated cheese', 'cheddar', 'mozzarella'],
    category: 'dairy',
    standardUnit: 'g',
    unitWeightGrams: 1,
    caloriesPer100g: 392,
    proteinPer100g: 35.8,
    carbsPer100g: 3.2,
    fatPer100g: 25.8,
  },
  'milk': {
    aliases: ['almond milk', 'oat milk', 'whole milk', 'skim milk', 'soy milk'],
    category: 'dairy',
    standardUnit: 'ml',
    unitWeightGrams: 1,
    caloriesPer100g: 42,
    proteinPer100g: 3.4,
    carbsPer100g: 5,
    fatPer100g: 1,
  },
  // Produce & Vegetables
  'avocado': {
    aliases: ['fresh avocado', 'hass avocado'],
    category: 'produce',
    standardUnit: 'piece',
    unitWeightGrams: 150,
    caloriesPer100g: 160,
    proteinPer100g: 2,
    carbsPer100g: 8.5,
    fatPer100g: 14.7,
  },
  'spinach': {
    aliases: ['baby spinach', 'fresh spinach', 'spinach leaves', 'kale'],
    category: 'produce',
    standardUnit: 'g',
    unitWeightGrams: 1,
    caloriesPer100g: 23,
    proteinPer100g: 2.9,
    carbsPer100g: 3.6,
    fatPer100g: 0.4,
  },
  'blueberries': {
    aliases: ['fresh blueberries', 'berries', 'strawberries', 'raspberries'],
    category: 'produce',
    standardUnit: 'g',
    unitWeightGrams: 1,
    caloriesPer100g: 57,
    proteinPer100g: 0.7,
    carbsPer100g: 14.5,
    fatPer100g: 0.3,
  },
  'banana': {
    aliases: ['bananas', 'ripe banana'],
    category: 'produce',
    standardUnit: 'piece',
    unitWeightGrams: 118,
    caloriesPer100g: 89,
    proteinPer100g: 1.1,
    carbsPer100g: 22.8,
    fatPer100g: 0.3,
  },
  'bell pepper': {
    aliases: ['red bell pepper', 'green bell pepper', 'sweet pepper', 'peppers'],
    category: 'produce',
    standardUnit: 'piece',
    unitWeightGrams: 120,
    caloriesPer100g: 31,
    proteinPer100g: 1,
    carbsPer100g: 6,
    fatPer100g: 0.3,
  },
  'edamame': {
    aliases: ['shelled edamame', 'soybeans'],
    category: 'produce',
    standardUnit: 'g',
    unitWeightGrams: 1,
    caloriesPer100g: 121,
    proteinPer100g: 11.9,
    carbsPer100g: 8.9,
    fatPer100g: 5.2,
  },
  'cucumber': {
    aliases: ['cucumbers', 'english cucumber'],
    category: 'produce',
    standardUnit: 'piece',
    unitWeightGrams: 200,
    caloriesPer100g: 15,
    proteinPer100g: 0.7,
    carbsPer100g: 3.6,
    fatPer100g: 0.1,
  },
  'garlic': {
    aliases: ['garlic cloves', 'cloves garlic', 'minced garlic'],
    category: 'produce',
    standardUnit: 'clove',
    unitWeightGrams: 3,
    caloriesPer100g: 149,
    proteinPer100g: 6.4,
    carbsPer100g: 33,
    fatPer100g: 0.5,
  },
  'onion': {
    aliases: ['yellow onion', 'red onion', 'white onion', 'shallot'],
    category: 'produce',
    standardUnit: 'piece',
    unitWeightGrams: 150,
    caloriesPer100g: 40,
    proteinPer100g: 1.1,
    carbsPer100g: 9.3,
    fatPer100g: 0.1,
  },
  'tomato': {
    aliases: ['tomatoes', 'cherry tomatoes', 'sun-dried tomatoes', 'diced tomatoes'],
    category: 'produce',
    standardUnit: 'piece',
    unitWeightGrams: 120,
    caloriesPer100g: 18,
    proteinPer100g: 0.9,
    carbsPer100g: 3.9,
    fatPer100g: 0.2,
  },
};

// Convert unit to standard grams
export function convertUnitToGrams(quantity: number, unit: string, itemProfile?: IngredientNutrientProfile): number {
  const normUnit = unit.toLowerCase().trim();
  
  if (normUnit === 'g' || normUnit === 'gram' || normUnit === 'grams') return quantity;
  if (normUnit === 'kg' || normUnit === 'kilogram') return quantity * 1000;
  if (normUnit === 'oz' || normUnit === 'ounce' || normUnit === 'ounces') return quantity * 28.35;
  if (normUnit === 'lb' || normUnit === 'lbs' || normUnit === 'pound') return quantity * 453.59;
  if (normUnit === 'tbsp' || normUnit === 'tablespoon' || normUnit === 'tablespoons') return quantity * 15;
  if (normUnit === 'tsp' || normUnit === 'teaspoon' || normUnit === 'teaspoons') return quantity * 5;
  if (normUnit === 'cup' || normUnit === 'cups') return quantity * 240; // rough liquid/standard cup
  if (normUnit === 'ml' || normUnit === 'milliliter') return quantity;
  if (normUnit === 'l' || normUnit === 'liter') return quantity * 1000;
  
  if (normUnit === 'piece' || normUnit === 'item' || normUnit === '' || normUnit === 'clove') {
    if (itemProfile) return quantity * itemProfile.unitWeightGrams;
    return quantity * 50; // generic fallback
  }

  return quantity * 30; // sensible fallback
}

// Find closest profile in database
export function findNutrientProfile(ingredientName: string): IngredientNutrientProfile | null {
  const clean = ingredientName.toLowerCase().replace(/[^a-z\s]/g, ' ').trim();
  
  // Exact match
  if (NUTRITION_DATABASE[clean]) return NUTRITION_DATABASE[clean];

  // Alias or contains match
  for (const [key, profile] of Object.entries(NUTRITION_DATABASE)) {
    if (clean.includes(key) || key.includes(clean)) return profile;
    for (const alias of profile.aliases) {
      if (clean.includes(alias) || alias.includes(clean)) return profile;
    }
  }

  return null;
}

// Estimate nutrition for a single ingredient
export function estimateIngredientNutrition(
  name: string,
  quantity: number,
  unit: string
): NutritionInfo {
  const profile = findNutrientProfile(name);
  if (!profile) {
    // Sensible generic nutritional density
    const grams = convertUnitToGrams(quantity, unit);
    return {
      calories: Math.round(grams * 1.2),
      proteinGrams: Math.round(grams * 0.05),
      carbsGrams: Math.round(grams * 0.15),
      fatGrams: Math.round(grams * 0.04),
    };
  }

  const grams = convertUnitToGrams(quantity, unit, profile);
  const factor = grams / 100;

  return {
    calories: Math.round(profile.caloriesPer100g * factor),
    proteinGrams: Math.round(profile.proteinPer100g * factor * 10) / 10,
    carbsGrams: Math.round(profile.carbsPer100g * factor * 10) / 10,
    fatGrams: Math.round(profile.fatPer100g * factor * 10) / 10,
  };
}

// Calculate total recipe nutrition per serving based on ingredients
export function calculateRecipeNutrition(
  ingredients: Ingredient[],
  servings: number
): NutritionInfo {
  if (servings <= 0) servings = 1;
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  for (const ing of ingredients) {
    const nut = estimateIngredientNutrition(ing.name, ing.quantity, ing.unit);
    totalCalories += nut.calories;
    totalProtein += nut.proteinGrams;
    totalCarbs += nut.carbsGrams;
    totalFat += nut.fatGrams;
  }

  return {
    calories: Math.round(totalCalories / servings),
    proteinGrams: Math.round((totalProtein / servings) * 10) / 10,
    carbsGrams: Math.round((totalCarbs / servings) * 10) / 10,
    fatGrams: Math.round((totalFat / servings) * 10) / 10,
  };
}

// Scale an ingredient quantity from base servings to target servings
export function scaleQuantity(
  baseQuantity: number,
  baseServings: number,
  targetServings: number
): number {
  if (baseServings <= 0) baseServings = 1;
  const scaled = (baseQuantity / baseServings) * targetServings;
  return Math.round(scaled * 100) / 100;
}

// Format fractional cooking amounts cleanly (e.g. 1.5 -> 1 1/2, 0.25 -> 1/4)
export function formatAmount(amount: number): string {
  if (amount <= 0) return '0';
  const integerPart = Math.floor(amount);
  const decimalPart = amount - integerPart;

  const fractionThresholds: [number, string][] = [
    [0.125, '1/8'],
    [0.25, '1/4'],
    [0.333, '1/3'],
    [0.5, '1/2'],
    [0.666, '2/3'],
    [0.75, '3/4'],
    [0.875, '7/8'],
  ];

  for (const [val, label] of fractionThresholds) {
    if (Math.abs(decimalPart - val) < 0.06) {
      if (integerPart === 0) return label;
      return `${integerPart} ${label}`;
    }
  }

  if (decimalPart < 0.05) return `${integerPart}`;
  if (decimalPart > 0.95) return `${integerPart + 1}`;

  return amount.toFixed(1).replace(/\.0$/, '');
}
