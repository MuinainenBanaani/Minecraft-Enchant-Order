"use client";

import { useState, useMemo, useEffect } from "react";
import { Edition, ItemCategory, Item, EnchantmentInstance, Enchantment } from "@/lib/types";
import { ENCHANTMENTS } from "@/lib/enchantments";
import { optimizeEnchantmentOrder, OptimizerResult } from "@/lib/optimizer";
import { Tooltip } from "@/components/Tooltip";

const ITEM_CATEGORIES = [
  { id: ItemCategory.SWORD, label: "Sword" },
  { id: ItemCategory.PICKAXE, label: "Pickaxe" },
  { id: ItemCategory.AXE, label: "Axe" },
  { id: ItemCategory.SHOVEL, label: "Shovel" },
  { id: ItemCategory.HOE, label: "Hoe" },
  { id: ItemCategory.HELMET, label: "Helmet" },
  { id: ItemCategory.CHESTPLATE, label: "Chestplate" },
  { id: ItemCategory.LEGGINGS, label: "Leggings" },
  { id: ItemCategory.BOOTS, label: "Boots" },
  { id: ItemCategory.BOW, label: "Bow" },
  { id: ItemCategory.CROSSBOW, label: "Crossbow" },
  { id: ItemCategory.TRIDENT, label: "Trident" },
  { id: ItemCategory.MACE, label: "Mace" },
  { id: ItemCategory.ELYTRA, label: "Elytra" },
  { id: ItemCategory.FISHING_ROD, label: "Fishing Rod" },
  { id: ItemCategory.BOOK, label: "Book" },
];

function FancyEnchantmentRow({ 
  ench, 
  isSelected, 
  currentLevel, 
  isDisabled, 
  onChange 
}: { 
  ench: Enchantment; 
  isSelected: boolean; 
  currentLevel: number; 
  isDisabled: boolean; 
  onChange: (level: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`flex flex-col p-3 rounded-lg border transition-all ${isSelected ? 'border-[var(--theme-accent)] bg-[var(--theme-accent-bg)]' : isDisabled ? 'border-red-900/50 bg-red-950/20 opacity-50' : 'border-[var(--theme-button-border)] bg-[var(--theme-button-bg)] opacity-90'}`}>
      <div 
        className={`flex items-center justify-between cursor-pointer ${isDisabled ? 'cursor-not-allowed' : ''}`}
        onClick={() => !isDisabled && setExpanded(!expanded)}
      >
        <div>
          <div className={`font-medium ${isDisabled ? 'line-through opacity-60' : ''}`}>
            {ench.name} {isSelected ? `(Level ${currentLevel})` : ''}
          </div>
          {isDisabled && <div className="text-xs text-red-400 font-bold mt-1">Conflicts with selection</div>}
        </div>
        {!isDisabled && (
          <div className="text-sm opacity-60 font-mono">
            {expanded ? "▲ Close" : "▼ Select Level"}
          </div>
        )}
      </div>

      <div 
        className={`grid transition-all duration-300 ease-out ${expanded && !isDisabled ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0 mt-0 pointer-events-none'}`}
      >
        <div className="overflow-hidden">
          <div className="pt-3 border-t border-[var(--theme-panel-border)] p-2 mc-panel rounded">
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); onChange(0); setExpanded(false); }}
                className="px-2 py-2 text-sm font-mc mc-button text-red-500 col-span-1"
              >
                ✕ None
              </button>
              {Array.from({ length: ench.maxLevel }).map((_, i) => (
                <button
                  key={i+1}
                  onClick={(e) => { e.stopPropagation(); onChange(i+1); setExpanded(false); }}
                  className={`px-2 py-2 text-sm font-mc col-span-1 ${currentLevel === i+1 ? 'mc-button-active' : 'mc-button'}`}
                >
                  Lvl {i+1}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [edition, setEdition] = useState<Edition>(Edition.JAVA);
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory>(ItemCategory.PICKAXE);
  
  // State for existing item enchantments and books to add
  const [itemEnchantments, setItemEnchantments] = useState<EnchantmentInstance[]>([]);
  const [bookEnchantments, setBookEnchantments] = useState<EnchantmentInstance[]>([]);
  
  const [existingExpanded, setExistingExpanded] = useState(false);
  const [theme, setTheme] = useState<'theme-dark' | 'theme-light'>('theme-dark');
  const [wantRename, setWantRename] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Auto-Save load
  useEffect(() => {
    try {
      let loadedFromUrl = false;
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const urlItem = params.get("item");
        if (urlItem && Object.values(ItemCategory).includes(urlItem as ItemCategory)) {
          setSelectedCategory(urlItem as ItemCategory);
          loadedFromUrl = true;
          
          if (params.get("theme")) setTheme(params.get("theme") as any);
          if (params.get("rename") === "1") setWantRename(true);
          
          const parseEnchants = (str: string | null) => {
            if (!str) return [];
            return str.split(",").map(part => {
              const [id, lvl] = part.split("-");
              const ench = ENCHANTMENTS.find(e => e.id === id);
              if (ench && parseInt(lvl) > 0) return { enchantment: ench, level: parseInt(lvl) };
              return null;
            }).filter(Boolean) as EnchantmentInstance[];
          };
          
          setItemEnchantments(parseEnchants(params.get("exist")));
          setBookEnchantments(parseEnchants(params.get("books")));
        }
      }

      if (!loadedFromUrl) {
        const saved = localStorage.getItem("enchantOrderSave");
        if (saved) {
          const data = JSON.parse(saved);
          if (data.theme) setTheme(data.theme);
          if (data.selectedCategory) setSelectedCategory(data.selectedCategory);
          if (data.wantRename !== undefined) setWantRename(data.wantRename);
          if (data.itemEnchantments) setItemEnchantments(data.itemEnchantments);
          if (data.bookEnchantments) setBookEnchantments(data.bookEnchantments);
        }
      }
    } catch (e) {
      console.error("Failed to load save", e);
    }
  }, []);

  // Auto-Save store
  useEffect(() => {
    localStorage.setItem("enchantOrderSave", JSON.stringify({
      theme, selectedCategory, wantRename, itemEnchantments, bookEnchantments
    }));
    
    if (typeof window !== "undefined") {
      const params = new URLSearchParams();
      params.set("item", selectedCategory);
      params.set("theme", theme);
      if (wantRename) params.set("rename", "1");
      
      const stringifyEnchants = (arr: EnchantmentInstance[]) => arr.map(e => `${e.enchantment.id}-${e.level}`).join(",");
      if (itemEnchantments.length > 0) params.set("exist", stringifyEnchants(itemEnchantments));
      if (bookEnchantments.length > 0) params.set("books", stringifyEnchants(bookEnchantments));
      
      window.history.replaceState(null, '', '?' + params.toString());
    }
  }, [theme, selectedCategory, wantRename, itemEnchantments, bookEnchantments]);

  // Get valid enchantments for the selected item category
  const validEnchantments = useMemo(() => {
    return ENCHANTMENTS.filter((e) => e.categories.includes(selectedCategory) && e.name.toLowerCase().includes(searchQuery.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedCategory, searchQuery]);

  // Reset result when selecting a new item
  const handleSelectCategory = (id: ItemCategory) => {
    setSelectedCategory(id);
    setItemEnchantments([]);
    setBookEnchantments([]);
    resetResult();
  };

  const currentResultItem: Item = {
    category: selectedCategory,
    enchantments: [...itemEnchantments, ...bookEnchantments],
    priorWorkPenalty: 0,
  };

  const handleEnchantmentChange = (
    enchId: string, 
    level: number, 
    isItem: boolean
  ) => {
    const ench = ENCHANTMENTS.find(e => e.id === enchId)!;
    const setState = isItem ? setItemEnchantments : setBookEnchantments;
    
    if (level === 0) {
      setState(prev => prev.filter(e => e.enchantment.id !== enchId));
    } else {
      setState(prev => {
        let newList = prev.filter(e => e.enchantment.id !== enchId);
        // Remove local conflicts
        newList = newList.filter(e => !ench.conflicts.includes(e.enchantment.id));
        newList.push({ enchantment: ench, level });
        return newList;
      });
      
      // If setting an item enchantment, remove conflicting book enchantments
      if (isItem) {
        setBookEnchantments(prev => prev.filter(e => !ench.conflicts.includes(e.enchantment.id)));
      } else {
        // If setting a book enchantment, remove conflicting item enchantments
        setItemEnchantments(prev => prev.filter(e => !ench.conflicts.includes(e.enchantment.id)));
      }
    }
    
    // Any change to enchantments means we need to recalculate
    resetResult();
  };

  const [result, setResult] = useState<OptimizerResult | null>(null);
  const [grindstoneAlternative, setGrindstoneAlternative] = useState<OptimizerResult | null>(null);
  const [hasCalculated, setHasCalculated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCalculate = () => {
    if (bookEnchantments.length === 0) return;
    
    setIsCalculating(true);
    setResult(null);
    setGrindstoneAlternative(null);
    
    setTimeout(() => {
      const targetItem: Item = {
        category: selectedCategory,
        enchantments: itemEnchantments,
        priorWorkPenalty: 0,
      };
      const res = optimizeEnchantmentOrder(targetItem, bookEnchantments, edition, wantRename);
      setResult(res);
      setHasCalculated(true);
      setCompletedSteps(new Set()); // Reset checklist
      
      if (res.tooExpensive) {
        const grindstoneItem: Item = {
          category: selectedCategory,
          enchantments: [],
          priorWorkPenalty: 0,
        };
        const grindRes = optimizeEnchantmentOrder(grindstoneItem, bookEnchantments, edition, wantRename);
        setGrindstoneAlternative(!grindRes.tooExpensive ? grindRes : null);
      } else {
        setGrindstoneAlternative(null);
      }

      setIsCalculating(false);
      // Scroll to result
      setTimeout(() => document.getElementById('result-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }, 50);
  };

  // Reset result when inputs change
  const resetResult = () => { setResult(null); setHasCalculated(false); setGrindstoneAlternative(null); };

  const handleMaxOut = () => {
    const newBooks: EnchantmentInstance[] = [];
    const usedIds = new Set<string>();
    
    const allValid = ENCHANTMENTS.filter((e) => e.categories.includes(selectedCategory)).sort((a, b) => {
      const getPriority = (id: string) => {
        if (id === 'protection') return 100;
        if (id === 'sharpness') return 100;
        if (selectedCategory === ItemCategory.AXE && id === 'silk_touch') return 100;
        if (selectedCategory === ItemCategory.MACE && id === 'breach') return 100;
        if (selectedCategory === ItemCategory.SHOVEL && id === 'silk_touch') return 100;
        return 0;
      };
      const scoreA = getPriority(a.id);
      const scoreB = getPriority(b.id);
      if (scoreA !== scoreB) return scoreB - scoreA;
      return a.name.localeCompare(b.name);
    });
    
    for (const ench of allValid) {
      const conflicts = ench.conflicts.some(cId => usedIds.has(cId));
      if (!conflicts) {
        newBooks.push({ enchantment: ench, level: ench.maxLevel });
        usedIds.add(ench.id);
      }
    }
    
    setItemEnchantments([]); 
    setBookEnchantments(newBooks);
    resetResult();
  };

  return (
    <div className={`${theme} min-h-screen text-[var(--theme-text)] bg-[var(--theme-bg)] transition-colors duration-300 relative overflow-hidden`}>
      {/* Background Magic Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30 z-0">
        <div className="absolute top-[10%] left-[10%] w-[40vw] h-[40vw] bg-[var(--theme-accent)] rounded-full blur-[120px] mix-blend-screen opacity-20 animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute bottom-[10%] right-[10%] w-[50vw] h-[50vw] bg-emerald-500 rounded-full blur-[150px] mix-blend-screen opacity-20 animate-[pulse_10s_ease-in-out_infinite_reverse]" />
      </div>
      
      <main className="relative z-10 p-6 max-w-7xl mx-auto flex flex-col gap-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[var(--theme-header-border)] pb-4">
          <div>
            <h1 className="text-3xl font-bold font-mc text-[var(--theme-accent)]">Enchantment Optimizer</h1>
            <p className="opacity-80">Find the mathematically cheapest anvil order</p>
          </div>
          
          <div className="flex gap-4 items-center flex-wrap">
            {/* Share Button */}
            <button 
              onClick={handleShare}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mc font-medium transition-all ${copied ? 'bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'bg-[var(--theme-accent-bg)] text-[var(--theme-accent)] border border-[var(--theme-accent)]/30 hover:bg-[var(--theme-accent)] hover:text-white shadow-sm hover:shadow-[0_0_15px_var(--theme-accent)]'}`}
            >
              {copied ? '✓ Copied URL!' : '🔗 Share Build'}
            </button>

            {/* Theme Toggle */}
            <div className="flex bg-[var(--theme-button-bg)] rounded-lg p-1 border border-[var(--theme-button-border)] shadow-inner">
              <button 
                className={`px-3 py-1 text-sm rounded-md font-medium transition-colors ${theme === 'theme-light' ? 'bg-[var(--theme-accent)] text-white shadow-lg' : 'opacity-70 hover:opacity-100'}`}
                onClick={() => setTheme('theme-light')}
              >
                Light
              </button>
              <button 
                className={`px-3 py-1 text-sm rounded-md font-medium transition-colors ${theme === 'theme-dark' ? 'bg-[var(--theme-accent)] text-white shadow-lg' : 'opacity-70 hover:opacity-100'}`}
                onClick={() => setTheme('theme-dark')}
              >
                Dark
              </button>
            </div>

            {/* Edition Toggle */}
            <div className="flex bg-[var(--theme-button-bg)] rounded-lg p-1 border border-[var(--theme-button-border)] shadow-inner">
              <button 
                className={`px-4 py-2 rounded-md font-medium transition-colors ${edition === Edition.JAVA ? 'bg-[var(--theme-accent)] text-white shadow-lg' : 'opacity-70 hover:opacity-100'}`}
                onClick={() => setEdition(Edition.JAVA)}
              >
                Java Edition
              </button>
              <button 
                className={`px-4 py-2 rounded-md font-medium transition-colors ${edition === Edition.BEDROCK ? 'bg-[var(--theme-accent)] text-white shadow-lg' : 'opacity-70 hover:opacity-100'}`}
                onClick={() => setEdition(Edition.BEDROCK)}
              >
                Bedrock Edition
              </button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Input (Item + Enchantments) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* 1. Item Selector */}
            <section className="bg-[var(--theme-panel-bg)] p-6 rounded-xl border border-[var(--theme-panel-border)] backdrop-blur-sm">
              <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-bold font-mc">1. Select Item</h2>
                  <button 
                    onClick={handleMaxOut}
                    className="bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 hover:bg-yellow-500 hover:text-white px-3 py-1 rounded-md text-sm font-mc transition-all shadow-[0_0_10px_rgba(234,179,8,0.2)]"
                  >
                    🌟 Max Out
                  </button>
                </div>
                <label className="flex items-center gap-2 cursor-pointer bg-[var(--theme-button-bg)] px-3 py-1.5 rounded border border-[var(--theme-button-border)] hover:bg-[var(--theme-button-hover-bg)] transition-colors group">
                  <input type="checkbox" className="w-4 h-4 accent-[var(--theme-accent)]" checked={wantRename} onChange={(e) => { setWantRename(e.target.checked); resetResult(); }} />
                  <span className="text-sm font-mc opacity-90 group-hover:text-[var(--theme-accent)] transition-colors">Rename Item (+1 Lvl)</span>
                </label>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {ITEM_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      handleSelectCategory(cat.id);
                    }}
                    className={`px-3 py-2 border rounded-lg transition-all text-sm text-center ${
                      selectedCategory === cat.id
                      ? 'border-[var(--theme-accent)] bg-[var(--theme-accent-bg)] text-[var(--theme-text)] font-bold animate-glint'
                      : 'border-[var(--theme-button-border)] bg-[var(--theme-button-bg)] opacity-80 hover:opacity-100 hover:bg-[var(--theme-button-hover-bg)]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Search Bar */}
            <div className="relative z-20">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="opacity-50 text-xl">🔍</span>
              </div>
              <input 
                type="text" 
                placeholder="Search enchantments..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full font-mc bg-[var(--theme-panel-bg)] border-2 border-[var(--theme-panel-border)] rounded-xl py-4 pl-12 pr-4 text-[var(--theme-text)] placeholder-[var(--theme-text)] placeholder-opacity-40 focus:outline-none focus:border-[var(--theme-accent)] focus:ring-4 focus:ring-[var(--theme-accent)]/20 backdrop-blur-sm transition-all shadow-inner text-lg"
              />
            </div>

            {/* 2. Existing Enchantments */}
            <section className="bg-[var(--theme-panel-bg)] p-6 rounded-xl border border-[var(--theme-panel-border)] backdrop-blur-sm">
              <div 
                className="flex justify-between items-center cursor-pointer"
                onClick={() => setExistingExpanded(!existingExpanded)}
              >
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold font-mc">2. Existing Enchantments</h2>
                  <span className="text-sm opacity-60 font-mono">{existingExpanded ? "▲" : "▼"}</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); setItemEnchantments([]); resetResult(); }}
                  className="text-sm text-red-400 hover:text-red-500 hover:underline"
                >
                  Clear Existing
                </button>
              </div>

              <div className={`grid transition-all duration-300 ease-out ${existingExpanded ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0 mt-0 pointer-events-none'}`}>
                <div className="overflow-hidden">
                  <p className="text-sm opacity-70 mb-4">Select enchantments already on the item (if any).</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {validEnchantments.map((ench) => {
                      const isSelected = itemEnchantments.find(e => e.enchantment.id === ench.id);
                      // Disabled if it conflicts with an already selected EXISTING enchantment
                      const isDisabledByConflict = !isSelected && itemEnchantments.some(e => ench.conflicts.includes(e.enchantment.id));
                      
                      return (
                        <FancyEnchantmentRow 
                          key={ench.id}
                          ench={ench}
                          isSelected={!!isSelected}
                          currentLevel={isSelected?.level || 0}
                          isDisabled={isDisabledByConflict}
                          onChange={(level) => handleEnchantmentChange(ench.id, level, true)}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            {/* 3. Books to Add */}
            <section className="bg-[var(--theme-panel-bg)] p-6 rounded-xl border border-[var(--theme-panel-border)] backdrop-blur-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold font-mc">3. Books to Add</h2>
                <button 
                  onClick={() => { setBookEnchantments([]); resetResult(); }}
                  className="text-sm text-red-400 hover:text-red-500 hover:underline"
                >
                  Clear Books
                </button>
              </div>
              <p className="text-sm opacity-70 mb-4">Select the enchanted books you want to combine onto the item.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {validEnchantments.map((ench) => {
                  const isSelected = bookEnchantments.find(e => e.enchantment.id === ench.id);
                  // Disabled if it conflicts with an already selected BOOK or EXISTING item enchantment
                  const isDisabledByConflict = !isSelected && (
                    bookEnchantments.some(e => ench.conflicts.includes(e.enchantment.id)) ||
                    itemEnchantments.some(e => ench.conflicts.includes(e.enchantment.id))
                  );
                  
                  return (
                    <FancyEnchantmentRow 
                      key={ench.id}
                      ench={ench}
                      isSelected={!!isSelected}
                      currentLevel={isSelected?.level || 0}
                      isDisabled={isDisabledByConflict}
                      onChange={(level) => handleEnchantmentChange(ench.id, level, false)}
                    />
                  );
                })}
              </div>
            </section>

            {/* Calculate Button */}
            <div className="flex justify-center pt-2">
              <button
                onClick={handleCalculate}
                disabled={bookEnchantments.length === 0 || isCalculating}
                className={`font-mc px-12 py-4 text-xl rounded-lg border-2 transition-all duration-200 flex items-center justify-center gap-3 ${
                  bookEnchantments.length === 0
                    ? 'opacity-40 cursor-not-allowed border-[var(--theme-button-border)] bg-[var(--theme-button-bg)]'
                    : isCalculating
                      ? 'border-[var(--theme-accent)] bg-[var(--theme-accent)] text-white opacity-80 cursor-wait'
                      : 'mc-button-active border-[#311c47] hover:scale-105 hover:shadow-[0_0_20px_var(--theme-accent)] active:scale-95'
                }`}
              >
                {isCalculating ? (
                  <>
                    <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Calculating solution...</span>
                  </>
                ) : (
                  <span>⚒ Calculate Order</span>
                )}
              </button>
            </div>

          </div>

          {/* Right Column: Minecraft Tooltip */}
          <div className="lg:col-span-4">
            <div className="sticky top-6">
              <h2 className="text-xl font-bold mb-4 font-mc opacity-90">Item Preview</h2>
              <div className="flex justify-center bg-[url('/bg-pattern.png')] bg-repeat bg-[var(--theme-preview-bg)] p-8 rounded-xl border border-[var(--theme-panel-border)] min-h-[400px] items-start shadow-inner">
                <Tooltip item={currentResultItem} />
              </div>
            </div>
          </div>

        </div>

        {/* Results Section */}
        {result && (
          <section className="bg-[var(--theme-result-bg)] p-8 rounded-xl border border-[var(--theme-result-border)] shadow-[0_0_30px_-10px_var(--theme-accent)] transition-all duration-500">
            <div className="flex justify-between items-center mb-8 border-b border-[var(--theme-panel-border)] pb-4">
              <h2 className="text-2xl font-bold font-mc text-green-500">4. Optimal Order Found</h2>
              <div className="text-right">
                <div className="text-sm opacity-70 uppercase tracking-wider font-semibold">Total Cost</div>
                <div className={`text-3xl font-bold font-mc ${result.tooExpensive ? 'text-red-500' : 'text-green-500'}`}>
                  {result.totalLevels} Levels
                </div>
                <div className="text-sm opacity-60 mt-1">{result.totalXP.toLocaleString()} XP Points</div>
                <div className="text-xs opacity-50 mt-1 flex justify-end gap-3 font-mc flex-wrap">
                  <span title="Zombies killed (5 XP each)">🧟 {Math.ceil(result.totalXP / 5)}</span>
                  <span title="Blazes killed (10 XP each)">🔥 {Math.ceil(result.totalXP / 10)}</span>
                  <span title="Ender Dragon (12000 XP)">🐉 {(result.totalXP / 12000).toFixed(2)}</span>
                </div>
                {result.tooExpensive && <div className="text-red-500 font-bold mt-1 bg-red-900/10 px-2 py-1 rounded inline-block font-mc">TOO EXPENSIVE!</div>}
              </div>
            </div>

            {grindstoneAlternative && (
              <div className="mb-6 p-4 rounded-lg border border-blue-500 bg-blue-900/20 flex flex-col gap-2 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                <div className="flex items-center gap-2 text-blue-400 font-bold font-mc">
                  <span>💡 Grindstone Advisor</span>
                </div>
                <p className="text-sm opacity-90">
                  Your current item has too much Prior Work Penalty. If you strip it with a Grindstone and apply these exact books to a fresh item, it will only cost <span className="font-bold text-blue-400">{grindstoneAlternative.totalLevels} Levels</span>!
                </p>
              </div>
            )}

            <div className="space-y-4" id="result-section">
              <h3 className="text-lg font-bold opacity-90 font-mc">Anvil Steps ({result.steps.length})</h3>
              <p className="text-sm opacity-60 mb-2">Click on a step to mark it as completed!</p>
              <div className="flex flex-col gap-4">
                {result.steps.map((step, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      const newSet = new Set(completedSteps);
                      if (newSet.has(idx)) newSet.delete(idx);
                      else newSet.add(idx);
                      setCompletedSteps(newSet);
                    }}
                    className={`cursor-pointer p-4 rounded-lg border transition-all duration-300 hover:scale-[1.01] hover:shadow-lg ${
                      completedSteps.has(idx) ? 'opacity-40 grayscale scale-[0.99] border-green-500 bg-green-900/10' :
                      step.mergeCost > 39
                        ? 'border-red-500 bg-red-900/20'
                        : 'border-[var(--theme-button-border)] bg-[var(--theme-button-bg)]'
                    }`}
                    style={{ animationDelay: `${idx * 60}ms` }}
                  >
                    <div className="flex justify-between text-xs opacity-70 mb-3 font-mc">
                      <div className="flex items-center gap-2">
                        {completedSteps.has(idx) ? <span className="text-green-500 font-bold text-lg leading-none">✓</span> : null}
                        <span className="bg-[var(--theme-accent-bg)] px-2 py-0.5 rounded text-[var(--theme-accent)]">Step {idx + 1}</span>
                        {step.isRename && <span className="bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded ml-2">🏷️ Rename</span>}
                      </div>
                      <span className={step.mergeCost > 39 ? 'text-red-500 font-bold' : 'text-green-500 font-bold'}>
                        {step.mergeCost} Levels
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-center font-medium font-mc">
                      <div className="flex-1 bg-[var(--theme-accent-bg)] p-2 rounded border border-[var(--theme-accent)]/30 truncate" title={step.leftLabel}>
                        {step.leftLabel}
                      </div>
                      <div className="text-[var(--theme-accent)] font-bold text-lg">+</div>
                      <div className="flex-1 bg-black/10 p-2 rounded border border-yellow-500/30 truncate text-yellow-500" title={step.rightLabel}>
                        {step.rightLabel}
                      </div>
                    </div>
                    <div className="text-xs opacity-50 mt-2 text-right">
                      Next penalty: {step.resultPriorWork}
                    </div>
                    {/* Danger Meter */}
                    <div className="mt-2 h-1.5 w-full bg-black/20 rounded-full overflow-hidden flex" title="Prior Work Danger Meter">
                      <div 
                        className={`h-full transition-all duration-500 ${step.resultPriorWork >= 31 ? 'bg-red-500' : step.resultPriorWork >= 15 ? 'bg-orange-500' : step.resultPriorWork >= 7 ? 'bg-yellow-500' : 'bg-green-500'}`} 
                        style={{ width: `${Math.min(100, (step.resultPriorWork / 31) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </section>
        )}

        {/* Footer */}
        <footer className="text-center pt-8 pb-4 opacity-60 text-sm">
          Created by <a href="https://fi.namemc.com/profile/MuinainenBanaani.1" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--theme-accent)] hover:underline font-bold transition-colors">MuinainenBanaani</a>
        </footer>

      </main>
    </div>
  );
}
