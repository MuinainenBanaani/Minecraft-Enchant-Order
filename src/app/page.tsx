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
  { id: ItemCategory.SPEAR, label: "Spear" },
];

function EnchantmentSelectorRow({ 
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
    <div 
      className={`rounded-lg border p-3 transition-all ${
        isSelected 
          ? 'bg-blue-950/40 border-blue-500 shadow-sm shadow-blue-500/20' 
          : isDisabled 
            ? 'opacity-40 bg-slate-900/40 border-slate-800/80 cursor-not-allowed' 
            : 'bg-[#141e33] border-[#1e2e4a] hover:border-slate-600 hover:bg-[#18243c]'
      }`}
    >
      <div 
        className={`flex items-center justify-between cursor-pointer ${isDisabled ? 'cursor-not-allowed' : ''}`}
        onClick={() => !isDisabled && setExpanded(!expanded)}
      >
        <div className="flex-1 pr-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-medium text-sm sm:text-base ${isDisabled ? 'line-through text-slate-500' : 'text-slate-100'}`}>
              {ench.name}
            </span>
            {isSelected && (
              <span className="font-mc text-xs px-2 py-0.5 rounded bg-blue-600 text-white font-bold">
                Lvl {currentLevel}
              </span>
            )}
          </div>
          {isDisabled && (
            <div className="text-xs text-red-400 font-medium mt-0.5">
              Incompatible with chosen enchantments
            </div>
          )}
        </div>

        {!isDisabled && (
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
            {expanded ? "▲ Hide" : "▼ Select"}
          </span>
        )}
      </div>

            <div
        className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
          expanded && !isDisabled ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="mt-3 pt-3 border-t border-[#1e2e4a]">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                tabIndex={expanded ? 0 : -1}
                onClick={(e) => { e.stopPropagation(); onChange(0); setExpanded(false); }}
                className="px-2.5 py-1 text-xs font-medium rounded border border-slate-700 bg-slate-800/70 text-slate-300 hover:bg-red-950 hover:text-red-300 hover:border-red-800 transition-colors"
              >
                None
              </button>
              {Array.from({ length: ench.maxLevel }).map((_, i) => (
                <button
                  type="button"
                  key={i + 1}
                  tabIndex={expanded ? 0 : -1}
                  onClick={(e) => { e.stopPropagation(); onChange(i + 1); setExpanded(false); }}
                  className={`px-3 py-1 text-xs font-mc rounded border transition-all ${
                    currentLevel === i + 1
                      ? 'bg-blue-600 border-blue-400 text-white shadow-md shadow-blue-600/30'
                      : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  Level {i + 1}
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

  // Valid enchantments list
  const validEnchantments = useMemo(() => {
    return ENCHANTMENTS.filter((e) => e.categories.includes(selectedCategory) && e.name.toLowerCase().includes(searchQuery.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedCategory, searchQuery]);

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
        newList = newList.filter(e => !ench.conflicts.includes(e.enchantment.id));
        newList.push({ enchantment: ench, level });
        return newList;
      });
      
      if (isItem) {
        setBookEnchantments(prev => prev.filter(e => !ench.conflicts.includes(e.enchantment.id)));
      } else {
        setItemEnchantments(prev => prev.filter(e => !ench.conflicts.includes(e.enchantment.id)));
      }
    }
    
    resetResult();
  };

  const [result, setResult] = useState<OptimizerResult | null>(null);
  const [grindstoneAlternative, setGrindstoneAlternative] = useState<OptimizerResult | null>(null);
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
      setCompletedSteps(new Set());
      
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
      setTimeout(() => document.getElementById('result-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }, 50);
  };

  const resetResult = () => { setResult(null); setGrindstoneAlternative(null); };

  const handleMaxOut = () => {
    const newBooks: EnchantmentInstance[] = [];
    const usedIds = new Set<string>();
    
    const CURSE_IDS = ['vanishing_curse', 'binding_curse'];
    const allValid = ENCHANTMENTS.filter((e) => e.categories.includes(selectedCategory) && !CURSE_IDS.includes(e.id)).sort((a, b) => {
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
    <div className={`${theme} min-h-screen text-slate-100 bg-[#0d1527]`}>
      
      {/* Top Navbar */}
      <header className="border-b border-[#1e2e4a] bg-[#10192e]/80 backdrop-blur sticky top-0 z-30 px-6 py-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl tracking-tight text-blue-400 font-mc">
             Minecraft Enchantment Calculator
            </h1>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Share Button */}
            <button 
              type="button"
              onClick={handleShare}
              className="px-3.5 py-1.5 rounded-lg text-sm font-medium bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600 hover:text-white transition-all"
            >
              {copied ? '✓ Copied URL!' : 'Share Enchantments'}
            </button>

            {/* Edition Toggle */}
            <div className="inline-flex rounded-lg border border-[#1e2e4a] bg-[#141e33] p-0.5">
              <button 
                type="button"
                onClick={() => setEdition(Edition.JAVA)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${edition === Edition.JAVA ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Java
              </button>
              <button 
                type="button"
                onClick={() => setEdition(Edition.BEDROCK)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${edition === Edition.BEDROCK ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Bedrock (beta)
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 py-8 flex flex-col gap-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Controls and Enchantment Selection */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* 1. Choose your item */}
            <section className="bg-[#141e33] rounded-xl border border-[#1e2e4a] p-5 shadow-sm">
              <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                  <span>1. Choose your item</span>
                </h2>
                <div className="flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={handleMaxOut}
                    className="px-3 py-1 rounded-md text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-600 hover:text-white transition-all"
                  >
                    Max Enchantments
                  </button>
                </div>
              </div>

              {/* Grid of Item Categories */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {ITEM_CATEGORIES.map((cat) => (
                  <button
                    type="button"
                    key={cat.id}
                    onClick={() => handleSelectCategory(cat.id)}
                    className={`px-2.5 py-2 rounded-lg text-xs font-medium border transition-all text-center ${
                      selectedCategory === cat.id
                        ? 'border-blue-500 bg-blue-600 text-white shadow-md shadow-blue-500/20 font-bold'
                        : 'border-[#1e2e4a] bg-[#0f172a]/70 hover:bg-[#1a263d] text-slate-300'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Rename checkbox */}
              <div className="mt-4 pt-3 border-t border-[#1e2e4a] flex items-center justify-between">
                <label className="check">
                  <input
                    type="checkbox"
                    checked={wantRename}
                    onChange={(e) => { setWantRename(e.target.checked); resetResult(); }}
                  />
                  <span className="box">
                   <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                 </span>
                  <span className="label">Rename item</span>
               </label>
              </div>
            </section>

            {/* Filter Search */}
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search enchantments..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#141e33] border border-[#1e2e4a] rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* 2. Existing Enchantments (Optional) */}
            <section className="bg-[#141e33] rounded-xl border border-[#1e2e4a] p-5 shadow-sm">
              <div 
                className="flex justify-between items-center cursor-pointer"
                onClick={() => setExistingExpanded(!existingExpanded)}
              >
                <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                  <span>2. Existing item enchantments (optional)</span>
                  <span className="text-xs text-slate-400">
                    {existingExpanded ? "▲" : "▼"}
                  </span>
                </h2>
                {itemEnchantments.length > 0 && (
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setItemEnchantments([]); resetResult(); }}
                    className="text-xs text-red-400 hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>

              {existingExpanded && (
                <div className="mt-4 pt-4 border-t border-[#1e2e4a] flex flex-col gap-3">
                  <p className="text-xs text-slate-400">
                    If your item already has enchantments or prior-work on it, pick them here.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {validEnchantments.map((ench) => {
                      const isSelected = itemEnchantments.find(e => e.enchantment.id === ench.id);
                      const isDisabledByConflict = !isSelected && itemEnchantments.some(e => ench.conflicts.includes(e.enchantment.id));
                      return (
                        <EnchantmentSelectorRow 
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
              )}
            </section>

            {/* 3. Choose enchantments to add */}
            <section className="bg-[#141e33] rounded-xl border border-[#1e2e4a] p-5 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-base font-semibold text-slate-100">
                  3. Books / Enchantments to add
                </h2>
                {bookEnchantments.length > 0 && (
                  <button 
                    type="button"
                    onClick={() => { setBookEnchantments([]); resetResult(); }}
                    className="text-xs text-red-400 hover:underline"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {validEnchantments.map((ench) => {
                  const isSelected = bookEnchantments.find(e => e.enchantment.id === ench.id);
                  const isDisabledByConflict = !isSelected && (
                    bookEnchantments.some(e => ench.conflicts.includes(e.enchantment.id)) ||
                    itemEnchantments.some(e => ench.conflicts.includes(e.enchantment.id))
                  );
                  return (
                    <EnchantmentSelectorRow 
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
            <div>
              <button
                type="button"
                onClick={handleCalculate}
                disabled={bookEnchantments.length === 0 || isCalculating}
                className={`w-full py-3.5 px-6 rounded-xl font-semibold text-sm sm:text-base transition-all flex items-center justify-center gap-2 ${
                  bookEnchantments.length === 0
                    ? 'opacity-40 bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    : isCalculating
                      ? 'bg-blue-600 text-white cursor-wait opacity-80'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 active:scale-[0.99]'
                }`}
              >
                {isCalculating ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Calculating solution...</span>
                  </>
                ) : (
                  <span>Calculate Optimal Order</span>
                )}
              </button>
            </div>

          </div>

          {/* Right Column: Information, Tooltip & Guidance */}
          <div className="lg:col-span-5 flex flex-col gap-6 sticky top-24">
            
            {/* Item Preview */}
            <div className="bg-[#141e33] rounded-xl border border-[#1e2e4a] p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-200 mb-3">Item Preview</h3>
              <div className="p-4 rounded-lg bg-[#0a0f1d] border border-[#1e2e4a] flex justify-center items-center min-h-[220px]">
                <Tooltip item={currentResultItem} />
              </div>
            </div>

            {/* Explainer / About Section matching screenshot */}
            <div className="bg-[#141e33] rounded-xl border border-[#1e2e4a] p-6 text-sm text-slate-300 leading-relaxed shadow-sm">
              <h3 className="text-base font-semibold text-slate-100 mb-2">
                A calculator to save you levels and optimize your enchantments on armor, weapons, tools, & more.
              </h3>
              <p className="text-slate-400 text-xs sm:text-sm mt-3">
                When enchanting items in <strong className="text-slate-200">Minecraft</strong>, the order in which you combine armor, weapons, and tools with books in your anvil makes a <strong className="text-slate-200">huge difference</strong>. Each time you work on an anvil, you increase the <strong className="text-slate-200">work penalty</strong>. Once that penalty gets too high, you simply can&apos;t add any more enchantments and the anvil says <span className="text-red-400 font-semibold">&ldquo;Too Expensive!&rdquo;</span>. This calculator finds the <strong className="text-blue-400">optimal sequence</strong> of book combinations to keep your XP cost as low as possible.
              </p>
              <p className="text-slate-400 text-xs sm:text-sm mt-3">
                This tool assumes your gear and books start with <strong className="text-slate-200">zero work penalty</strong>. In other words, you haven&apos;t previously merged lower-level books or used the anvil on that item.
              </p>

              <div className="mt-5 pt-4 border-t border-[#1e2e4a] space-y-2 text-xs font-medium text-slate-300">
                <details className="cursor-pointer group">
                  <summary className="hover:text-blue-400 flex items-center gap-1.5 list-none">
                    <span className="text-blue-400 group-open:rotate-90 transition-transform">▸</span> How To Use
                  </summary>
                  <p className="pl-4 pt-1.5 text-slate-400 font-normal">
                    Select your equipment, pick the books you want to apply, and click Calculate. Then combine them in your Minecraft anvil in the exact order shown.
                  </p>
                </details>

                <details className="cursor-pointer group">
                  <summary className="hover:text-blue-400 flex items-center gap-1.5 list-none">
                    <span className="text-blue-400 group-open:rotate-90 transition-transform">▸</span> Key Features
                  </summary>
                  <p className="pl-4 pt-1.5 text-slate-400 font-normal">
                    Includes all official enchantments through Minecraft 1.21, Spear & Lunge support, Java & Bedrock anvil math rules, and Grindstone advisory.
                  </p>
                </details>

                <details className="cursor-pointer group">
                  <summary className="hover:text-blue-400 flex items-center gap-1.5 list-none">
                    <span className="text-blue-400 group-open:rotate-90 transition-transform">▸</span> Tips & Assumptions
                  </summary>
                  <p className="pl-4 pt-1.5 text-slate-400 font-normal">
                    Start with maximum tier books (e.g. Sharpness V, Unbreaking III) purchased from villagers or fished rather than chaining tier I books.
                  </p>
                </details>
              </div>
            </div>

          </div>

        </div>

        {/* Results Section */}
        {result && (
          <section id="result-section" className="bg-[#141e33] rounded-xl border border-[#1e2e4a] p-6 sm:p-8 shadow-xl mt-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#1e2e4a] pb-6 mb-6">
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold text-blue-400">Calculated Solution</span>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-100 mt-1">
                  Optimal Anvil Sequence
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Follow each row left-to-right in your anvil. Click a step when finished to check it off.
                </p>
              </div>

              <div className="text-left sm:text-right">
                <div className="text-xs uppercase tracking-wider text-slate-400 font-medium">Total Cost</div>
                <div className={`text-3xl font-bold font-mc ${result.tooExpensive ? 'text-red-400' : 'text-emerald-400'}`}>
                  {result.totalLevels} Levels
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {result.totalXP.toLocaleString()} XP Points
                </div>
                {result.tooExpensive && (
                  <div className="mt-1 px-2.5 py-1 rounded bg-red-950/80 border border-red-800 text-red-300 text-xs font-bold font-mc inline-block">
                    TOO EXPENSIVE!
                  </div>
                )}
              </div>
            </div>

            {grindstoneAlternative && (
              <div className="mb-6 p-4 rounded-lg bg-blue-950/40 border border-blue-500/40 text-xs sm:text-sm text-blue-200">
                <strong className="text-blue-400 font-semibold">Grindstone Advisor:</strong> Your item has a high prior work penalty. Disenchanting it on a grindstone and combining onto a fresh item will only cost <span className="font-bold text-emerald-400">{grindstoneAlternative.totalLevels} levels</span>!
              </div>
            )}

            {/* Steps list */}
            <div className="space-y-3">
              {result.steps.map((step, idx) => {
                const isDone = completedSteps.has(idx);
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      const next = new Set(completedSteps);
                      if (next.has(idx)) next.delete(idx);
                      else next.add(idx);
                      setCompletedSteps(next);
                    }}
                    className={`p-4 rounded-lg border transition-all cursor-pointer ${
                      isDone 
                        ? 'opacity-40 bg-slate-900/40 border-slate-800 line-through' 
                        : step.mergeCost > 39
                          ? 'bg-red-950/30 border-red-500/60'
                          : 'bg-[#10192e] border-[#1e2e4a] hover:border-blue-500/50 hover:bg-[#14203a]'
                    }`}
                  >
                    <div className="flex justify-between items-center text-xs text-slate-400 mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mc px-2 py-0.5 rounded bg-blue-600/30 text-blue-400 border border-blue-500/20">
                          Step {idx + 1}
                        </span>
                        {isDone && <span className="text-emerald-400 font-bold">✓ Completed</span>}
                        {step.isRename && <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">Rename</span>}
                      </div>
                      <span className={`font-mc font-bold text-sm ${step.mergeCost > 39 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {step.mergeCost} Levels ({step.xpCost} XP)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-11 gap-2 items-center text-center text-xs sm:text-sm font-medium">
                      <div className="sm:col-span-5 p-2 rounded bg-slate-900/60 border border-slate-800 text-slate-200 truncate" title={step.leftLabel}>
                        {step.leftLabel}
                      </div>
                      <div className="sm:col-span-1 font-bold text-blue-400 text-base">
                        +
                      </div>
                      <div className="sm:col-span-5 p-2 rounded bg-slate-900/60 border border-slate-800 text-blue-300 truncate" title={step.rightLabel}>
                        {step.rightLabel}
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-slate-500 mt-2.5 pt-2 border-t border-slate-800/60">
                      <span>Resulting prior-work penalty: {step.resultPriorWork}</span>
                      <span>Individual limit: 39 levels</span>
                    </div>
                  </div>
                );
              })}
            </div>

          </section>
        )}

        {/* Footer */}
        <footer className="text-center pt-4 pb-8 text-xs text-slate-500">
          Minecraft Enchantment Calculator · <a href="https://namemc.com/profile/MuinainenBanaani.1" target="_blank" rel="noopener noreferrer" className="hover:underline">Built by MuinainenBanaani</a>
        </footer>


      </main>
    </div>
  );
}
