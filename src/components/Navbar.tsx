import React from 'react';
import { ChefHat, Plus, Terminal, User as UserIcon } from 'lucide-react';
import { User } from '@supabase/supabase-js';

export type ActiveTab = 'recipes' | 'ingest' | 'fridge' | 'grocery' | 'mcp';

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenNewRecipe: () => void;
  onOpenProfile: () => void;
  currentUser: User | null;
  profileName?: string;
  recipeCount: number;
  groceryCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onOpenNewRecipe,
  onOpenProfile,
  currentUser,
  profileName,
  groceryCount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#fbfbf9]/90 backdrop-blur-md border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark (Single line, display face) */}
        <div 
          onClick={() => onSelectTab('recipes')} 
          className="flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 group"
        >
          <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold shadow-xs">
            <ChefHat className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-lg font-bold tracking-tight text-zinc-900 group-hover:text-emerald-700 transition-colors">
            CulinaryVault
          </span>
        </div>

        {/* Zone 2: Nav Links (Clean typography, whitespace-nowrap) */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
          <button
            onClick={() => onSelectTab('recipes')}
            className={`whitespace-nowrap shrink-0 transition-colors pb-0.5 border-b-2 ${
              activeTab === 'recipes'
                ? 'border-zinc-900 text-zinc-900 font-semibold'
                : 'border-transparent text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Recipes
          </button>

          <button
            onClick={() => onSelectTab('ingest')}
            className={`whitespace-nowrap shrink-0 transition-colors pb-0.5 border-b-2 ${
              activeTab === 'ingest'
                ? 'border-zinc-900 text-zinc-900 font-semibold'
                : 'border-transparent text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Import & Ingest
          </button>

          <button
            onClick={() => onSelectTab('fridge')}
            className={`whitespace-nowrap shrink-0 transition-colors pb-0.5 border-b-2 ${
              activeTab === 'fridge'
                ? 'border-zinc-900 text-zinc-900 font-semibold'
                : 'border-transparent text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Fridge & Matcher
          </button>

          <button
            onClick={() => onSelectTab('grocery')}
            className={`whitespace-nowrap shrink-0 transition-colors pb-0.5 border-b-2 flex items-center gap-1.5 ${
              activeTab === 'grocery'
                ? 'border-zinc-900 text-zinc-900 font-semibold'
                : 'border-transparent text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <span>Grocery Cart</span>
            {groceryCount > 0 && (
              <span className="text-[11px] font-mono tabular-nums bg-zinc-200 text-zinc-800 px-1.5 py-0.2 rounded-sm">
                {groceryCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectTab('mcp')}
            className={`whitespace-nowrap shrink-0 transition-colors pb-0.5 border-b-2 flex items-center gap-1.5 ${
              activeTab === 'mcp'
                ? 'border-zinc-900 text-zinc-900 font-semibold'
                : 'border-transparent text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-zinc-500" />
            <span>MCP Agent Server</span>
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action + Profile Trigger */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenProfile}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-800 transition-colors shadow-2xs whitespace-nowrap"
            title="User Profile & Macro Database"
          >
            <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px]">
              {currentUser ? (currentUser.email?.charAt(0).toUpperCase() || 'U') : <UserIcon className="w-3 h-3" />}
            </div>
            <span className="hidden sm:inline">
              {profileName || 'User Profile'}
            </span>
          </button>

          <button
            onClick={onOpenNewRecipe}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors shadow-xs whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Recipe</span>
          </button>
        </div>
      </div>

      {/* Mobile nav bar row for small screens */}
      <div className="flex md:hidden overflow-x-auto px-4 py-2 border-t border-zinc-200 gap-4 text-xs font-medium no-scrollbar">
        <button
          onClick={() => onSelectTab('recipes')}
          className={`whitespace-nowrap px-2.5 py-1 rounded ${activeTab === 'recipes' ? 'bg-zinc-900 text-white' : 'text-zinc-600'}`}
        >
          Recipes
        </button>
        <button
          onClick={() => onSelectTab('ingest')}
          className={`whitespace-nowrap px-2.5 py-1 rounded ${activeTab === 'ingest' ? 'bg-zinc-900 text-white' : 'text-zinc-600'}`}
        >
          Import
        </button>
        <button
          onClick={() => onSelectTab('fridge')}
          className={`whitespace-nowrap px-2.5 py-1 rounded ${activeTab === 'fridge' ? 'bg-zinc-900 text-white' : 'text-zinc-600'}`}
        >
          Fridge Match
        </button>
        <button
          onClick={() => onSelectTab('grocery')}
          className={`whitespace-nowrap px-2.5 py-1 rounded ${activeTab === 'grocery' ? 'bg-zinc-900 text-white' : 'text-zinc-600'}`}
        >
          Groceries ({groceryCount})
        </button>
        <button
          onClick={() => onSelectTab('mcp')}
          className={`whitespace-nowrap px-2.5 py-1 rounded ${activeTab === 'mcp' ? 'bg-zinc-900 text-white' : 'text-zinc-600'}`}
        >
          MCP API
        </button>
      </div>
    </header>
  );
};
