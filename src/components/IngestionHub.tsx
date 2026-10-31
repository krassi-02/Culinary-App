import React, { useState, useMemo } from 'react';
import { Recipe, Ingredient } from '../types';
import {
  Globe,
  Image as ImageIcon,
  FileText,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Upload,
  Camera,
  Facebook,
  ExternalLink,
  Clipboard,
  X,
  Bookmark,
  BookmarkCheck,
  Folder,
  CheckSquare,
  Square,
  Search,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  RotateCcw,
  PlusCircle,
} from 'lucide-react';
import { runImageOCR, OCRProgress } from '../lib/ocrEngine';
import { parseRawRecipeText, parseIngredientLine } from '../lib/recipeParser';
import { calculateRecipeNutrition } from '../lib/nutritionDatabase';
import { isDraftComplete, mapAiFallbackToRecipe, importRecipeFromUrl } from '../lib/urlRecipeImport';
import {
  BookmarkItem,
  BookmarkParseResult,
  parseAnyBookmarkContent,
} from '../lib/bookmarkParser';

interface IngestionHubProps {
  onRecipeImported: (recipe: Recipe) => void;
  onOpenRecipeEditor: (draft: Partial<Recipe>) => void;
  onBatchRecipesImported?: (recipes: Recipe[]) => void;
}

export const IngestionHub: React.FC<IngestionHubProps> = ({
  onRecipeImported,
  onOpenRecipeEditor,
  onBatchRecipesImported,
}) => {
  const [activeTab, setActiveTab] = useState<'url' | 'bookmarks' | 'image' | 'text'>('url');

  // URL state
  const [urlInput, setUrlInput] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Manual Paste Assistant for protected sites (Facebook, anti-bot challenge)
  const [manualPastePrompt, setManualPastePrompt] = useState<{
    active: boolean;
    platform: 'facebook' | 'web';
    sourceUrl: string;
    sourceType: 'facebook' | 'bookmark';
    message: string;
    pastedText: string;
  } | null>(null);

  // Image OCR state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<OCRProgress | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);

  // Raw text state
  const [rawTextInput, setRawTextInput] = useState('');

  // Extracted Result Draft
  const [extractedDraft, setExtractedDraft] = useState<Partial<Recipe> | null>(null);
  const [lastRawText, setLastRawText] = useState('');
  const [parsedMethod, setParsedMethod] = useState<'deterministic' | 'ai-fallback'>('deterministic');
  const [aiFallbackLoading, setAiFallbackLoading] = useState(false);
  const [aiFallbackError, setAiFallbackError] = useState<string | null>(null);

  // Browser Bookmarks state
  const [bookmarkResult, setBookmarkResult] = useState<BookmarkParseResult | null>(null);
  const [bookmarkFileName, setBookmarkFileName] = useState<string>('');
  const [bookmarkFilterOnlyRecipes, setBookmarkFilterOnlyRecipes] = useState(true);
  const [bookmarkSearchQuery, setBookmarkSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [selectedBookmarkIds, setSelectedBookmarkIds] = useState<Set<string>>(new Set());
  const [importedBookmarkUrls, setImportedBookmarkUrls] = useState<Set<string>>(new Set());
  const [bookmarkRawInput, setBookmarkRawInput] = useState('');
  const [showPastedBookmarksInput, setShowPastedBookmarksInput] = useState(false);
  const [showExportGuide, setShowExportGuide] = useState(false);
  const [bookmarkStatusMessage, setBookmarkStatusMessage] = useState<string | null>(null);
  const [bulkImportProgress, setBulkImportProgress] = useState<{ done: number; total: number } | null>(null);

  // Sample browser bookmark export for 1-click test
  const SAMPLE_BOOKMARK_EXPORT = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3 ADD_DATE="1698000000">Bookmarks bar</H3>
    <DL><p>
        <DT><H3 ADD_DATE="1698000000">Healthy Dinner Recipes</H3>
        <DL><p>
            <DT><A HREF="https://www.allrecipes.com/recipe/23891/pasta-salad/" ADD_DATE="1698000000">Classic Italian Zesty Pasta Salad - Allrecipes</A>
            <DT><A HREF="https://www.instagram.com/p/De8DbcQOpS-/" ADD_DATE="1698000000">Cottage Cheese Chocolate Chip Cookies Reel (@mattwest)</A>
            <DT><A HREF="https://www.facebook.com/posts/crispy-garlic-chicken" ADD_DATE="1698000000">Crispy Garlic Herb Roast Chicken - Facebook Post</A>
            <DT><A HREF="https://pinterest.com/pin/healthy-protein-bowls" ADD_DATE="1698000000">Glazed Salmon & Edamame Grain Bowl - Pinterest Pin</A>
            <DT><A HREF="https://www.foodnetwork.com/recipes/rachael-ray/lemon-chicken-recipe-1941655" ADD_DATE="1698000000">Skillet Lemon Herb Garlic Chicken - Food Network</A>
        </DL><p>
        <DT><H3 ADD_DATE="1698000000">Weekend Baking</H3>
        <DL><p>
            <DT><A HREF="https://www.allrecipes.com/recipe/10813/best-chocolate-chip-cookies/" ADD_DATE="1698000000">Chewy Soft Chocolate Chip Cookies</A>
            <DT><A HREF="https://sallysbakingaddiction.com/easy-homemade-bread/" ADD_DATE="1698000000">Artisan Rustic Crusty Bread Recipe</A>
        </DL><p>
        <DT><H3 ADD_DATE="1698000000">Dev & Tech</H3>
        <DL><p>
            <DT><A HREF="https://github.com">GitHub Developer Hub</A>
            <DT><A HREF="https://news.ycombinator.com">Hacker News</A>
        </DL><p>
    </DL><p>
</DL><p>`;

  // Handle uploaded bookmark HTML / JSON file
  const handleBookmarkFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parseAnyBookmarkContent(text);
      setBookmarkResult(parsed);
      setBookmarkFileName(file.name);
      const recipeIds = new Set(parsed.items.filter((it) => it.isLikelyRecipe).map((it) => it.id));
      setSelectedBookmarkIds(recipeIds);
      setBookmarkStatusMessage(
        `Loaded ${parsed.totalFound} bookmarks from "${file.name}". Automatically identified ${parsed.recipeCount} recipe links!`
      );
    } catch (err: any) {
      setBookmarkStatusMessage(`Failed to read file: ${err.message}`);
    }
  };

  // Handle 1-click sample browser export
  const handleLoadSampleBookmarks = () => {
    const parsed = parseAnyBookmarkContent(SAMPLE_BOOKMARK_EXPORT);
    setBookmarkResult(parsed);
    setBookmarkFileName('Chrome_Recipes_Bookmarks_Export.html');
    const recipeIds = new Set(parsed.items.filter((it) => it.isLikelyRecipe).map((it) => it.id));
    setSelectedBookmarkIds(recipeIds);
    setBookmarkStatusMessage(
      `Loaded sample Chrome bookmark export with ${parsed.totalFound} total links and ${parsed.recipeCount} recipes across 2 recipe folders.`
    );
  };

  // Handle raw pasted bookmark HTML or URLs
  const handleParsePastedBookmarks = () => {
    if (!bookmarkRawInput.trim()) return;
    const parsed = parseAnyBookmarkContent(bookmarkRawInput);
    setBookmarkResult(parsed);
    setBookmarkFileName('Pasted Bookmark Content');
    const recipeIds = new Set(parsed.items.filter((it) => it.isLikelyRecipe).map((it) => it.id));
    setSelectedBookmarkIds(recipeIds);
    setShowPastedBookmarksInput(false);
    setBookmarkStatusMessage(
      `Parsed ${parsed.totalFound} bookmarks from pasted content with ${parsed.recipeCount} identified recipes.`
    );
  };

  // Filtered bookmark items based on active search, folder, and recipe toggle
  const filteredBookmarks = useMemo(() => {
    if (!bookmarkResult) return [];
    return bookmarkResult.items.filter((item) => {
      if (bookmarkFilterOnlyRecipes && !item.isLikelyRecipe) return false;
      if (selectedFolder !== 'all' && !item.folderPath.includes(selectedFolder)) return false;
      if (bookmarkSearchQuery.trim()) {
        const q = bookmarkSearchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchUrl = item.url.toLowerCase().includes(q);
        const matchDomain = item.domain.toLowerCase().includes(q);
        const matchFolder = item.folderPath.some((f) => f.toLowerCase().includes(q));
        if (!matchTitle && !matchUrl && !matchDomain && !matchFolder) return false;
      }
      return true;
    });
  }, [bookmarkResult, bookmarkFilterOnlyRecipes, selectedFolder, bookmarkSearchQuery]);

  // Toggle single bookmark selection
  const toggleBookmarkSelect = (id: string) => {
    setSelectedBookmarkIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Toggle select all filtered bookmarks
  const toggleSelectAllFiltered = () => {
    const allFilteredSelected = filteredBookmarks.every((it) => selectedBookmarkIds.has(it.id));
    setSelectedBookmarkIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredBookmarks.forEach((it) => next.delete(it.id));
      } else {
        filteredBookmarks.forEach((it) => next.add(it.id));
      }
      return next;
    });
  };

  // Pick an appetizing preview image for bookmark cards
  const getImageForBookmark = (bm: BookmarkItem) => {
    const lower = `${bm.title} ${bm.categorySuggestion || ''}`.toLowerCase();
    if (lower.includes('salmon') || lower.includes('grain') || lower.includes('bowl')) {
      return '';
    }
    if (lower.includes('cookie') || lower.includes('oat') || lower.includes('bake') || lower.includes('bread') || lower.includes('dessert')) {
      return '';
    }
    return '';
  };

  // Batch import selected bookmarks to Recipe Vault
  const bookmarkSourceType = (url: string): Recipe['sourceType'] => {
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('facebook.com') || url.includes('fb.watch')) return 'facebook';
    if (url.includes('pinterest.com') || url.includes('pin.it')) return 'pinterest';
    return 'bookmark';
  };

  // Uses the fetched recipe when one was read; otherwise saves the bookmark as a link placeholder
  const buildBookmarkRecipe = (bm: BookmarkItem, idx: number, draft: Partial<Recipe> | null): Recipe => {
    const folderLabel = bm.folderPath.join(' / ') || 'Bookmarks Bar';
    return {
      id: `rec_bm_${Date.now()}_${idx}`,
      title: draft?.title || bm.title,
      description: draft?.description || `Imported from browser bookmark (${bm.domain})${bm.folderPath.length > 0 ? ` in folder "${bm.folderPath.join(' > ')}"` : ''}.`,
      sourceUrl: bm.url,
      sourceType: bookmarkSourceType(bm.url),
      imageUrl: draft?.imageUrl || '',
      prepTimeMinutes: draft?.prepTimeMinutes || 10,
      cookTimeMinutes: draft?.cookTimeMinutes || 20,
      standardServings: draft?.standardServings || 2,
      cuisine: draft?.cuisine || bm.categorySuggestion || 'Home Cooking',
      difficulty: 'Easy',
      ingredients: draft?.ingredients?.length
        ? draft.ingredients
        : [{ id: `ing_bm_${idx}_0`, name: `Original recipe source from ${bm.domain}`, quantity: 1, unit: 'serving', category: 'pantry' }],
      instructions: draft?.instructions?.length
        ? draft.instructions
        : [
            `Open saved recipe link: ${bm.url}`,
            `Folder origin: ${folderLabel}`,
            `Use "Extract from Web URL" in the Ingestion Hub to parse the full ingredients list and auto-calculated nutritional macros.`,
          ],
      nutritionPerServing: draft?.nutritionPerServing ?? { calories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0, fiberGrams: 0 },
      tags: [...(draft?.tags ?? []), 'Browser Bookmark', bm.domain, ...(bm.folderPath || [])],
      createdAt: new Date().toISOString(),
    };
  };

  // Batch import selected bookmarks to Recipe Vault, reading each page and falling back to AI when needed
  const handleImportSelectedBookmarks = async () => {
    if (!bookmarkResult || bulkImportProgress) return;
    const itemsToImport = bookmarkResult.items.filter((it) => selectedBookmarkIds.has(it.id));
    if (itemsToImport.length === 0) return;

    setBulkImportProgress({ done: 0, total: itemsToImport.length });
    const newRecipes: Recipe[] = [];
    let unreadableCount = 0;
    for (const [idx, bm] of itemsToImport.entries()) {
      let draft: Partial<Recipe> | null = null;
      try {
        draft = await importRecipeFromUrl(bm.url);
      } catch {
        draft = null;
      }
      if (!draft) unreadableCount += 1;
      newRecipes.push(buildBookmarkRecipe(bm, idx, draft));
      setBulkImportProgress({ done: idx + 1, total: itemsToImport.length });
    }
    setBulkImportProgress(null);

    if (onBatchRecipesImported) {
      onBatchRecipesImported(newRecipes);
    } else {
      newRecipes.forEach((r) => onRecipeImported(r));
    }

    setImportedBookmarkUrls((prev) => new Set([...prev, ...newRecipes.map((r) => r.sourceUrl!)]));
    setBookmarkStatusMessage(
      unreadableCount > 0
        ? `Imported ${newRecipes.length} bookmark recipes. ${unreadableCount} could not be read automatically and were saved as links only.`
        : `Successfully imported ${newRecipes.length} bookmark recipes into your collection!`
    );
  };

  // Helper sample URLs for 1-click test with real Instagram Reel and Facebook examples
  const sampleUrls = [
    { label: 'Instagram Reel (Matt West Cookies)', url: 'https://www.instagram.com/p/De8DbcQOpS-/' },
    { label: 'Facebook Recipe Post', url: 'https://www.facebook.com/posts/crispy-garlic-chicken' },
    { label: 'Pinterest Food Pin', url: 'https://pinterest.com/pin/healthy-protein-bowls' },
    { label: 'AllRecipes Pasta Salad', url: 'https://www.allrecipes.com/recipe/23891/pasta-salad/' },
    { label: 'Food Network Lemon Chicken', url: 'https://www.foodnetwork.com/recipes/rachael-ray/lemon-chicken-recipe-1941655' },
  ];

  // 1. Handle URL Ingestion (Server-Side JSON-LD & Microdata Scraper)
  const handleScrapeUrl = async (targetUrl?: string) => {
    const urlToFetch = targetUrl || urlInput;
    if (!urlToFetch.trim()) return;

    setUrlLoading(true);
    setUrlError(null);
    setExtractedDraft(null);

    try {
      const res = await fetch('/api/scrape-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlToFetch }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to extract recipe from URL');
      }

      const scraped = json.data;

      // Handle protected sites (Facebook anti-bot / login wall) with inline assistant
      if (scraped.requiresManualPaste) {
        setManualPastePrompt({
          active: true,
          platform: scraped.platform || (urlToFetch.includes('facebook') ? 'facebook' : 'web'),
          sourceUrl: scraped.sourceUrl || urlToFetch,
          sourceType: scraped.sourceType || (urlToFetch.includes('facebook') ? 'facebook' : 'bookmark'),
          message: scraped.message || 'Please paste the recipe text or caption below.',
          pastedText: '',
        });
        return;
      }

      const parsedIngredients: Ingredient[] = (scraped.rawIngredients || []).map((raw: string) =>
        parseIngredientLine(raw)
      );

      const isAIFallback = scraped.parsedVia?.startsWith('ai-fallback');
      const isComplete = isDraftComplete(
        parsedIngredients,
        scraped.instructions || [],
        scraped.standardServings,
        scraped.detectedNutrition
      );

      // If deterministic extraction failed to identify ingredients or macros, kick the AI!
      if (!isComplete && !isAIFallback) {
        console.log('Deterministic URL extraction incomplete (missing ingredients or macros). Kicking AI fallback...');
        const promptSnippet = `${scraped.title || ''}\n${scraped.description || ''}\nIngredients:\n${(scraped.rawIngredients || []).join('\n')}\nInstructions:\n${(scraped.instructions || []).join('\n')}`;
        await runAiFallback(promptSnippet, `URL: ${urlToFetch} (Ingredients or macros missing from web page)`, {
          sourceUrl: scraped.sourceUrl,
          sourceType: scraped.sourceType,
          imageUrl: scraped.imageUrl,
        });
        return;
      }

      const draft: Partial<Recipe> = {
        title: scraped.title,
        description: scraped.description,
        sourceUrl: scraped.sourceUrl,
        sourceType: scraped.sourceType,
        imageUrl: scraped.imageUrl || '',
        prepTimeMinutes: scraped.prepTimeMinutes,
        cookTimeMinutes: scraped.cookTimeMinutes,
        standardServings: scraped.standardServings,
        ingredients: parsedIngredients,
        instructions: scraped.instructions,
        nutritionPerServing: scraped.detectedNutrition?.calories ? scraped.detectedNutrition : undefined,
        tags: ['Web Ingested'],
      };

      setExtractedDraft(draft);
      setParsedMethod(isAIFallback ? 'ai-fallback' : 'deterministic');
      setManualPastePrompt(null);
    } catch (err: any) {
      setUrlError(err.message || 'Could not parse recipe from URL. Try pasting the text manually.');
    } finally {
      setUrlLoading(false);
    }
  };

  // AI Fallback Runner for foreign languages, non-standard formats, or missing macros
  const runAiFallback = async (textToParse: string, contextNote?: string, overrideDraft?: Partial<Recipe>) => {
    if (!textToParse.trim()) return;
    setAiFallbackLoading(true);
    setAiFallbackError(null);
    try {
      const res = await fetch('/api/ai-recipe-fallback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToParse, context: contextNote }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Fallback model failed to extract recipe and macros');
      }
      const data = json.data;
      const draft = mapAiFallbackToRecipe(data, overrideDraft || extractedDraft || {});
      setExtractedDraft(draft);
      setParsedMethod('ai-fallback');
      setManualPastePrompt(null);
    } catch (err: any) {
      setAiFallbackError(err.message || 'AI fallback parsing error');
    } finally {
      setAiFallbackLoading(false);
    }
  };

  // 2. Handle Image Upload & OCR
  const handleImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setExtractedDraft(null);
    setOcrError(null);
  };

  const handleRunImageOCR = async () => {
    if (!imageFile) return;

    setOcrLoading(true);
    setOcrError(null);
    setOcrProgress({ status: 'Initializing OCR Engine', progress: 5 });

    try {
      const { rawText, recipeDraft } = await runImageOCR(imageFile, (p) => {
        setOcrProgress(p);
      });

      setLastRawText(rawText);
      recipeDraft.imageUrl = imagePreview || '';
      recipeDraft.sourceType = 'image';

      // If deterministic OCR did not identify complete ingredients OR macros, kick the AI!
      const isComplete = isDraftComplete(
        recipeDraft.ingredients || [],
        recipeDraft.instructions || [],
        recipeDraft.standardServings || 2
      );

      if (!isComplete) {
        console.log('Deterministic OCR did not identify complete ingredients or macros. Kicking AI fallback...');
        await runAiFallback(rawText, 'From Image OCR: Missing ingredients or macros');
      } else {
        setExtractedDraft(recipeDraft);
        setParsedMethod('deterministic');
      }
    } catch (err: any) {
      setOcrError(err.message || 'Failed to extract text from image');
    } finally {
      setOcrLoading(false);
    }
  };

  // 3. Handle Raw Text / Bookmark Notes
  const handleParseRawText = async () => {
    if (!rawTextInput.trim()) return;
    setLastRawText(rawTextInput);

    const parsed = parseRawRecipeText(rawTextInput, 'bookmark');
    
    // If deterministic parsing did not identify ingredients or macros, kick the AI!
    const isComplete = isDraftComplete(
      parsed.ingredients || [],
      parsed.instructions || [],
      parsed.standardServings || 2
    );

    if (!isComplete) {
      console.log('Raw text parser did not identify complete ingredients or macros. Kicking AI fallback...');
      await runAiFallback(rawTextInput, 'From Raw Text: Missing ingredients or macros');
    } else {
      setExtractedDraft(parsed);
      setParsedMethod('deterministic');
    }
  };

  // Final confirmation to vault
  const handleSaveDraft = () => {
    if (!extractedDraft || !extractedDraft.title) return;
    const standardServings = extractedDraft.standardServings || 2;
    const ingredients = extractedDraft.ingredients || [];
    const nutrition = extractedDraft.nutritionPerServing?.calories
      ? extractedDraft.nutritionPerServing
      : calculateRecipeNutrition(ingredients, standardServings);

    const completeRecipe: Recipe = {
      id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      title: extractedDraft.title,
      description: extractedDraft.description || 'Imported via recipe pipeline.',
      sourceUrl: extractedDraft.sourceUrl,
      sourceType: extractedDraft.sourceType || 'bookmark',
      imageUrl: extractedDraft.imageUrl || '',
      prepTimeMinutes: extractedDraft.prepTimeMinutes || 15,
      cookTimeMinutes: extractedDraft.cookTimeMinutes || 20,
      standardServings,
      ingredients,
      instructions: extractedDraft.instructions || ['Follow standard preparation and cooking steps.'],
      nutritionPerServing: nutrition,
      tags: extractedDraft.tags || ['Standardized'],
      cuisine: extractedDraft.cuisine || 'Home Cooking',
      createdAt: new Date().toISOString(),
    };

    onRecipeImported(completeRecipe);
    setExtractedDraft(null);
    setUrlInput('');
    setRawTextInput('');
    setImageFile(null);
    setImagePreview(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-4">
      {/* Editorial Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-1">
          <span>Non-AI Deterministic Extraction Engine</span>
        </div>
        <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight">
          Import & Standardize Recipes
        </h1>
        <p className="mt-2 text-sm text-zinc-600 max-w-2xl leading-relaxed">
          Translate messy Pinterest pins, Instagram reels, bookmarks, photo screenshots, or video cards into your clean, standardized user recipe vault with automated serving-size nutrition calculations.
        </p>
      </div>

      {/* Tab Segmented Controls */}
      <div className="flex items-center gap-1 p-1 bg-zinc-200/80 rounded-xl max-w-2xl overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('url')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'url' ? 'bg-white text-zinc-900 shadow-xs font-semibold' : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Single Link (Web, Reel, FB)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bookmarks')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'bookmarks' ? 'bg-white text-zinc-900 shadow-xs font-semibold' : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5 text-amber-600" />
          <span>Browser Bookmarks Export</span>
          <span className="text-[9px] uppercase px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded font-bold">
            HTML
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('image')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'image' ? 'bg-white text-zinc-900 shadow-xs font-semibold' : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Image / Pin OCR</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('text')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'text' ? 'bg-white text-zinc-900 shadow-xs font-semibold' : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Raw Text</span>
        </button>
      </div>

      {/* Ingestion Panels */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs">
        {/* TAB 1: URL INGESTION (WEB, INSTAGRAM & FACEBOOK) */}
        {activeTab === 'url' && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-zinc-900">
                  Extract from Web URL, Instagram Reel, or Facebook Post
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md">
                  Instagram Reel
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
                  Facebook Post
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Paste any link from Instagram reels (e.g. <code className="text-zinc-800 bg-zinc-100 px-1 py-0.5 rounded text-[11px]">instagram.com/p/...</code>), Facebook posts, Pinterest, or food blogs. Parses ingredients, instructions, and macro profile.
              </p>
            </div>

            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Paste Instagram reel, Facebook post, or recipe URL..."
                className="flex-1 px-3.5 py-2.5 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
              <button
                type="button"
                disabled={urlLoading || !urlInput.trim()}
                onClick={() => handleScrapeUrl()}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 disabled:opacity-50 transition-colors flex items-center gap-2 shrink-0 shadow-xs"
              >
                {urlLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Extracting...</span>
                  </>
                ) : (
                  <>
                    <span>Extract Recipe</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

            {/* Quick Demo URLs */}
            <div className="flex items-center gap-2 text-xs text-zinc-500 pt-1">
              <span>Try with a sample link:</span>
              <div className="flex flex-wrap gap-2">
                {sampleUrls.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setUrlInput(s.url);
                      handleScrapeUrl(s.url);
                    }}
                    className="text-emerald-700 hover:text-emerald-800 hover:underline bg-emerald-50 px-2 py-0.5 rounded text-xs font-medium"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Inline Assist Card for Facebook / Anti-Bot Protected Sites */}
            {manualPastePrompt && manualPastePrompt.active && (
              <div className="mt-3 p-4 rounded-xl border border-blue-200 bg-blue-50/70 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    {manualPastePrompt.platform === 'facebook' ? (
                      <div className="w-7 h-7 rounded-lg bg-[#1877F2] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                        <Facebook className="w-4 h-4 fill-white text-white" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-zinc-800 text-white flex items-center justify-center shrink-0 mt-0.5">
                        <Globe className="w-4 h-4" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-zinc-900">
                          {manualPastePrompt.platform === 'facebook'
                            ? 'Facebook Recipe Post Assist'
                            : 'Protected Web Recipe Assist'}
                        </h4>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                          Instant AI Extraction
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-600 mt-0.5">
                        {manualPastePrompt.message}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setManualPastePrompt(null)}
                    className="text-zinc-400 hover:text-zinc-600 p-1"
                    title="Dismiss"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Source link & Fast Paste Helpers */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-blue-100/80 text-xs">
                  <div className="flex items-center gap-1.5 text-zinc-600 truncate max-w-sm">
                    <span className="font-semibold text-zinc-700">Source:</span>
                    <a
                      href={manualPastePrompt.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 hover:underline truncate max-w-xs flex items-center gap-1 font-mono text-[11px]"
                    >
                      <span className="truncate">{manualPastePrompt.sourceUrl}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const clipText = await navigator.clipboard.readText();
                          if (clipText) {
                            setManualPastePrompt((prev) => (prev ? { ...prev, pastedText: clipText } : null));
                          }
                        } catch (err) {
                          // Browser clipboard permissions may be restricted in some iframe contexts
                        }
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-blue-700 bg-white border border-blue-200 rounded-md hover:bg-blue-50 transition-colors shadow-2xs"
                    >
                      <Clipboard className="w-3 h-3" />
                      <span>Paste from Clipboard</span>
                    </button>

                    {manualPastePrompt.platform === 'facebook' && (
                      <button
                        type="button"
                        onClick={() => {
                          const sampleFbText = `Crispy Air Fryer Garlic Herb Chicken & Potatoes 🍗✨
Makes 4 servings | Per serving: 420 kcal | 42g Protein | 32g Carbs | 14g Fat

Ingredients:
- 600g chicken breasts, cut into bite-sized cubes
- 400g baby potatoes, quartered
- 2 tbsp olive oil
- 1 tbsp smoked paprika
- 1 tsp garlic powder
- 1 tsp dried Italian oregano
- 1 tsp coarse sea salt
- 1/2 tsp cracked black pepper
- 3 cloves fresh garlic, minced
- Fresh chopped parsley

Instructions:
1. Preheat air fryer to 200°C / 400°F.
2. In a bowl, toss potato quarters with 1 tbsp olive oil, salt, and smoked paprika. Air fry for 12 minutes shaking halfway.
3. In another bowl, coat chicken cubes with remaining olive oil, minced garlic, oregano, garlic powder, salt, and pepper.
4. Add chicken cubes into the air fryer basket alongside the potatoes. Air fry for 10-12 minutes until chicken is golden and cooked through (74°C / 165°F).
5. Toss with freshly chopped parsley and enjoy!`;
                          setManualPastePrompt((prev) => (prev ? { ...prev, pastedText: sampleFbText } : null));
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-colors shadow-2xs"
                      >
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        <span>Load Sample FB Post</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Textarea */}
                <div>
                  <textarea
                    rows={4}
                    value={manualPastePrompt.pastedText}
                    onChange={(e) =>
                      setManualPastePrompt((prev) => (prev ? { ...prev, pastedText: e.target.value } : null))
                    }
                    placeholder="Paste Facebook post caption, recipe text, or ingredient list here..."
                    className="w-full px-3 py-2 text-xs border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white placeholder:text-zinc-400 font-sans leading-relaxed"
                  />
                </div>

                {/* Submit button */}
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={aiFallbackLoading || !manualPastePrompt.pastedText.trim()}
                    onClick={() => {
                      if (!manualPastePrompt.pastedText.trim()) return;
                      runAiFallback(
                        manualPastePrompt.pastedText,
                        `${manualPastePrompt.platform === 'facebook' ? 'Facebook' : 'Web'} Post: ${manualPastePrompt.sourceUrl}`,
                        {
                          sourceUrl: manualPastePrompt.sourceUrl,
                          sourceType: manualPastePrompt.sourceType,
                          imageUrl: '',
                        }
                      );
                    }}
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    {aiFallbackLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Standardizing & Calculating Macros...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Standardize Recipe with AI</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {urlError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{urlError}</span>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: BROWSER BOOKMARKS EXPORT (CHROME, SAFARI, FIREFOX, EDGE) */}
        {activeTab === 'bookmarks' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-zinc-900">
                    Import Links from Browser Bookmarks Export
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md">
                    Universal HTML / JSON
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Export your bookmarks file from Chrome, Safari, Firefox, Edge, or Brave. We automatically parse folders, detect culinary recipe links, and categorize them for batch import.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowExportGuide(!showExportGuide)}
                className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200/80 px-2.5 py-1.5 rounded-lg font-medium transition-colors shrink-0 self-start sm:self-auto"
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>How to export bookmarks</span>
                {showExportGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Quick Export Guide Accordion */}
            {showExportGuide && (
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-zinc-700 space-y-2.5 animate-in fade-in duration-150">
                <h4 className="font-bold text-amber-950 flex items-center gap-1.5">
                  <Bookmark className="w-4 h-4 text-amber-700" />
                  <span>How to export your bookmarks in 10 seconds:</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                  <div className="p-2.5 bg-white rounded-lg border border-amber-200/80 shadow-2xs">
                    <p className="font-bold text-zinc-900 mb-1">Google Chrome / Brave</p>
                    <p className="text-[11px] text-zinc-600 leading-relaxed">
                      Press <kbd className="px-1 py-0.5 bg-zinc-100 border rounded font-mono text-[10px]">Ctrl+Shift+O</kbd> (<kbd className="px-1 py-0.5 bg-zinc-100 border rounded font-mono text-[10px]">⌘+⌥+B</kbd>) → Click <strong className="text-zinc-800">⋮</strong> (top right) → <strong className="text-zinc-800">Export bookmarks</strong>.
                    </p>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-amber-200/80 shadow-2xs">
                    <p className="font-bold text-zinc-900 mb-1">Apple Safari</p>
                    <p className="text-[11px] text-zinc-600 leading-relaxed">
                      In top Mac menu, click <strong className="text-zinc-800">File</strong> → <strong className="text-zinc-800">Export Bookmarks...</strong> → Save as <code className="text-[10px] bg-zinc-100 px-1 py-0.5 rounded font-mono">Safari Bookmarks.html</code>.
                    </p>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-amber-200/80 shadow-2xs">
                    <p className="font-bold text-zinc-900 mb-1">Mozilla Firefox</p>
                    <p className="text-[11px] text-zinc-600 leading-relaxed">
                      Press <kbd className="px-1 py-0.5 bg-zinc-100 border rounded font-mono text-[10px]">Ctrl+Shift+O</kbd> → Click <strong className="text-zinc-800">Import and Backup</strong> → <strong className="text-zinc-800">Export Bookmarks to HTML...</strong>.
                    </p>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-amber-200/80 shadow-2xs">
                    <p className="font-bold text-zinc-900 mb-1">Microsoft Edge</p>
                    <p className="text-[11px] text-zinc-600 leading-relaxed">
                      Press <kbd className="px-1 py-0.5 bg-zinc-100 border rounded font-mono text-[10px]">Ctrl+Shift+O</kbd> → Click <strong className="text-zinc-800">...</strong> in the Favorites flyout → <strong className="text-zinc-800">Export favorites</strong>.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Upload Zone & Quick Sample Button */}
            {!bookmarkResult ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* File Dropzone */}
                <label className="border-2 border-dashed border-zinc-300 hover:border-amber-400 hover:bg-amber-50/20 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-zinc-50/50">
                  <input
                    type="file"
                    accept=".html,.htm,.json,.txt"
                    onChange={handleBookmarkFileUpload}
                    className="hidden"
                  />
                  <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mb-3 shadow-2xs">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-zinc-800">
                    Upload Browser Bookmarks Export File
                  </span>
                  <span className="text-[11px] text-zinc-500 mt-1">
                    Supports <code className="bg-zinc-100 px-1 py-0.5 rounded font-mono">bookmarks.html</code>, <code className="bg-zinc-100 px-1 py-0.5 rounded font-mono">.json</code>, or <code className="bg-zinc-100 px-1 py-0.5 rounded font-mono">.txt</code>
                  </span>
                </label>

                {/* Quick Test & Paste Options */}
                <div className="border border-zinc-200 rounded-xl p-5 bg-zinc-50/60 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>Instant 1-Click Demo</span>
                    </span>
                    <p className="text-xs text-zinc-600 leading-relaxed">
                      Don't have your browser export handy? Test immediately with a sample export containing realistic recipe folders (<em className="text-zinc-800">Healthy Dinner Recipes, Weekend Baking</em>), Instagram Reel links, and Facebook cooking posts.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleLoadSampleBookmarks}
                      className="flex-1 px-4 py-2 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Load Sample Bookmarks</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowPastedBookmarksInput(!showPastedBookmarksInput)}
                      className="px-3.5 py-2 text-xs font-medium text-zinc-700 bg-white hover:bg-zinc-100 border border-zinc-300 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <FileText className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{showPastedBookmarksInput ? 'Hide Paste Box' : 'Paste HTML / Links'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* File Loaded Header with Reset Button */
              <div className="flex items-center justify-between p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-xs">
                    <BookmarkCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-900">{bookmarkFileName || 'Browser Bookmarks File'}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {bookmarkResult.recipeCount} Recipes Identified
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-600">
                      Total links: {bookmarkResult.totalFound} · Recipe folders: {bookmarkResult.folders.length}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="cursor-pointer px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors">
                    <input
                      type="file"
                      accept=".html,.htm,.json,.txt"
                      onChange={handleBookmarkFileUpload}
                      className="hidden"
                    />
                    <Upload className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Change File</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setBookmarkResult(null);
                      setBookmarkFileName('');
                      setSelectedBookmarkIds(new Set());
                      setBookmarkStatusMessage(null);
                    }}
                    className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-md"
                    title="Clear bookmarks"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Paste HTML Box if toggled */}
            {showPastedBookmarksInput && !bookmarkResult && (
              <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-800">
                    Paste raw Bookmarks HTML, JSON, or list of URLs:
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const clip = await navigator.clipboard.readText();
                        if (clip) setBookmarkRawInput(clip);
                      } catch (e) {}
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 hover:underline"
                  >
                    <Clipboard className="w-3 h-3" />
                    <span>Paste from Clipboard</span>
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={bookmarkRawInput}
                  onChange={(e) => setBookmarkRawInput(e.target.value)}
                  placeholder={`<DT><H3>My Recipes</H3>\n<DL><p>\n  <DT><A HREF="https://www.allrecipes.com/recipe/23891/pasta-salad/">Pasta Salad</A>\n  <DT><A HREF="https://instagram.com/p/...">Instagram Cookie Reel</A>\n</DL><p>`}
                  className="w-full p-2.5 text-xs font-mono border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-white"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    disabled={!bookmarkRawInput.trim()}
                    onClick={handleParsePastedBookmarks}
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 rounded-lg transition-colors shadow-xs"
                  >
                    Parse Pasted Bookmarks
                  </button>
                </div>
              </div>
            )}

            {/* Status Message Banner */}
            {bookmarkStatusMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>{bookmarkStatusMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setBookmarkStatusMessage(null)}
                  className="text-emerald-700 hover:text-emerald-900"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Parsed Bookmarks Review & Batch Import Table */}
            {bookmarkResult && (
              <div className="space-y-4 pt-2">
                {/* Filter and Search Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Recipes vs All toggle */}
                    <div className="inline-flex p-0.5 bg-zinc-200/80 rounded-lg text-xs">
                      <button
                        type="button"
                        onClick={() => setBookmarkFilterOnlyRecipes(true)}
                        className={`px-3 py-1 rounded-md font-medium transition-all ${
                          bookmarkFilterOnlyRecipes
                            ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                            : 'text-zinc-600 hover:text-zinc-900'
                        }`}
                      >
                        Likely Recipes ({bookmarkResult.recipeCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setBookmarkFilterOnlyRecipes(false)}
                        className={`px-3 py-1 rounded-md font-medium transition-all ${
                          !bookmarkFilterOnlyRecipes
                            ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                            : 'text-zinc-600 hover:text-zinc-900'
                        }`}
                      >
                        All Bookmarks ({bookmarkResult.totalFound})
                      </button>
                    </div>

                    {/* Folder Filter if folders exist */}
                    {bookmarkResult.folders.length > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-zinc-600">
                        <Folder className="w-3.5 h-3.5 text-zinc-400" />
                        <select
                          value={selectedFolder}
                          onChange={(e) => setSelectedFolder(e.target.value)}
                          className="px-2.5 py-1 text-xs border border-zinc-300 rounded-md bg-white focus:outline-none"
                        >
                          <option value="all">All Folders ({bookmarkResult.folders.length})</option>
                          {bookmarkResult.folders.map((f, idx) => (
                            <option key={idx} value={f}>
                              📁 {f}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Search box */}
                  <div className="relative min-w-[220px]">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      value={bookmarkSearchQuery}
                      onChange={(e) => setBookmarkSearchQuery(e.target.value)}
                      placeholder="Search title, URL, or folder..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-white"
                    />
                  </div>
                </div>

                {/* Selection & Batch Action Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                  <div className="flex items-center gap-3 text-xs text-zinc-600">
                    <button
                      type="button"
                      onClick={toggleSelectAllFiltered}
                      className="flex items-center gap-1.5 font-medium hover:text-zinc-900"
                    >
                      {filteredBookmarks.length > 0 &&
                      filteredBookmarks.every((it) => selectedBookmarkIds.has(it.id)) ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Square className="w-4 h-4 text-zinc-400" />
                      )}
                      <span>
                        {filteredBookmarks.every((it) => selectedBookmarkIds.has(it.id))
                          ? 'Deselect All'
                          : `Select All Filtered (${filteredBookmarks.length})`}
                      </span>
                    </button>

                    <span className="text-zinc-300">|</span>
                    <span className="font-semibold text-zinc-800">
                      {selectedBookmarkIds.size} of {bookmarkResult.items.length} selected
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={selectedBookmarkIds.size === 0 || bulkImportProgress !== null}
                    onClick={handleImportSelectedBookmarks}
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2 shadow-xs"
                  >
                    <BookmarkCheck className="w-4 h-4" />
                    <span>
                      {bulkImportProgress
                        ? `Reading recipes ${bulkImportProgress.done} of ${bulkImportProgress.total}...`
                        : `Import ${selectedBookmarkIds.size} Selected to Recipe Vault`}
                    </span>
                  </button>
                </div>

                {/* Bookmarks List */}
                <div className="border border-zinc-200 rounded-xl overflow-hidden divide-y divide-zinc-200 max-h-[460px] overflow-y-auto bg-white">
                  {filteredBookmarks.length === 0 ? (
                    <div className="p-8 text-center text-xs text-zinc-500">
                      No bookmarks match the current filter or search query.
                    </div>
                  ) : (
                    filteredBookmarks.map((item) => {
                      const isSelected = selectedBookmarkIds.has(item.id);
                      const isAlreadyImported = importedBookmarkUrls.has(item.url);

                      return (
                        <div
                          key={item.id}
                          className={`p-3.5 flex items-center justify-between gap-4 transition-colors ${
                            isSelected ? 'bg-amber-50/40' : 'hover:bg-zinc-50'
                          }`}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <button
                              type="button"
                              onClick={() => toggleBookmarkSelect(item.id)}
                              className="mt-0.5 text-zinc-400 hover:text-zinc-600 shrink-0"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Square className="w-4 h-4 text-zinc-300" />
                              )}
                            </button>

                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-bold text-zinc-900 hover:text-emerald-700 hover:underline truncate max-w-md flex items-center gap-1"
                                >
                                  <span className="truncate">{item.title}</span>
                                  <ExternalLink className="w-3 h-3 text-zinc-400 shrink-0" />
                                </a>

                                {item.isLikelyRecipe && (
                                  <span className="text-[10px] font-semibold px-2 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full shrink-0">
                                    Recipe
                                  </span>
                                )}

                                {isAlreadyImported && (
                                  <span className="text-[10px] font-semibold px-2 py-0.2 bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-full shrink-0 flex items-center gap-1">
                                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                    <span>In Vault</span>
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                                <span className="font-mono text-zinc-600 bg-zinc-100 px-1.5 py-0.2 rounded">
                                  {item.domain}
                                </span>

                                {item.folderPath.length > 0 && (
                                  <span className="flex items-center gap-1 text-zinc-600">
                                    <Folder className="w-3 h-3 text-zinc-400 shrink-0" />
                                    <span>{item.folderPath.join(' / ')}</span>
                                  </span>
                                )}

                                {item.categorySuggestion && (
                                  <span className="text-zinc-400">· {item.categorySuggestion}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Item Actions */}
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setUrlInput(item.url);
                                setActiveTab('url');
                                handleScrapeUrl(item.url);
                              }}
                              className="px-2.5 py-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors flex items-center gap-1 shadow-2xs"
                              title="Extract full recipe, ingredients, and nutrition macros via AI"
                            >
                              <Sparkles className="w-3 h-3 text-emerald-600" />
                              <span className="hidden sm:inline">Scrape & AI Macros</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const singleRec: Recipe = {
                                  id: `rec_bm_${Date.now()}`,
                                  title: item.title,
                                  description: `Imported from browser bookmark (${item.domain}).`,
                                  sourceUrl: item.url,
                                  sourceType: item.url.includes('instagram.com')
                                    ? 'instagram'
                                    : item.url.includes('facebook.com')
                                    ? 'facebook'
                                    : item.url.includes('pinterest.com')
                                    ? 'pinterest'
                                    : 'bookmark',
                                  imageUrl: getImageForBookmark(item),
                                  prepTimeMinutes: 10,
                                  cookTimeMinutes: 20,
                                  standardServings: 2,
                                  cuisine: item.categorySuggestion || 'Home Cooking',
                                  difficulty: 'Easy',
                                  ingredients: [
                                    {
                                      id: `ing_bm_s_${Date.now()}`,
                                      name: `Original recipe from ${item.domain}`,
                                      quantity: 1,
                                      unit: 'serving',
                                      category: 'pantry',
                                    },
                                  ],
                                  instructions: [`Visit saved recipe link: ${item.url}`],
                                  nutritionPerServing: {
                                    calories: 0,
                                    proteinGrams: 0,
                                    carbsGrams: 0,
                                    fatGrams: 0,
                                    fiberGrams: 0,
                                  },
                                  tags: ['Browser Bookmark', item.domain, ...(item.folderPath || [])],
                                  createdAt: new Date().toISOString(),
                                };
                                onRecipeImported(singleRec);
                                setImportedBookmarkUrls((prev) => new Set([...prev, item.url]));
                                setBookmarkStatusMessage(`Imported "${item.title}" into your recipe collection!`);
                              }}
                              className="px-2 py-1 text-[11px] font-medium text-zinc-700 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-md transition-colors shadow-2xs"
                              title="Save bookmark card to vault"
                            >
                              <PlusCircle className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: IMAGE / PIN OCR */}
        {activeTab === 'image' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-bold text-zinc-900">
                In-Browser Optical Character Recognition (OCR)
              </h3>
              <p className="text-xs text-zinc-500 mt-1">
                Drop a screenshot of a Pinterest recipe pin, Instagram caption, or cookbook photo. Text is recognized directly in your browser.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Drop area */}
              <label className="border-2 border-dashed border-zinc-300 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-zinc-400 bg-zinc-50/50 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelected}
                  className="hidden"
                />
                <Upload className="w-8 h-8 text-zinc-400 mb-2" />
                <span className="text-xs font-semibold text-zinc-800">
                  Click to select screenshot or pin image
                </span>
                <span className="text-[11px] text-zinc-400 mt-1">
                  Supports PNG, JPG, WebP
                </span>
              </label>

              {/* Preview & action */}
              <div className="border border-zinc-200 rounded-xl p-4 bg-zinc-50 flex flex-col justify-between">
                {imagePreview ? (
                  <div className="space-y-3">
                    <div className="aspect-[4/3] rounded-lg overflow-hidden bg-black/5">
                      <img
                        src={imagePreview}
                        alt="Pin preview"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={ocrLoading}
                      onClick={handleRunImageOCR}
                      className="w-full py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-colors shadow-2xs"
                    >
                      {ocrLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Recognizing Text ({ocrProgress?.progress || 0}%)...</span>
                        </>
                      ) : (
                        <>
                          <Camera className="w-3.5 h-3.5" />
                          <span>Run Client-Side OCR</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-zinc-400 text-center p-6">
                    Select an image to preview and run character recognition
                  </div>
                )}
              </div>
            </div>

            {ocrError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{ocrError}</span>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: RAW TEXT PARSER */}
        {activeTab === 'text' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-zinc-900">
                Rule-Based Raw Text Tokenizer
              </h3>
              <p className="text-xs text-zinc-500 mt-1">
                Paste copied text from Instagram captions, saved notes, or text bookmarks. Our deterministic culinary parser automatically detects fractions, units, and ingredients.
              </p>
            </div>

            <textarea
              rows={8}
              value={rawTextInput}
              onChange={(e) => setRawTextInput(e.target.value)}
              placeholder={`Creamy Tuscan Garlic Chicken\n\nIngredients:\n400g chicken breasts\n2 tbsp olive oil\n1 cup heavy cream or Greek yogurt\n150g baby spinach\n1/2 cup sun-dried tomatoes\n3 cloves garlic, minced\n\nInstructions:\n1. Season chicken with salt and pepper.\n2. Sear in skillet for 6 minutes each side.\n3. Add garlic and tomatoes, pour cream and simmer.`}
              className="w-full p-3.5 text-xs font-mono border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
            />

            <button
              type="button"
              disabled={!rawTextInput.trim()}
              onClick={handleParseRawText}
              className="px-5 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 rounded-lg transition-colors shadow-xs"
            >
              Parse Text Into Recipe
            </button>
          </div>
        )}
      </div>

      {aiFallbackError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{aiFallbackError}</span>
        </div>
      )}

      {/* EXTRACTED PREVIEW & CONFIRMATION BOX */}
      {extractedDraft && (
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-6 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-700" />
              <span className="text-sm font-bold text-zinc-900">
                {parsedMethod === 'ai-fallback'
                  ? 'Recipe & Macros Standardized via AI Fallback (Identified & Translated)'
                  : 'Recipe & Macros Standardized via Deterministic Parsing (Privacy & Non-AI)'}
              </span>
            </div>
            <span className="text-xs text-emerald-800 font-medium">
              Ready for User Repository
            </span>
          </div>

          <div className="bg-white rounded-xl p-5 border border-emerald-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {extractedDraft.imageUrl && (
                <div className="w-32 h-24 rounded-lg overflow-hidden bg-zinc-100 shrink-0">
                  <img
                    src={extractedDraft.imageUrl}
                    alt={extractedDraft.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1">
                <h4 className="text-lg font-bold text-zinc-900">{extractedDraft.title}</h4>
                <p className="text-xs text-zinc-600 mt-1 line-clamp-2">
                  {extractedDraft.description}
                </p>
                <div className="flex items-center gap-3 text-xs text-zinc-500 mt-2">
                  <span>Servings: {extractedDraft.standardServings || 2}</span>
                  <span>·</span>
                  <span>{extractedDraft.ingredients?.length || 0} ingredients identified</span>
                  <span>·</span>
                  <span>{extractedDraft.instructions?.length || 0} instruction steps</span>
                  {parsedMethod === 'ai-fallback' && (
                    <>
                      <span>·</span>
                      <span className="text-emerald-700 font-medium">AI Macro Kick Active</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Ingredients preview chip list */}
            <div>
              <span className="text-xs font-semibold text-zinc-700 block mb-1.5">
                Standardized Ingredients:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5 text-xs">
                {extractedDraft.ingredients?.map((ing, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-zinc-50 rounded border border-zinc-200">
                    <span className="capitalize text-zinc-800">{ing.name}</span>
                    <span className="font-mono font-semibold tabular-nums text-zinc-900">
                      {ing.quantity} {ing.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Estimated Nutrition Strip */}
            {extractedDraft.ingredients && extractedDraft.ingredients.length > 0 && (
              <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                <span className="text-[11px] font-semibold text-zinc-500 block mb-1">
                  Macronutrient Breakdown per Serving ({extractedDraft.standardServings || 2} portions):
                </span>
                {(() => {
                  const nut = (extractedDraft.nutritionPerServing && extractedDraft.nutritionPerServing.calories > 0)
                    ? extractedDraft.nutritionPerServing
                    : calculateRecipeNutrition(
                        extractedDraft.ingredients || [],
                        extractedDraft.standardServings || 2
                      );
                  return (
                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div>
                        <span className="text-zinc-400 text-[10px] block">Energy</span>
                        <span className="font-mono font-bold tabular-nums text-zinc-900">{nut.calories} kcal</span>
                      </div>
                      <div>
                        <span className="text-emerald-600 text-[10px] block">Protein</span>
                        <span className="font-mono font-bold tabular-nums text-emerald-700">{nut.proteinGrams}g</span>
                      </div>
                      <div>
                        <span className="text-amber-600 text-[10px] block">Carbs</span>
                        <span className="font-mono font-bold tabular-nums text-amber-700">{nut.carbsGrams}g</span>
                      </div>
                      <div>
                        <span className="text-rose-600 text-[10px] block">Fat</span>
                        <span className="font-mono font-bold tabular-nums text-rose-700">{nut.fatGrams}g</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            {lastRawText ? (
              <button
                type="button"
                disabled={aiFallbackLoading}
                onClick={() => runAiFallback(lastRawText, 'User requested translation/fallback from preview')}
                className="px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors"
                title="Translate foreign language or re-standardize"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{aiFallbackLoading ? 'Translating with Fallback...' : 'Foreign Language? Translate with AI Fallback'}</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onOpenRecipeEditor(extractedDraft)}
                className="px-4 py-2 text-xs font-semibold text-zinc-700 bg-white hover:bg-zinc-50 border border-zinc-300 rounded-lg shadow-2xs"
              >
                Fine-Tune in Editor
              </button>
              <button
                type="button"
                onClick={handleSaveDraft}
                className="px-5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-2xs"
              >
                Save to Recipe Repository
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
