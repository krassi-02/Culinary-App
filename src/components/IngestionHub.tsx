import React, { useState } from 'react';
import { Recipe, Ingredient } from '../types';
import { Globe, Image as ImageIcon, FileText, ArrowRight, Loader2, CheckCircle2, AlertCircle, Sparkles, Upload, Camera, Facebook, ExternalLink, Clipboard, X } from 'lucide-react';
import { runImageOCR, OCRProgress } from '../lib/ocrEngine';
import { parseRawRecipeText, parseIngredientLine } from '../lib/recipeParser';
import { calculateRecipeNutrition } from '../lib/nutritionDatabase';

interface IngestionHubProps {
  onRecipeImported: (recipe: Recipe) => void;
  onOpenRecipeEditor: (draft: Partial<Recipe>) => void;
}

export const IngestionHub: React.FC<IngestionHubProps> = ({
  onRecipeImported,
  onOpenRecipeEditor,
}) => {
  const [activeTab, setActiveTab] = useState<'url' | 'image' | 'text'>('url');

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

  // Helper sample URLs for 1-click test with real Instagram Reel and Facebook examples
  const sampleUrls = [
    { label: 'Instagram Reel (Matt West Cookies)', url: 'https://www.instagram.com/p/De8DbcQOpS-/' },
    { label: 'Facebook Recipe Post', url: 'https://www.facebook.com/posts/crispy-garlic-chicken' },
    { label: 'Pinterest Food Pin', url: 'https://pinterest.com/pin/healthy-protein-bowls' },
    { label: 'AllRecipes Pasta Salad', url: 'https://www.allrecipes.com/recipe/23891/pasta-salad/' },
    { label: 'Food Network Lemon Chicken', url: 'https://www.foodnetwork.com/recipes/rachael-ray/lemon-chicken-recipe-1941655' },
  ];

  // Helper: Determine if ingredients and nutritional macros were successfully identified
  const hasSufficientIngredientsAndMacros = (
    ingredients?: Ingredient[],
    servings?: number,
    nutrition?: { calories: number; proteinGrams: number; carbsGrams: number; fatGrams: number }
  ): boolean => {
    if (!ingredients || ingredients.length === 0) return false;
    // Check if valid macros were extracted directly
    if (nutrition && (nutrition.calories > 0 || (nutrition.proteinGrams > 0 || nutrition.carbsGrams > 0 || nutrition.fatGrams > 0))) {
      return true;
    }
    // Check if deterministic nutrition calculator can identify macros from the ingredient names
    const calculated = calculateRecipeNutrition(ingredients, servings || 2);
    return calculated.calories > 0 || (calculated.proteinGrams > 0 || calculated.carbsGrams > 0 || calculated.fatGrams > 0);
  };

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
      const isComplete = hasSufficientIngredientsAndMacros(
        parsedIngredients,
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
        imageUrl: scraped.imageUrl || '/src/assets/images/recipe_salmon_bowl_1793168926160.jpg',
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
      const formattedIngredients: Ingredient[] = (data.ingredients || []).map((i: any, idx: number) => ({
        id: `ing_fb_${Date.now()}_${idx}`,
        name: i.name,
        quantity: Number(i.quantity) || 1,
        unit: i.unit || 'item',
        category: i.category || 'pantry',
      }));

      const base = overrideDraft || extractedDraft || {};
      const draft: Partial<Recipe> = {
        ...base,
        title: data.title || base.title || 'Standardized Recipe',
        description: data.description || 'Standardized with complete macro profile via AI Fallback.',
        sourceUrl: base.sourceUrl,
        sourceType: (base.sourceType as any) || 'bookmark',
        imageUrl: base.imageUrl || '/src/assets/images/recipe_salmon_bowl_1793168926160.jpg',
        cuisine: data.cuisine || base.cuisine || 'International',
        prepTimeMinutes: data.prepTimeMinutes || 15,
        cookTimeMinutes: data.cookTimeMinutes || 20,
        standardServings: data.standardServings || 4,
        ingredients: formattedIngredients,
        instructions: data.instructions || [],
        nutritionPerServing: data.nutritionPerServing || (
          formattedIngredients.length > 0
            ? calculateRecipeNutrition(formattedIngredients, data.standardServings || 4)
            : { calories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0 }
        ),
        tags: [...(base.tags || []), 'AI Standardized'],
      };
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
      recipeDraft.imageUrl = imagePreview || '/src/assets/images/recipe_protein_oats_1793168926912.jpg';
      recipeDraft.sourceType = 'image';

      // If deterministic OCR did not identify complete ingredients OR macros, kick the AI!
      const isComplete = hasSufficientIngredientsAndMacros(
        recipeDraft.ingredients,
        recipeDraft.standardServings
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
    const isComplete = hasSufficientIngredientsAndMacros(
      parsed.ingredients,
      parsed.standardServings
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
      imageUrl: extractedDraft.imageUrl || '/src/assets/images/recipe_salmon_bowl_1793168926160.jpg',
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
      <div className="flex items-center gap-1 p-1 bg-zinc-200/80 rounded-xl max-w-lg">
        <button
          type="button"
          onClick={() => setActiveTab('url')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-all ${
            activeTab === 'url' ? 'bg-white text-zinc-900 shadow-xs font-semibold' : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Web & Instagram Reel Link</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('image')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-all ${
            activeTab === 'image' ? 'bg-white text-zinc-900 shadow-xs font-semibold' : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Image / Pin OCR</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('text')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-all ${
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
                          imageUrl:
                            manualPastePrompt.platform === 'facebook'
                              ? '/src/assets/images/recipe_mediterranean_pasta_1793168927254.jpg'
                              : '/src/assets/images/recipe_salmon_bowl_1793168926160.jpg',
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

        {/* TAB 2: IMAGE / PIN OCR */}
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
