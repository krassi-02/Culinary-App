import { Ingredient, Recipe } from '../types';
import { calculateRecipeNutrition, findNutrientProfile } from './nutritionDatabase';

const UNICODE_FRACTIONS: Record<string, number> = {
  '½': 0.5,
  '¼': 0.25,
  '¾': 0.75,
  '⅓': 0.333,
  '⅔': 0.667,
  '⅛': 0.125,
  '⅜': 0.375,
  '⅝': 0.625,
  '⅞': 0.875,
};

const STANDARD_UNITS = [
  'tablespoon', 'tablespoons', 'tbsp', 'tbs',
  'teaspoon', 'teaspoons', 'tsp',
  'cup', 'cups', 'c',
  'ounce', 'ounces', 'oz',
  'pound', 'pounds', 'lb', 'lbs',
  'gram', 'grams', 'g',
  'kilogram', 'kilograms', 'kg',
  'milliliter', 'milliliters', 'ml',
  'liter', 'liters', 'l',
  'pinch', 'pinches',
  'dash', 'dashes',
  'clove', 'cloves',
  'can', 'cans',
  'slice', 'slices',
  'piece', 'pieces',
  'handful', 'handfuls',
  'stalk', 'stalks',
  'bunch', 'bunches',
  'fillet', 'fillets',
  'package', 'packages', 'pkg'
];

// Parse a single raw ingredient line into a structured Ingredient
export function parseIngredientLine(line: string): Ingredient {
  const original = line.trim();
  let text = original;

  // Replace unicode fractions with decimals or compound fractions
  for (const [char, val] of Object.entries(UNICODE_FRACTIONS)) {
    if (text.includes(char)) {
      text = text.replace(new RegExp(char, 'g'), ` ${val} `);
    }
  }

  // Check for leading compound numbers like "1 1/2" or "2 1/4"
  let quantity = 1;
  let unit = 'item';
  let name = text;

  // Regex for quantity matching: e.g. "1 1/2", "0.5", "2", "3-4", "1/2"
  const quantityMatch = text.match(/^\s*(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?)\s*(.*)/);

  if (quantityMatch) {
    const rawQty = quantityMatch[1].trim();
    let rest = quantityMatch[2].trim();

    // Calculate numeric quantity
    if (rawQty.includes(' ')) {
      // Compound like "1 1/2"
      const parts = rawQty.split(/\s+/);
      const whole = parseFloat(parts[0]) || 0;
      const fracParts = parts[1].split('/');
      const frac = fracParts.length === 2 ? (parseFloat(fracParts[0]) / parseFloat(fracParts[1])) : 0;
      quantity = whole + frac;
    } else if (rawQty.includes('/')) {
      const fracParts = rawQty.split('/');
      quantity = fracParts.length === 2 ? (parseFloat(fracParts[0]) / parseFloat(fracParts[1])) : 1;
    } else if (rawQty.includes('-')) {
      const rangeParts = rawQty.split('-');
      quantity = (parseFloat(rangeParts[0]) + parseFloat(rangeParts[1])) / 2;
    } else {
      quantity = parseFloat(rawQty) || 1;
    }

    // Now check if rest starts with a recognized unit
    const unitMatch = rest.match(/^([a-zA-Z]+)\b\s*(.*)/);
    if (unitMatch) {
      const potentialUnit = unitMatch[1].toLowerCase();
      if (STANDARD_UNITS.includes(potentialUnit)) {
        unit = potentialUnit;
        name = unitMatch[2].trim();
      } else {
        name = rest;
      }
    } else {
      name = rest;
    }
  }

  // Clean name from preparation notes (e.g. "diced", "chopped", "to taste", "optional")
  let cleanName = name
    .replace(/^of\s+/i, '')
    .replace(/\s*,\s*divided/i, '')
    .replace(/\s*,\s*chopped/i, '')
    .replace(/\s*,\s*diced/i, '')
    .replace(/\s*,\s*minced/i, '')
    .replace(/\s*,\s*to taste/i, '')
    .trim();

  if (!cleanName) cleanName = original || 'Ingredient';

  // Normalize unit
  if (unit === 'tbsp' || unit === 'tbs' || unit === 'tablespoons') unit = 'tbsp';
  if (unit === 'tsp' || unit === 'teaspoons') unit = 'tsp';
  if (unit === 'cups') unit = 'cup';
  if (unit === 'ounces') unit = 'oz';
  if (unit === 'pounds' || unit === 'lbs') unit = 'lb';
  if (unit === 'grams') unit = 'g';
  if (unit === 'cloves') unit = 'clove';

  const profile = findNutrientProfile(cleanName);
  const category = profile?.category || 'pantry';

  return {
    id: `ing_${Math.random().toString(36).substr(2, 9)}`,
    name: cleanName,
    rawText: original,
    quantity: Math.round(quantity * 100) / 100,
    unit: unit,
    category: category,
  };
}

// Deterministically parse multi-line freeform recipe text (from OCR, bookmark notes, or clipboard)
export function parseRawRecipeText(rawText: string, source: 'image' | 'video' | 'bookmark' | 'manual' = 'manual'): Partial<Recipe> {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return {
      title: 'Imported Recipe',
      ingredients: [],
      instructions: [],
      standardServings: 2,
    };
  }

  let title = lines[0];
  let standardServings = 2;
  let prepTimeMinutes = 15;
  let cookTimeMinutes = 20;

  // Search for servings/yield in text
  const servingsMatch = rawText.match(/(?:servings|yield|serves|portions):\s*(\d+)/i) ||
    rawText.match(/(\d+)\s*(?:servings|portions)/i);
  if (servingsMatch) {
    standardServings = parseInt(servingsMatch[1], 10) || 2;
  }

  // Search for times
  const prepMatch = rawText.match(/(?:prep|prep time):\s*(\d+)\s*(?:min|mins|minutes)?/i);
  if (prepMatch) prepTimeMinutes = parseInt(prepMatch[1], 10) || 15;

  const cookMatch = rawText.match(/(?:cook|cook time|bake time):\s*(\d+)\s*(?:min|mins|minutes)?/i);
  if (cookMatch) cookTimeMinutes = parseInt(cookMatch[1], 10) || 20;

  // Split into sections (Ingredients vs Instructions)
  let currentSection: 'header' | 'ingredients' | 'instructions' = 'header';
  const ingredients: Ingredient[] = [];
  const instructions: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    // Section headers detection
    if (/^(ingredients|what you need|shopping list):?$/i.test(lower)) {
      currentSection = 'ingredients';
      continue;
    }
    if (/^(instructions|directions|method|steps|preparation|how to make):?$/i.test(lower)) {
      currentSection = 'instructions';
      continue;
    }

    if (currentSection === 'header') {
      if (i === 0 && line.length < 80) {
        title = line.replace(/^[#*-\s]+/, '').trim();
      } else if (line.match(/^\s*(?:[-*•]|\d+[\.)]|(?:\d+\s*(?:cup|tbsp|tsp|g|oz|lb|can|clove)))/i)) {
        currentSection = 'ingredients';
        ingredients.push(parseIngredientLine(line.replace(/^[#*-\s•]+/, '')));
      }
    } else if (currentSection === 'ingredients') {
      // If we see numbered steps like "1. Preheat" or "Step 1", switch to instructions
      if (/^(?:step\s*\d+|\d+[\.)])\s+[A-Z]/i.test(line)) {
        currentSection = 'instructions';
        instructions.push(line.replace(/^(?:step\s*\d+:?|\d+[\.)]\s*)/i, '').trim());
      } else {
        const clean = line.replace(/^[#*-\s•]+/, '').trim();
        if (clean.length > 2) {
          ingredients.push(parseIngredientLine(clean));
        }
      }
    } else if (currentSection === 'instructions') {
      const clean = line.replace(/^(?:step\s*\d+:?|\d+[\.)]\s*|[-*•]\s*)/i, '').trim();
      if (clean.length > 5) {
        instructions.push(clean);
      }
    }
  }

  // If no sections were marked, heuristic split
  if (ingredients.length === 0 && instructions.length === 0) {
    for (const line of lines.slice(1)) {
      if (/^\d+[\.)]/.test(line) || line.length > 90) {
        instructions.push(line.replace(/^\d+[\.)]\s*/, ''));
      } else {
        ingredients.push(parseIngredientLine(line.replace(/^[-*•]\s*/, '')));
      }
    }
  }

  const nutrition = calculateRecipeNutrition(ingredients, standardServings);

  return {
    title: title || 'Scanned Recipe',
    description: `Imported via ${source} with deterministic parsing and automated nutrient breakdown.`,
    standardServings,
    prepTimeMinutes,
    cookTimeMinutes,
    ingredients,
    instructions: instructions.length > 0 ? instructions : ['Follow standard preparation and cooking technique.'],
    nutritionPerServing: nutrition,
    sourceType: source,
  };
}
