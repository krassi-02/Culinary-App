import { Express, Request, Response } from 'express';
import * as store from './store';

type RouteHandler = (req: Request, res: Response) => Promise<void>;

const route = (handler: RouteHandler) => (req: Request, res: Response) => {
  handler(req, res).catch((err: any) => {
    console.error('Data route error:', err);
    res.status(500).json({ error: err.message || 'Database request failed' });
  });
};

export function registerDataRoutes(app: Express) {
  app.get('/api/recipes', route(async (_req, res) => {
    res.json({ success: true, recipes: await store.listRecipes() });
  }));

  app.post('/api/recipes', route(async (req, res) => {
    const newRecipe = req.body;
    if (!newRecipe.id) {
      newRecipe.id = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    }
    newRecipe.createdAt = newRecipe.createdAt || new Date().toISOString();
    await store.insertRecipes([newRecipe]);
    res.status(201).json({ success: true, recipe: newRecipe });
  }));

  app.put('/api/recipes/:id', route(async (req, res) => {
    const updated = await store.updateRecipe(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Recipe not found' });
      return;
    }
    res.json({ success: true, recipe: updated });
  }));

  app.delete('/api/recipes/:id', route(async (req, res) => {
    await store.deleteRecipe(req.params.id);
    res.json({ success: true });
  }));

  app.get('/api/fridge', route(async (_req, res) => {
    res.json({ success: true, fridge: await store.listFridgeItems() });
  }));

  app.post('/api/fridge', route(async (req, res) => {
    const newItem = req.body;
    if (!newItem.id) {
      newItem.id = `fr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    }
    newItem.addedAt = newItem.addedAt || new Date().toISOString();
    await store.insertFridgeItems([newItem]);
    res.status(201).json({ success: true, item: newItem });
  }));

  app.put('/api/fridge/:id', route(async (req, res) => {
    const updated = await store.updateFridgeItem(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Fridge item not found' });
      return;
    }
    res.json({ success: true, item: updated });
  }));

  app.delete('/api/fridge/:id', route(async (req, res) => {
    await store.deleteFridgeItem(req.params.id);
    res.json({ success: true });
  }));

  app.get('/api/grocery', route(async (_req, res) => {
    res.json({ success: true, grocery: await store.listGroceryItems() });
  }));

  app.post('/api/grocery', route(async (req, res) => {
    const items = Array.isArray(req.body) ? req.body : [req.body];
    for (const it of items) {
      if (!it.id) {
        it.id = `groc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      }
    }
    await store.insertGroceryItems(items);
    res.status(201).json({ success: true, grocery: await store.listGroceryItems() });
  }));

  app.put('/api/grocery/:id', route(async (req, res) => {
    const updated = await store.updateGroceryItem(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Grocery item not found' });
      return;
    }
    res.json({ success: true, item: updated });
  }));

  app.delete('/api/grocery/:id', route(async (req, res) => {
    await store.deleteGroceryItem(req.params.id);
    res.json({ success: true });
  }));

  app.delete('/api/grocery', route(async (req, res) => {
    await store.clearGroceryItems(req.query.clearPurchasedOnly === 'true');
    res.json({ success: true });
  }));
}
