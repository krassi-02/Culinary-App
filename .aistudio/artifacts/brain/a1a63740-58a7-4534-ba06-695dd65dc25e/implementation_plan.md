# CulinaryVault — Recipe Repository, Macro Engine & MCP Kitchen Server

An intelligent, privacy-first culinary repository that standardizes recipes from Pinterest, Instagram, web bookmarks, images, and video frames without relying on external AI models, computes precise calories and macronutrients dynamically by serving proportions, matches your fridge inventory to suggest meals, and exposes a standardized Model Context Protocol (MCP) endpoint for external AI agents and grocery ordering.

## User Review & Critical Decisions

> [!IMPORTANT]
> Based on your Phase 1 answers, all ingestion, text extraction, and recipe standardizations are built using deterministic, privacy-friendly parsers—**no external AI model required**.

- **Ingestion Strategy (User Confirmed: Non-AI Parsing)**: 
  - **URLs & Bookmarks (Pinterest/Instagram/Food blogs)**: Server-side proxy fetches the source page and deterministically parses standard Schema.org `Recipe` JSON-LD data, OpenGraph metadata, and HTML structured lists.
  - **Images & Pinterest Pins**: In-browser Optical Character Recognition (OCR) extracts recipe text and card typography directly on the device.
  - **Videos (Reels, TikToks, Shorts)**: Interactive video frame inspector allows you to seek to any recipe card frame, snapshot it to canvas, and run instant OCR extraction.
  - **Rule-Based Culinary Parser**: A deterministic regex and quantity-unit-ingredient tokenizer normalizes ingredients, serving sizes, and prep steps into the standard user repository format.
- **Fridge & Meal Decision Engine (User Confirmed)**:
  - Tracks user fridge and pantry inventory with freshness/quantity tracking.
  - Computes recipe readiness scores (% ingredients in stock), highlights missing items, and generates an organized grocery order list with serving-size multipliers.
- **Model Context Protocol (MCP) Server (User Confirmed)**:
  - Exposes an RFC-compliant MCP endpoint (`/api/mcp`) supporting both JSON-RPC 2.0 and Server-Sent Events (SSE).
  - Supplies tools: `list_recipes`, `get_recipe`, `get_fridge_inventory`, `match_fridge_to_recipes`, `generate_grocery_order`, `add_recipe`, and `update_fridge_inventory`.
  - Includes an in-app **MCP Inspector & Connection Center** with one-click configuration snippets for Claude Desktop, Cursor, and custom agent runtimes.

---

## 1. Overview & Core Concept

CulinaryVault is a comprehensive culinary operating system designed for cooks and nutrition-conscious eaters who currently suffer from fragmented recipes spread across Pinterest boards, Instagram saved posts, browser bookmarks, and camera rolls.

- **Source of Truth**: Translates messy bookmarks, web links, pin photos, and video cards into a unified, structured recipe schema stored in the user profile.
- **Dynamic Macro & Calorie Scaling**: Calculates calories, protein, carbohydrates, and fats per serving and scales them proportionally in real time when you change serving counts (e.g. 1 serving for lunch vs. 6 servings for dinner). Uses a built-in nutrient reference table for common culinary ingredients.
- **Fridge-to-Table Matcher**: Answers "What can I cook tonight with what I have?" by sorting recipes by available ingredients and generating consolidated shopping lists for missing items.
- **Standardized MCP Interface**: Allows any external AI assistant (Claude Desktop, Cursor, ChatGPT agents, or custom automation scripts) to query your recipes, check fridge contents, and initiate grocery orders via the official Model Context Protocol.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Recipe Ingestion & Standardization**:
   - User clicks **Import Recipe** and chooses **Web URL**, **Image / Pin Screenshot**, or **Video Clip**.
   - For URLs: User pastes link; the server extracts Schema.org JSON-LD / HTML structured data and opens the standard recipe editor pre-filled with ingredients, instructions, yield, prep time, and photo.
   - For Images: User drops a photo or screenshot; client-side OCR scans the text, identifies quantities and ingredient names, and drafts the structured card.
   - For Video: User loads a video file or link, scrubs to the ingredients frame, hits **Extract Frame Text**, and the parser automatically populates the form.
   - The user reviews, tweaks serving proportions, and saves to their repository.
2. **Serving & Macro Proportions**:
   - On any recipe card or detail page, user adjusts the interactive serving stepper (e.g., from 4 servings to 2 or 8).
   - Ingredients automatically scale their fractional quantities (e.g., `1 1/2 cups` $\to$ `3/4 cup`), and the nutrition bar dynamically recalculates total calories and macronutrient ratios (Protein, Net Carbs, Healthy Fats).
3. **Fridge Inventory & "What Can I Cook?" Matcher**:
   - User logs current fridge and pantry staples (with quantity, category, and expiry indicator).
   - The **Kitchen Matcher** ranks all recipes by match percentage (e.g., `85% Match — 1 missing item: Greek Yogurt`).
   - Clicking **Make This** generates a missing-ingredient grocery checklist ready for copying or ordering.
4. **MCP Agent Gateway & Developer Explorer**:
   - Dedicated **MCP Integration** tab reveals the active MCP server URL, status, and JSON manifest.
   - Live interactive tool runner lets users test `match_fridge_to_recipes` or `generate_grocery_order` right in the browser, complete with full JSON request and response payloads.

### Visual Identity & Theme

- **Aesthetic Direction**: Contemporary utilitarian culinary workspace—clean, warm-minimal, editorial typography, zero AI clutter, high visual rhythm.
- **Color Palette**:
  - Dominant Neutral Canvas (60%): Warm crisp white (`#FAFAF8`) in light mode, deep warm charcoal (`#18181B`) in dark mode.
  - Structural Surfaces (30%): Clean warm zinc (`#F4F4F5` / `#27272A`), subtle 1px hairline borders (`rgba(0,0,0,0.08)` / `rgba(255,255,255,0.08)`).
  - Accent Budget (10%): Rich culinary olive/sage (`#15803D` / `#166534`) and warm terracotta (`#C2410C`) for active filters and macro progress indicators.
- **Typography**:
  - Display & Wordmark: `Plus Jakarta Sans` (bold, geometric, confident).
  - Body & Instructions: `DM Sans` (warm, highly legible for dense recipe steps).
  - Quantities & Macros: `tabular-nums` monospace (`font-mono`) for precision alignment of fractions, grams, and calories.
- **Zero-Pill Discipline**: Metadata (cook time, difficulty, cuisine) rendered as quiet unboxed text separated by typographic middots (`·`). Interactive filter tabs use clean segmented button controls.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Deterministic Multi-Source Ingestion (No AI Dependency)
- **Chosen Approach**: Three-tier deterministic pipeline:
  1. *URL Engine*: Server proxy fetches HTML, extracts Schema.org `Recipe` JSON-LD microdata (which 95%+ of recipe sites, Pinterest destination pins, and blogs implement), and parses microformats.
  2. *OCR Engine*: In-browser Tesseract.js / Canvas frame capture parses text from pin images and video frames directly without sending private media to external AI models.
  3. *Culinary Heuristic Tokenizer*: Rule-based regex parser parses fractions (`1/2`, `3/4`, `2.5`), metric/imperial units (`tbsp`, `g`, `ml`, `oz`, `cup`, `clove`), and ingredient names.
- **Why**: Fulfills the user's explicit preference ("I would prefer not to use an AI"), operates completely offline/privately, costs zero API tokens, and offers instant zero-latency processing.
- **Alternatives Considered**: Gemini Multimodal API was considered, but deliberately rejected based on user requirement.

### Decision 2: Serving-Proportion Macro & Calorie Engine
- **Chosen Approach**: Local ingredient nutrition density lookup table covering >200 common culinary items (chicken breast, olive oil, oats, eggs, rice, etc.) with standardized calories, protein, carbs, and fats per 100g/unit. Recipes calculate baseline nutrition per serving, and dynamically scale when the user changes servings.
- **Why**: Allows users to customize serving size dynamically (e.g. 1 serving meal-prep vs 4 serving family dinner) with real-time recalculation of nutritional breakdown.

### Decision 3: Standardized Model Context Protocol (MCP) Server Endpoint
- **Chosen Approach**: Implements official MCP JSON-RPC 2.0 protocol over an Express backend proxy route (`/api/mcp`) supporting both HTTP POST and SSE (Server-Sent Events) streaming, compliant with Anthropic/Model Context Protocol specifications.
- **Why**: Enables external agents (Claude Desktop, Cursor, OpenAI Agents, local CLI scripts) to connect directly to the user's recipe book and fridge to make autonomous meal decisions and grocery orders.
- **Interactive UI**: An in-app MCP Console displays the active configuration snippet (`mcpServers` JSON block) and includes an interactive tester to execute MCP tool calls directly in the browser.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CulinaryVault Frontend (React + TS)              │
│                                                                        │
│  ┌───────────────────────┐  ┌────────────────────┐  ┌────────────────┐ │
│  │ Recipe Repository     │  │ Ingestion Hub      │  │ Fridge & Meal  │ │
│  │ - Grid & Search       │  │ - Web JSON-LD      │  │   Decision     │ │
│  │ - Dynamic Scaler      │  │ - Image OCR        │  │ - Pantry Stock │ │
│  │ - Macro Breakdown     │  │ - Video Frame OCR  │  │ - Recipe Match │ │
│  └───────────┬───────────┘  └──────────┬─────────┘  └───────┬────────┘ │
│              │                         │                    │          │
│              └──────────────┬──────────┴────────────────────┘          │
│                             │                                          │
│                 ┌───────────▼───────────┐                              │
│                 │ Persistent State      │                              │
│                 │ (Recipes, Fridge,     │                              │
│                 │  Grocery List, User)  │                              │
│                 └───────────┬───────────┘                              │
└─────────────────────────────┼──────────────────────────────────────────┘
                              │
                    HTTP REST │ JSON-RPC / SSE
                              │
┌─────────────────────────────▼──────────────────────────────────────────┐
│                      Express Server (/server.ts)                       │
│                                                                        │
│  ┌────────────────────────┐  ┌──────────────────────────────────────┐  │
│  │ /api/scrape-recipe     │  │ /api/mcp (Model Context Protocol)    │  │
│  │ - Fetches URL          │  │ - list_recipes                       │  │
│  │ - Parses JSON-LD       │  │ - get_recipe                         │  │
│  │ - Schema.org Extractor │  │ - get_fridge_inventory               │  │
│  │                        │  │ - match_fridge_to_recipes            │  │
│  │                        │  │ - generate_grocery_order             │  │
│  │                        │  │ - add_recipe / update_fridge         │  │
│  └────────────────────────┘  └──────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### Data Model & Entities

```typescript
export interface Ingredient {
  id: string;
  name: string;
  quantity: number;        // Baseline quantity for standard servings
  unit: string;            // 'g', 'ml', 'cup', 'tbsp', 'tsp', 'piece', etc.
  caloriesPerUnit?: number;
  proteinPerUnit?: number;
  carbsPerUnit?: number;
  fatPerUnit?: number;
}

export interface Recipe {
  id: string;
  title: string;
  sourceUrl?: string;
  sourceType: 'pinterest' | 'instagram' | 'bookmark' | 'image' | 'video' | 'manual';
  imageUrl?: string;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  standardServings: number;
  ingredients: Ingredient[];
  instructions: string[];
  nutritionPerServing: {
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
    fiberGrams?: number;
  };
  tags: string[];
  createdAt: string;
}

export interface FridgeItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: 'produce' | 'dairy' | 'protein' | 'pantry' | 'spices' | 'beverages';
  expiresInDays?: number;
  addedAt: string;
}

export interface GroceryItem {
  id: string;
  ingredientName: string;
  requiredQuantity: number;
  unit: string;
  forRecipeTitle: string;
  purchased: boolean;
}
```

### Interactive Component & State Mapping

1. **Top Bar Contract**:
   - Wordmark `CulinaryVault`
   - Navigation links: `Recipes`, `Add / Ingest`, `Fridge & Matcher`, `Grocery List`, `MCP Agent API`
   - Primary Action: `+ New Recipe` modal button
2. **Recipe Explorer View**:
   - Filter by cuisine, macro target (High Protein, Low Carb, Under 500 kcal), and search query.
   - Dynamic serving size toggle on cards (`- [ 4 ] +` servings) with instantaneous macro recalculation.
3. **Ingestion Workspace**:
   - **Tab 1: URL / Bookmark Parser**: Input URL, server executes HTTP fetch, parses Schema.org JSON-LD or meta tags, outputs editable standard recipe.
   - **Tab 2: Image / Pin OCR**: Drag-and-drop screenshot or Pinterest pin; client-side OCR reads text blocks and parses recipe ingredients/instructions.
   - **Tab 3: Video Frame Extractor**: Upload or play video clip, scrub to ingredient list frame, grab canvas snapshot, and OCR extract.
4. **Fridge Inventory & Matcher View**:
   - Add/edit fridge ingredients with quick category selectors.
   - "Match My Fridge" ranking: sorts recipes by available ingredient match %; shows badge for missing items.
   - One-click "Add Missing to Grocery Order".
5. **MCP Server Console**:
   - Live endpoint status, tools schema definition viewer, copyable Claude Desktop / Cursor configuration, and interactive tool tester.
