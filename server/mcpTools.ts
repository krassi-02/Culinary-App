import * as store from './store';

export const MCP_TOOLS = [
  {
    name: 'list_recipes',
    description: 'Search and filter stored recipes in the user repository by keyword, cuisine, macro targets, or maximum calories.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search term for recipe title or ingredients' },
        cuisine: { type: 'string', description: 'Cuisine filter (e.g. Mediterranean, Japanese, Thai)' },
        max_calories: { type: 'number', description: 'Maximum calories per serving' },
        min_protein: { type: 'number', description: 'Minimum grams of protein per serving' },
        tag: { type: 'string', description: 'Tag filter (e.g. "High Protein", "Gluten Free")' },
      },
    },
  },
  {
    name: 'get_recipe',
    description: 'Get full structured recipe details including scaled ingredients, preparation instructions, and nutritional breakdown for a specific serving size.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Unique Recipe ID' },
        servings: { type: 'number', description: 'Target number of servings to scale to (defaults to recipe standard servings)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'get_fridge_inventory',
    description: 'Retrieve current fridge and pantry stock with quantities, units, categories, and expiration dates.',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Filter by category (produce, dairy, protein, pantry, spices)' },
      },
    },
  },
  {
    name: 'match_fridge_to_recipes',
    description: 'Analyze user fridge inventory against recipe repository. Calculates match score percentages, lists items in stock, and identifies missing ingredients for each meal.',
    inputSchema: {
      type: 'object',
      properties: {
        min_match_score: { type: 'number', description: 'Minimum match percentage to include (0 to 100, default 0)' },
        limit: { type: 'number', description: 'Maximum number of recipes to return (default 5)' },
      },
    },
  },
  {
    name: 'generate_grocery_order',
    description: 'Generate an organized grocery shopping and delivery order list for all missing ingredients required to cook one or more selected recipes.',
    inputSchema: {
      type: 'object',
      properties: {
        recipe_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of recipe IDs to cook',
        },
        servings_multiplier: {
          type: 'number',
          description: 'Multiplier for servings (e.g. 1.0 for standard, 2.0 for double batch). Default 1.0.',
        },
      },
      required: ['recipe_ids'],
    },
  },
  {
    name: 'add_recipe',
    description: 'Programmatically add a new recipe to the user repository.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Title of the recipe' },
        description: { type: 'string', description: 'Short overview' },
        servings: { type: 'number', description: 'Standard servings' },
        ingredients: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              quantity: { type: 'number' },
              unit: { type: 'string' },
              category: { type: 'string' },
            },
            required: ['name', 'quantity', 'unit'],
          },
        },
        instructions: {
          type: 'array',
          items: { type: 'string' },
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: ['title', 'ingredients', 'instructions'],
    },
  },
  {
    name: 'update_fridge_inventory',
    description: 'Add, update, or consume items in the user fridge and pantry.',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['add', 'remove', 'consume'] },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              quantity: { type: 'number' },
              unit: { type: 'string' },
              category: { type: 'string' },
              expiresInDays: { type: 'number' },
            },
            required: ['name', 'quantity', 'unit'],
          },
        },
      },
      required: ['action', 'items'],
    },
  },
];

export async function executeMcpTool(toolName: string, args: any) {
  switch (toolName) {
    case 'list_recipes': {
      let filtered = await store.listRecipes();
      if (args?.query) {
        const q = String(args.query).toLowerCase();
        filtered = filtered.filter(
          (r) =>
            r.title.toLowerCase().includes(q) ||
            r.description.toLowerCase().includes(q) ||
            r.ingredients.some((ing: any) => ing.name.toLowerCase().includes(q))
        );
      }
      if (args?.cuisine) {
        filtered = filtered.filter((r) => r.cuisine?.toLowerCase() === String(args.cuisine).toLowerCase());
      }
      if (args?.max_calories) {
        filtered = filtered.filter((r) => r.nutritionPerServing.calories <= args.max_calories);
      }
      if (args?.min_protein) {
        filtered = filtered.filter((r) => r.nutritionPerServing.proteinGrams >= args.min_protein);
      }
      if (args?.tag) {
        filtered = filtered.filter((r) => r.tags?.some((t: string) => t.toLowerCase() === String(args.tag).toLowerCase()));
      }

      return {
        count: filtered.length,
        recipes: filtered.map((r) => ({
          id: r.id,
          title: r.title,
          cuisine: r.cuisine,
          servings: r.standardServings,
          calories_per_serving: r.nutritionPerServing.calories,
          protein_g: r.nutritionPerServing.proteinGrams,
          carbs_g: r.nutritionPerServing.carbsGrams,
          fat_g: r.nutritionPerServing.fatGrams,
          ingredients_count: r.ingredients.length,
          tags: r.tags,
        })),
      };
    }

    case 'get_recipe': {
      const recipe = await store.getRecipe(args?.id);
      if (!recipe) {
        throw new Error(`Recipe with id '${args?.id}' not found`);
      }
      const targetServings = args?.servings && args.servings > 0 ? args.servings : recipe.standardServings;
      const ratio = targetServings / recipe.standardServings;

      const scaledIngredients = recipe.ingredients.map((ing: any) => ({
        ...ing,
        scaledQuantity: Math.round(ing.quantity * ratio * 100) / 100,
      }));

      return {
        id: recipe.id,
        title: recipe.title,
        description: recipe.description,
        source: recipe.sourceUrl || recipe.sourceType,
        baseServings: recipe.standardServings,
        scaledServings: targetServings,
        nutritionPerServing: recipe.nutritionPerServing,
        scaledIngredients,
        instructions: recipe.instructions,
      };
    }

    case 'get_fridge_inventory': {
      let items = await store.listFridgeItems();
      if (args?.category) {
        items = items.filter((it) => it.category?.toLowerCase() === String(args.category).toLowerCase());
      }
      return {
        total_items: items.length,
        items,
      };
    }

    case 'match_fridge_to_recipes': {
      const fridgeNames = (await store.listFridgeItems()).map((f) => f.name.toLowerCase().trim());
      const minScore = args?.min_match_score || 0;
      const limit = args?.limit || 5;

      const matches = (await store.listRecipes()).map((recipe) => {
        const total = recipe.ingredients.length;
        const matched: string[] = [];
        const missing: any[] = [];

        for (const ing of recipe.ingredients) {
          const ingName = ing.name.toLowerCase().trim();
          const inFridge = fridgeNames.some((fn) => fn.includes(ingName) || ingName.includes(fn));
          if (inFridge) {
            matched.push(ing.name);
          } else {
            missing.push(ing);
          }
        }

        const matchScore = total > 0 ? Math.round((matched.length / total) * 100) : 0;

        return {
          id: recipe.id,
          title: recipe.title,
          matchScore,
          matchedCount: matched.length,
          totalIngredients: total,
          matchedIngredients: matched,
          missingIngredients: missing,
          nutritionPerServing: recipe.nutritionPerServing,
        };
      });

      const filtered = matches
        .filter((m) => m.matchScore >= minScore)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, limit);

      return {
        resultsCount: filtered.length,
        recommendations: filtered,
      };
    }

    case 'generate_grocery_order': {
      const recipeIds: string[] = args?.recipe_ids || [];
      const multiplier: number = args?.servings_multiplier || 1.0;

      const targetRecipes = (await store.listRecipes()).filter((r) => recipeIds.includes(r.id));
      if (targetRecipes.length === 0) {
        throw new Error('No matching recipes found for the provided IDs');
      }

      const fridgeNames = (await store.listFridgeItems()).map((f) => f.name.toLowerCase().trim());
      const neededItems: any[] = [];

      for (const recipe of targetRecipes) {
        for (const ing of recipe.ingredients) {
          const ingName = ing.name.toLowerCase().trim();
          const hasInFridge = fridgeNames.some((fn) => fn.includes(ingName) || ingName.includes(fn));
          if (!hasInFridge) {
            neededItems.push({
              id: `groc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              name: ing.name,
              quantity: Math.round(ing.quantity * multiplier * 100) / 100,
              unit: ing.unit,
              category: ing.category || 'pantry',
              recipeSource: recipe.title,
              purchased: false,
            });
          }
        }
      }

      await store.insertGroceryItems(neededItems);

      return {
        generatedCount: neededItems.length,
        orderList: neededItems,
        note: 'Items have been appended to your active grocery cart. Ready for delivery order via Instacart or local grocery checkout.',
      };
    }

    case 'add_recipe': {
      const { title, description, servings, ingredients, instructions, tags } = args;
      const newRec = {
        id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        title,
        description: description || 'Added via MCP Agent',
        sourceType: 'manual',
        imageUrl: '/src/assets/images/recipe_mediterranean_pasta_1793168927254.jpg',
        prepTimeMinutes: 15,
        cookTimeMinutes: 20,
        standardServings: servings || 2,
        ingredients: (ingredients || []).map((i: any, idx: number) => ({
          id: `ing_${idx}`,
          name: i.name,
          quantity: i.quantity,
          unit: i.unit,
          category: i.category || 'pantry',
        })),
        instructions: instructions || [],
        tags: tags || ['MCP Added'],
        createdAt: new Date().toISOString(),
        nutritionPerServing: {
          calories: 450,
          proteinGrams: 30,
          carbsGrams: 40,
          fatGrams: 15,
        },
      };
      await store.insertRecipes([newRec]);
      return { success: true, createdRecipe: newRec };
    }

    case 'update_fridge_inventory': {
      const { action, items } = args;
      if (action === 'add') {
        await store.insertFridgeItems(
          items.map((it: any) => ({
            id: `fr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            name: it.name,
            quantity: it.quantity,
            unit: it.unit,
            category: it.category || 'produce',
            expiresInDays: it.expiresInDays || 7,
            addedAt: new Date().toISOString(),
          }))
        );
      } else if (action === 'remove' || action === 'consume') {
        await store.deleteFridgeItemsByName(items.map((i: any) => i.name.toLowerCase().trim()));
      }
      return { success: true, currentStockCount: (await store.listFridgeItems()).length };
    }

    default:
      throw new Error(`Unknown MCP Tool: ${toolName}`);
  }
}
