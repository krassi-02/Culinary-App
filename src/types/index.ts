export interface NutritionInfo {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams?: number;
}

export interface Ingredient {
  id: string;
  name: string;
  rawText?: string;
  quantity: number;
  unit: string;
  category?: 'produce' | 'dairy' | 'protein' | 'pantry' | 'spices' | 'baking' | 'other';
  caloriesPerUnit?: number;
  proteinPerUnit?: number;
  carbsPerUnit?: number;
  fatPerUnit?: number;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  sourceUrl?: string;
  sourceType: 'pinterest' | 'instagram' | 'facebook' | 'bookmark' | 'image' | 'video' | 'manual';
  imageUrl: string;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  standardServings: number;
  ingredients: Ingredient[];
  instructions: string[];
  nutritionPerServing: NutritionInfo;
  tags: string[];
  cuisine?: string;
  difficulty?: 'Easy' | 'Medium' | 'Advanced';
  createdAt: string;
}

export interface FridgeItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: 'produce' | 'dairy' | 'protein' | 'pantry' | 'spices' | 'baking' | 'other';
  expiresInDays?: number;
  addedAt: string;
}

export interface GroceryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  recipeSource?: string;
  purchased: boolean;
  notes?: string;
}

export interface RecipeMatchResult {
  recipe: Recipe;
  matchScore: number; // 0 to 100 percentage
  availableCount: number;
  totalCount: number;
  matchedIngredients: string[];
  missingIngredients: Ingredient[];
}

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPJsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

export interface MCPJsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}
