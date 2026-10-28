import React, { useState, useEffect } from 'react';
import { Terminal, Copy, Check, Play, Server, Code, Sparkles, BookOpen, ExternalLink, Cpu } from 'lucide-react';

export const McpConsole: React.FC = () => {
  const [mcpConfig, setMcpConfig] = useState<any>(null);
  const [selectedTool, setSelectedTool] = useState<string>('match_fridge_to_recipes');
  const [toolArgs, setToolArgs] = useState<string>(
    JSON.stringify({ min_match_score: 50, limit: 3 }, null, 2)
  );
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [executing, setExecuting] = useState(false);
  const [copiedConfig, setCopiedConfig] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  useEffect(() => {
    fetch('/api/mcp/config')
      .then((res) => res.json())
      .then((data) => setMcpConfig(data))
      .catch((err) => console.error('Failed to load MCP config:', err));
  }, []);

  const handleToolChange = (toolName: string) => {
    setSelectedTool(toolName);
    switch (toolName) {
      case 'match_fridge_to_recipes':
        setToolArgs(JSON.stringify({ min_match_score: 40, limit: 3 }, null, 2));
        break;
      case 'generate_grocery_order':
        setToolArgs(JSON.stringify({ recipe_ids: ['rec_salmon_bowl_01'], servings_multiplier: 1.5 }, null, 2));
        break;
      case 'list_recipes':
        setToolArgs(JSON.stringify({ query: 'salmon', min_protein: 20 }, null, 2));
        break;
      case 'get_recipe':
        setToolArgs(JSON.stringify({ id: 'rec_salmon_bowl_01', servings: 4 }, null, 2));
        break;
      case 'get_fridge_inventory':
        setToolArgs(JSON.stringify({ category: 'produce' }, null, 2));
        break;
      case 'update_fridge_inventory':
        setToolArgs(
          JSON.stringify(
            {
              action: 'add',
              items: [{ name: 'Greek Yogurt', quantity: 500, unit: 'g', category: 'dairy', expiresInDays: 7 }],
            },
            null,
            2
          )
        );
        break;
      case 'add_recipe':
        setToolArgs(
          JSON.stringify(
            {
              title: 'Avocado Egg Toast',
              servings: 1,
              ingredients: [
                { name: 'sourdough bread', quantity: 2, unit: 'slice' },
                { name: 'avocado', quantity: 1, unit: 'piece' },
                { name: 'egg', quantity: 2, unit: 'piece' },
              ],
              instructions: ['Toast sourdough.', 'Mash avocado with lemon.', 'Poach eggs and place on top.'],
            },
            null,
            2
          )
        );
        break;
      default:
        setToolArgs('{}');
    }
  };

  const handleExecuteTool = async () => {
    setExecuting(true);
    setExecutionResult(null);

    let parsedArgs = {};
    try {
      parsedArgs = JSON.parse(toolArgs);
    } catch (e: any) {
      setExecutionResult({ error: 'Invalid JSON arguments: ' + e.message });
      setExecuting(false);
      return;
    }

    try {
      const response = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: selectedTool,
            arguments: parsedArgs,
          },
        }),
      });

      const json = await response.json();
      setExecutionResult(json);
    } catch (err: any) {
      setExecutionResult({ error: err.message || 'Execution failed' });
    } finally {
      setExecuting(false);
    }
  };

  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const mcpEndpointUrl = `${appUrl}/api/mcp`;

  const claudeDesktopConfigJson = JSON.stringify(
    {
      mcpServers: {
        culinaryVault: {
          url: mcpEndpointUrl,
          transport: 'http',
        },
      },
    },
    null,
    2
  );

  const curlSample = `curl -X POST "${mcpEndpointUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"match_fridge_to_recipes","arguments":{"limit":3}}}'`;

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-1">
          <span>Model Context Protocol (MCP) Server</span>
        </div>
        <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight">
          MCP Agent Gateway & Developer Inspector
        </h1>
        <p className="mt-2 text-sm text-zinc-600 max-w-2xl leading-relaxed">
          CulinaryVault exposes standard Model Context Protocol tools and resources. Connect Claude Desktop, Cursor, RecipeAI agents, or any autonomous LLM agent to inspect your fridge, pick meals, and order groceries.
        </p>
      </div>

      {/* Protocol Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-2xs space-y-1">
          <div className="text-[11px] font-semibold text-zinc-400 uppercase flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-emerald-600" />
            <span>Endpoint Status</span>
          </div>
          <div className="text-sm font-mono font-bold text-zinc-900 truncate">
            /api/mcp
          </div>
          <div className="text-[11px] text-emerald-700 font-medium">
            Active · JSON-RPC 2.0 & SSE
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-2xs space-y-1">
          <div className="text-[11px] font-semibold text-zinc-400 uppercase flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-zinc-600" />
            <span>Specification</span>
          </div>
          <div className="text-sm font-bold text-zinc-900">
            MCP Version 2024-11-05
          </div>
          <div className="text-[11px] text-zinc-500">
            Anthropic / Open Protocol Compliant
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-2xs space-y-1">
          <div className="text-[11px] font-semibold text-zinc-400 uppercase flex items-center gap-1.5">
            <Code className="w-3.5 h-3.5 text-zinc-600" />
            <span>Registered Tools</span>
          </div>
          <div className="text-sm font-mono font-bold text-zinc-900 tabular-nums">
            7 Standard Tools
          </div>
          <div className="text-[11px] text-zinc-500">
            Recipes, Inventory, Matching, Grocery
          </div>
        </div>
      </div>

      {/* Connection & Configuration Snippet */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-zinc-900">
              Agent Connection Configuration
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Paste this block into your <code className="bg-zinc-100 text-zinc-800 px-1 py-0.5 rounded font-mono">claude_desktop_config.json</code> or Cursor MCP settings.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(claudeDesktopConfigJson);
                setCopiedConfig(true);
                setTimeout(() => setCopiedConfig(false), 2000);
              }}
              className="px-3.5 py-1.5 text-xs font-semibold text-zinc-700 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              {copiedConfig ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedConfig ? 'Copied Config!' : 'Copy Claude Config'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(curlSample);
                setCopiedCurl(true);
                setTimeout(() => setCopiedCurl(false), 2000);
              }}
              className="px-3.5 py-1.5 text-xs font-semibold text-zinc-700 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              {copiedCurl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Terminal className="w-3.5 h-3.5" />}
              <span>{copiedCurl ? 'Copied cURL!' : 'Copy cURL'}</span>
            </button>
          </div>
        </div>

        <pre className="p-4 bg-zinc-900 text-zinc-200 rounded-xl text-xs font-mono overflow-x-auto border border-zinc-800 leading-relaxed">
          {claudeDesktopConfigJson}
        </pre>
      </div>

      {/* Interactive MCP Tool Playground & Inspector */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-6">
        <div>
          <h3 className="text-base font-bold text-zinc-900">
            Interactive MCP Tool Inspector
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Send live JSON-RPC 2.0 requests to the endpoint to test how external AI agents query your kitchen.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Tool selector & arguments (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Select MCP Tool
              </label>
              <select
                value={selectedTool}
                onChange={(e) => handleToolChange(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-lg bg-white font-mono"
              >
                <option value="match_fridge_to_recipes">match_fridge_to_recipes</option>
                <option value="generate_grocery_order">generate_grocery_order</option>
                <option value="list_recipes">list_recipes</option>
                <option value="get_recipe">get_recipe</option>
                <option value="get_fridge_inventory">get_fridge_inventory</option>
                <option value="add_recipe">add_recipe</option>
                <option value="update_fridge_inventory">update_fridge_inventory</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-zinc-700">
                  Tool Arguments (JSON)
                </label>
                <span className="text-[11px] text-zinc-400 font-mono">params.arguments</span>
              </div>
              <textarea
                rows={9}
                value={toolArgs}
                onChange={(e) => setToolArgs(e.target.value)}
                className="w-full p-3 text-xs font-mono border border-zinc-300 rounded-lg bg-zinc-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <button
              type="button"
              disabled={executing}
              onClick={handleExecuteTool}
              className="w-full py-2.5 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-2xs"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{executing ? 'Calling MCP Tool...' : 'Execute Tool Call'}</span>
            </button>
          </div>

          {/* Response Viewer (7 cols) */}
          <div className="lg:col-span-7 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-700">
                Live JSON-RPC 2.0 Response
              </span>
              <span className="text-[11px] text-zinc-400 font-mono">protocol envelope</span>
            </div>

            <div className="bg-zinc-900 rounded-xl p-4 min-h-[300px] max-h-[440px] overflow-y-auto border border-zinc-800 text-zinc-200 font-mono text-xs leading-relaxed">
              {executionResult ? (
                <pre>{JSON.stringify(executionResult, null, 2)}</pre>
              ) : (
                <div className="h-full min-h-[250px] flex flex-col items-center justify-center text-zinc-500 text-center p-6 space-y-2">
                  <Terminal className="w-8 h-8 opacity-40" />
                  <p>Click "Execute Tool Call" to invoke the tool via JSON-RPC.</p>
                  <p className="text-[11px] text-zinc-600">
                    Live endpoint: POST {mcpEndpointUrl}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
