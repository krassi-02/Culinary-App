import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL ?? '', process.env.SUPABASE_SERVICE_ROLE_KEY ?? '', {
  auth: { persistSession: false },
});

type Table = 'recipes' | 'fridge_items' | 'grocery_items';

async function listRows(table: Table, newestFirst: boolean): Promise<any[]> {
  const { data, error } = await supabase
    .from(table)
    .select('data')
    .order('created_at', { ascending: !newestFirst });
  if (error) throw error;
  return data.map((row) => row.data);
}

async function getRow(table: Table, id: string): Promise<any | null> {
  const { data, error } = await supabase.from(table).select('data').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? data.data : null;
}

async function insertRows(table: Table, items: any[], createdAtKey: string): Promise<void> {
  if (items.length === 0) return;
  const rows = items.map((item) => ({
    id: item.id,
    data: item,
    created_at: item[createdAtKey] || new Date().toISOString(),
  }));
  const { error } = await supabase.from(table).insert(rows);
  if (error) throw error;
}

async function updateRow(table: Table, id: string, patch: any): Promise<any | null> {
  const existing = await getRow(table, id);
  if (!existing) return null;
  const updated = { ...existing, ...patch, id };
  const { error } = await supabase.from(table).update({ data: updated }).eq('id', id);
  if (error) throw error;
  return updated;
}

async function deleteRow(table: Table, id: string): Promise<void> {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}

export const listRecipes = () => listRows('recipes', true);
export const getRecipe = (id: string) => getRow('recipes', id);
export const insertRecipes = (recipes: any[]) => insertRows('recipes', recipes, 'createdAt');
export const updateRecipe = (id: string, patch: any) => updateRow('recipes', id, patch);
export const deleteRecipe = (id: string) => deleteRow('recipes', id);

export const listFridgeItems = () => listRows('fridge_items', false);
export const getFridgeItem = (id: string) => getRow('fridge_items', id);
export const insertFridgeItems = (items: any[]) => insertRows('fridge_items', items, 'addedAt');
export const updateFridgeItem = (id: string, patch: any) => updateRow('fridge_items', id, patch);
export const deleteFridgeItem = (id: string) => deleteRow('fridge_items', id);

export async function deleteFridgeItemsByName(names: string[]): Promise<void> {
  const wanted = new Set(names);
  const { data, error } = await supabase.from('fridge_items').select('id, data');
  if (error) throw error;
  const ids = data.filter((row) => wanted.has(String(row.data.name).toLowerCase().trim())).map((row) => row.id);
  if (ids.length === 0) return;
  const { error: deleteError } = await supabase.from('fridge_items').delete().in('id', ids);
  if (deleteError) throw deleteError;
}

export const listGroceryItems = () => listRows('grocery_items', false);
export const insertGroceryItems = (items: any[]) => insertRows('grocery_items', items, 'addedAt');
export const updateGroceryItem = (id: string, patch: any) => updateRow('grocery_items', id, patch);
export const deleteGroceryItem = (id: string) => deleteRow('grocery_items', id);

export async function clearGroceryItems(purchasedOnly: boolean): Promise<void> {
  let query = supabase.from('grocery_items').delete();
  query = purchasedOnly ? query.eq('data->>purchased', 'true') : query.not('id', 'is', null);
  const { error } = await query;
  if (error) throw error;
}
