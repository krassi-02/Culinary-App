/**
 * Browser Bookmark Export Parser
 * Supports Netscape Bookmark HTML format (Chrome, Safari, Firefox, Edge, Brave, Arc),
 * JSON bookmarks (Firefox / Chrome backups), and plain text link lists.
 */

export interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  folderPath: string[];
  addDate?: string;
  icon?: string;
  domain: string;
  isLikelyRecipe: boolean;
  categorySuggestion?: string;
}

export interface BookmarkParseResult {
  totalFound: number;
  recipeCount: number;
  folders: string[];
  items: BookmarkItem[];
}

const RECIPE_DOMAINS = [
  'allrecipes.com',
  'foodnetwork.com',
  'epicurious.com',
  'bonappetit.com',
  'seriouseats.com',
  'delish.com',
  'tasteofhome.com',
  'thekitchn.com',
  'simplyrecipes.com',
  'cookinglight.com',
  'budgetbytes.com',
  'minimalistbaker.com',
  'cookieandkate.com',
  'smittenkitchen.com',
  'bbcgoodfood.com',
  'taste.com.au',
  'eatingwell.com',
  'food.com',
  'yummly.com',
  'cooking.nytimes.com',
  'damndelicious.net',
  'sallysbakingaddiction.com',
  'recipetineats.com',
  'skinnytaste.com',
  'gimmesomeoven.com',
  'halfbakedharvest.com',
  'tasty.co',
  'natashaskitchen.com',
  'cafedelites.com',
  'loveandlemons.com',
  'spendwithpennies.com',
  'pinchofyum.com',
  'sweetpeasandsaffron.com',
  'cookieandkate.com',
  'wellplated.com',
  'ambitiouskitchen.com',
  'aheadofthyme.com',
  'feastingathome.com',
  'downshiftology.com',
  'fitmencook.com',
  'healthyfitnessmeals.com',
];

const RECIPE_KEYWORDS = [
  'recipe',
  'cook',
  'bake',
  'roast',
  'salad',
  'soup',
  'chicken',
  'pasta',
  'salmon',
  'cake',
  'cookie',
  'cookies',
  'bread',
  'stew',
  'sauce',
  'curry',
  'bowl',
  'protein',
  'marinate',
  'casserole',
  'risotto',
  'taco',
  'burger',
  'pizza',
  'muffin',
  'smoothie',
  'macros',
  'macro',
  'calories',
  'keto',
  'vegan',
  'dessert',
  'dinner',
  'lunch',
  'breakfast',
  'snack',
  'air fryer',
  'instant pot',
  'slow cooker',
  'meal prep',
  'overnight oats',
  'cottage cheese',
];

const FOLDER_RECIPE_KEYWORDS = [
  'recipe',
  'recipes',
  'food',
  'dinner',
  'lunch',
  'breakfast',
  'dessert',
  'desserts',
  'baking',
  'cook',
  'cooking',
  'meal',
  'meals',
  'kitchen',
  'diet',
  'healthy',
  'keto',
  'snacks',
];

/**
 * Check if a bookmark item is likely a recipe
 */
export function checkIsLikelyRecipe(title: string, url: string, folderPath: string[]): boolean {
  const lowerUrl = url.toLowerCase();
  const lowerTitle = title.toLowerCase();
  const lowerFolders = folderPath.map((f) => f.toLowerCase()).join(' ');

  // 1. Check known recipe domains
  for (const domain of RECIPE_DOMAINS) {
    if (lowerUrl.includes(domain)) return true;
  }

  // 2. Check Instagram / Pinterest / Facebook with food context
  const isSocial =
    lowerUrl.includes('instagram.com') ||
    lowerUrl.includes('pinterest.com') ||
    lowerUrl.includes('pin.it') ||
    lowerUrl.includes('facebook.com') ||
    lowerUrl.includes('fb.watch');

  if (isSocial) {
    // If inside a recipe folder or has food keywords in title/url
    for (const kw of RECIPE_KEYWORDS) {
      if (lowerTitle.includes(kw) || lowerUrl.includes(kw) || lowerFolders.includes(kw)) {
        return true;
      }
    }
  }

  // 3. Check folder names
  for (const fKw of FOLDER_RECIPE_KEYWORDS) {
    if (lowerFolders.includes(fKw)) {
      return true;
    }
  }

  // 4. Check title keywords
  let keywordMatches = 0;
  for (const kw of RECIPE_KEYWORDS) {
    if (lowerTitle.includes(kw) || lowerUrl.includes(kw)) {
      keywordMatches++;
      if (keywordMatches >= 1 && (kw === 'recipe' || kw === 'recipes' || lowerUrl.includes('/recipe/'))) {
        return true;
      }
    }
  }

  return keywordMatches >= 1;
}

/**
 * Suggest a cuisine or meal category based on title and folder
 */
export function suggestCategory(title: string, folderPath: string[]): string {
  const combined = `${folderPath.join(' ')} ${title}`.toLowerCase();
  if (combined.includes('dessert') || combined.includes('cake') || combined.includes('cookie') || combined.includes('bake')) {
    return 'Baking & Desserts';
  }
  if (combined.includes('breakfast') || combined.includes('pancake') || combined.includes('oat') || combined.includes('egg')) {
    return 'Breakfast';
  }
  if (combined.includes('italian') || combined.includes('pasta') || combined.includes('pizza') || combined.includes('risotto')) {
    return 'Italian';
  }
  if (combined.includes('asian') || combined.includes('stir fry') || combined.includes('teriyaki') || combined.includes('curry')) {
    return 'Asian Fusion';
  }
  if (combined.includes('mexican') || combined.includes('taco') || combined.includes('fajita')) {
    return 'Mexican';
  }
  if (combined.includes('protein') || combined.includes('high protein') || combined.includes('macro')) {
    return 'High Protein';
  }
  if (combined.includes('salad') || combined.includes('bowl')) {
    return 'Bowls & Salads';
  }
  return 'General Recipe';
}

/**
 * Parse browser bookmark HTML export (Netscape format)
 */
export function parseBookmarkHtml(htmlContent: string): BookmarkParseResult {
  const items: BookmarkItem[] = [];
  const folderSet = new Set<string>();

  // Browser DOMParser is available in the window environment
  if (typeof window !== 'undefined' && typeof window.DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');

      // Helper to traverse nodes while maintaining folder hierarchy
      const walk = (node: Node, currentFolderStack: string[]) => {
        let activeFolder = [...currentFolderStack];

        for (let i = 0; i < node.childNodes.length; i++) {
          const child = node.childNodes[i];

          if (child.nodeType === Node.ELEMENT_NODE) {
            const el = child as HTMLElement;
            const tag = el.tagName.toUpperCase();

            // Folder header (H3)
            if (tag === 'H3') {
              const folderName = el.textContent?.trim();
              if (folderName && folderName !== 'Bookmarks' && folderName !== 'Bookmarks bar') {
                activeFolder = [...currentFolderStack, folderName];
                folderSet.add(folderName);
              }
            } else if (tag === 'A') {
              const href = el.getAttribute('href');
              if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
                const title = el.textContent?.trim() || href;
                let domain = '';
                try {
                  domain = new URL(href).hostname.replace(/^www\./, '');
                } catch {
                  domain = 'web';
                }

                const isLikelyRecipe = checkIsLikelyRecipe(title, href, activeFolder);
                const category = suggestCategory(title, activeFolder);

                items.push({
                  id: `bm_${items.length}_${Math.random().toString(36).substr(2, 6)}`,
                  title,
                  url: href,
                  folderPath: activeFolder,
                  addDate: el.getAttribute('add_date') || undefined,
                  icon: el.getAttribute('icon') || undefined,
                  domain,
                  isLikelyRecipe,
                  categorySuggestion: category,
                });
              }
            } else if (tag === 'DL' || tag === 'P' || tag === 'DT') {
              walk(child, activeFolder);
            } else {
              walk(child, activeFolder);
            }
          }
        }
      };

      walk(doc.body || doc, []);
    } catch (err) {
      console.warn('DOMParser failed on bookmark HTML, falling back to regex:', err);
    }
  }

  // Fallback: If DOMParser yielded 0 items or wasn't available, use resilient regex
  if (items.length === 0) {
    const linkRegex = /<A\s+([^>]*href=["'](https?:\/\/[^"']+)["'][^>]*)>([\s\S]*?)<\/A>/gi;
    let match: RegExpExecArray | null;
    let idx = 0;

    while ((match = linkRegex.exec(htmlContent)) !== null) {
      const url = match[2];
      const rawTitle = match[3].replace(/<[^>]+>/g, '').trim();
      const title = rawTitle || url;
      let domain = '';
      try {
        domain = new URL(url).hostname.replace(/^www\./, '');
      } catch {
        domain = 'web';
      }

      const isLikelyRecipe = checkIsLikelyRecipe(title, url, []);
      const category = suggestCategory(title, []);

      items.push({
        id: `bm_${idx++}_${Math.random().toString(36).substr(2, 6)}`,
        title,
        url,
        folderPath: [],
        domain,
        isLikelyRecipe,
        categorySuggestion: category,
      });
    }
  }

  const recipeCount = items.filter((it) => it.isLikelyRecipe).length;

  return {
    totalFound: items.length,
    recipeCount,
    folders: Array.from(folderSet),
    items,
  };
}

/**
 * Parse JSON bookmarks (e.g. Firefox bookmark backup or Chrome bookmarks JSON)
 */
export function parseBookmarkJson(jsonContent: string): BookmarkParseResult {
  const items: BookmarkItem[] = [];
  const folderSet = new Set<string>();

  try {
    const data = JSON.parse(jsonContent);

    const traverse = (node: any, currentFolderStack: string[]) => {
      if (!node) return;

      // Handle folder
      let activeFolder = [...currentFolderStack];
      if (node.title && !node.uri && !node.url) {
        activeFolder = [...currentFolderStack, node.title];
        folderSet.add(node.title);
      } else if (node.name && !node.url) {
        activeFolder = [...currentFolderStack, node.name];
        folderSet.add(node.name);
      }

      // Handle bookmark link
      const url = node.uri || node.url;
      if (url && typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
        const title = node.title || node.name || url;
        let domain = '';
        try {
          domain = new URL(url).hostname.replace(/^www\./, '');
        } catch {
          domain = 'web';
        }

        const isLikelyRecipe = checkIsLikelyRecipe(title, url, activeFolder);
        const category = suggestCategory(title, activeFolder);

        items.push({
          id: `bm_json_${items.length}_${Math.random().toString(36).substr(2, 6)}`,
          title,
          url,
          folderPath: activeFolder,
          domain,
          isLikelyRecipe,
          categorySuggestion: category,
        });
      }

      // Traverse children or roots
      if (Array.isArray(node.children)) {
        for (const child of node.children) {
          traverse(child, activeFolder);
        }
      }
      if (node.roots && typeof node.roots === 'object') {
        for (const root of Object.values(node.roots)) {
          traverse(root, activeFolder);
        }
      }
    };

    if (Array.isArray(data)) {
      for (const entry of data) traverse(entry, []);
    } else {
      traverse(data, []);
    }
  } catch (err) {
    console.warn('Failed to parse bookmarks as JSON:', err);
  }

  const recipeCount = items.filter((it) => it.isLikelyRecipe).length;

  return {
    totalFound: items.length,
    recipeCount,
    folders: Array.from(folderSet),
    items,
  };
}

/**
 * Universal bookmark parser: auto-detects HTML vs JSON vs text
 */
export function parseAnyBookmarkContent(content: string): BookmarkParseResult {
  const trimmed = content.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return parseBookmarkJson(trimmed);
  }
  return parseBookmarkHtml(trimmed);
}
