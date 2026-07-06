import { Edition, EnchantmentInstance, Item, ItemCategory, MergeStep, MergeTree, OptimizationResult } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// XP formula from Minecraft wiki (matches iamcal/enchant-order exactly)
// ─────────────────────────────────────────────────────────────────────────────
export function xpFromLevels(level: number): number {
  if (level <= 0) return 0;
  if (level <= 16) return level * level + 6 * level;
  if (level <= 31) return 2.5 * level * level - 40.5 * level + 360;
  return 4.5 * level * level - 162.5 * level + 2220;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal node types for the merge tree
// ─────────────────────────────────────────────────────────────────────────────
const MAXIMUM_MERGE_LEVELS = 39;

interface WorkNode {
  // 'item' | an enchantment id string
  i: string;
  // enchant ids on this combined object
  e: string[];
  // prior work penalty count (not 2^n-1, just the raw count)
  w: number;
  // cumulative enchantment cost (level * weight sums)
  l: number;
  // total XP points consumed so far
  x: number;
  // instruction tree for output
  c: CombNode;
}

interface CombNode {
  I?: string | number;
  l?: number;
  w?: number;
  v?: number;
  L?: CombNode;
  R?: CombNode;
}

class MergeLevelsTooExpensiveError extends Error {
  constructor() {
    super("merge levels above max");
    this.name = "MergeLevelsTooExpensiveError";
  }
}

function makeBook(enchId: string, cost: number): WorkNode {
  return {
    i: "book",
    e: [enchId],
    w: 0,
    l: cost,
    x: 0,
    c: { I: enchId, l: cost, w: 0 },
  };
}

function makeItem(): WorkNode {
  return { i: "item", e: [], w: 0, l: 0, x: 0, c: {} };
}

function mergeNodes(left: WorkNode, right: WorkNode): WorkNode {
  const merge_cost =
    right.l + Math.pow(2, left.w) - 1 + Math.pow(2, right.w) - 1;
  if (merge_cost > MAXIMUM_MERGE_LEVELS) {
    throw new MergeLevelsTooExpensiveError();
  }
  const new_value = left.l + right.l;
  const new_w = Math.max(left.w, right.w) + 1;
  const new_x = left.x + right.x + xpFromLevels(merge_cost);

  return {
    i: left.i,
    e: [...left.e, ...right.e],
    w: new_w,
    l: new_value,
    x: new_x,
    c: {
      L: left.c,
      R: { ...right.c, v: right.l },
      l: merge_cost,
      w: new_w,
      v: new_value,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Core algorithm: combinations + memoised cheapest-first search
// Ported directly from iamcal/enchant-order work.js
// ─────────────────────────────────────────────────────────────────────────────
function combinations<T>(set: T[], k: number): T[][] {
  if (k > set.length || k <= 0) return [];
  if (k === set.length) return [set];
  if (k === 1) return set.map((el) => [el]);

  const combs: T[][] = [];
  for (let i = 0; i < set.length - k + 1; i++) {
    const head = set.slice(i, i + 1);
    const tailcombs = combinations(set.slice(i + 1), k - 1);
    for (const tail of tailcombs) combs.push([...head, ...tail]);
  }
  return combs;
}

function hashNode(node: WorkNode): string {
  if (!node) return "undefined";
  return `${(node.i ?? "")[0] ?? "?"}|${[...node.e].sort().join(",")}|${node.w}`;
}

type Work2Node = Record<string, WorkNode>;

// Memoisation cache (reset on each call to optimizeEnchantmentOrder)
let memo: Record<string, Work2Node> = {};

function memoKey(nodes: WorkNode[]): string {
  return nodes.map(hashNode).join(";");
}

// Always returns the single cheapest node keyed by work penalty
function compareCheapest(a: WorkNode, b: WorkNode): WorkNode {
  if (a.x <= b.x) return a;
  return b;
}

function removeExpensive(work2node: Work2Node): Work2Node {
  const result: Work2Node = {};
  let cheapestValue: number | undefined;
  for (const work in work2node) {
    const node = work2node[work];
    if (!node) continue;
    if (cheapestValue === undefined || node.l < cheapestValue) {
      result[work] = node;
      cheapestValue = node.l;
    }
  }
  return result;
}

function cheapestFromList(nodes: WorkNode[]): Work2Node {
  // Guard against undefined entries
  const clean = nodes.filter(Boolean);
  if (clean.length === 0) return {};
  if (clean.length === 1) return { [clean[0].w]: clean[0] };

  const key = memoKey(clean);
  if (memo[key]) return memo[key];

  let result: Work2Node;
  if (clean.length === 2) {
    result = cheapestFromTwo(clean[0], clean[1]);
  } else {
    result = cheapestFromN(clean, Math.floor(clean.length / 2));
  }

  memo[key] = result;
  return result;
}

function cheapestFromTwo(left: WorkNode, right: WorkNode): Work2Node {
  if (right.i === "item") return { [right.w]: mergeNodes(right, left) };
  if (left.i === "item") return { [left.w]: mergeNodes(left, right) };

  let normal: WorkNode | null = null;
  let reversed: WorkNode | null = null;

  try { normal = mergeNodes(left, right); } catch { /* too expensive */ }
  try { reversed = mergeNodes(right, left); } catch { /* too expensive */ }

  if (!normal && !reversed) return {};
  if (!normal) return { [reversed!.w]: reversed! };
  if (!reversed) return { [normal.w]: normal };

  const winner = compareCheapest(normal, reversed);
  return { [winner.w]: winner };
}

function cheapestFromN(nodes: WorkNode[], maxSubcount: number): Work2Node {
  // Use a flat map: work_penalty -> best_node
  const bestByWork = new Map<number, WorkNode>();

  for (let subcount = 1; subcount <= maxSubcount; subcount++) {
    for (const leftNodes of combinations(nodes, subcount)) {
      const rightNodes = nodes.filter((n) => !leftNodes.includes(n));
      if (rightNodes.length === 0) continue;

      const leftDict = cheapestFromList(leftNodes);
      const rightDict = cheapestFromList(rightNodes);

      const merged = mergeFromDicts(leftDict, rightDict);
      for (const work in merged) {
        const node = merged[work];
        if (!node) continue;
        const existing = bestByWork.get(node.w);
        if (!existing || node.x < existing.x) {
          bestByWork.set(node.w, node);
        }
      }
    }
  }

  const result: Work2Node = {};
  for (const [w, node] of bestByWork) {
    result[w] = node;
  }
  return result;
}

function mergeFromDicts(leftDict: Work2Node, rightDict: Work2Node): Work2Node {
  const bestByWork = new Map<number, WorkNode>();

  for (const lw in leftDict) {
    const leftNode = leftDict[lw];
    if (!leftNode) continue;
    for (const rw in rightDict) {
      const rightNode = rightDict[rw];
      if (!rightNode) continue;
      let merged: Work2Node;
      try {
        merged = cheapestFromList([leftNode, rightNode]);
      } catch (e) {
        if (e instanceof MergeLevelsTooExpensiveError) continue;
        throw e;
      }
      for (const w in merged) {
        const node = merged[w];
        if (!node) continue;
        const existing = bestByWork.get(node.w);
        if (!existing || node.x < existing.x) {
          bestByWork.set(node.w, node);
        }
      }
    }
  }

  const result: Work2Node = {};
  for (const [w, node] of bestByWork) {
    result[w] = node;
  }
  return removeExpensive(result);
}

// ─────────────────────────────────────────────────────────────────────────────
// Instruction extraction (mirrors getInstructions from work.js)
// ─────────────────────────────────────────────────────────────────────────────
export interface FlatStep {
  leftLabel: string;
  rightLabel: string;
  mergeCost: number;
  xpCost: number;
  resultPriorWork: number; // 2^w - 1
  isRename?: boolean;
}

function extractSteps(comb: CombNode, enchIdToName: Record<string, string>, itemName: string): FlatStep[] {
  const steps: FlatStep[] = [];

  function resolve(node: CombNode): void {
    if (node.L) resolve(node.L);
    if (node.R) resolve(node.R);

    if (node.L !== undefined && node.R !== undefined && node.l !== undefined) {
      const leftLabel =
        typeof node.L.I === "number"
          ? enchIdToName[node.L.I] ?? `Ench ${node.L.I}`
          : typeof node.L.I === "string"
          ? node.L.I === "item" || !enchIdToName[node.L.I]
            ? itemName
            : enchIdToName[node.L.I]
          : itemName;

      const rightLabel =
        typeof node.R.I === "number"
          ? enchIdToName[node.R.I] ?? `Ench ${node.R.I}`
          : typeof node.R.I === "string"
          ? node.R.I === "item" || !enchIdToName[node.R.I]
            ? itemName
            : enchIdToName[node.R.I]
          : "Book";

      const rw = node.R.w ?? 0;
      const lw = node.L.w ?? 0;
      const mergeCost =
        (typeof node.R.v === "number" ? node.R.v : node.l) +
        Math.pow(2, lw) - 1 +
        Math.pow(2, rw) - 1;

      const resultW = Math.max(lw, rw) + 1;

      steps.push({
        leftLabel,
        rightLabel,
        mergeCost: Math.round(mergeCost),
        xpCost: Math.round(xpFromLevels(Math.round(mergeCost))),
        resultPriorWork: Math.pow(2, resultW) - 1,
      });
    }
  }

  resolve(comb);
  return steps;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────
export interface OptimizerResult {
  steps: FlatStep[];
  totalLevels: number;
  totalXP: number;
  isValid: boolean;
  tooExpensive: boolean;
}

export function optimizeEnchantmentOrder(
  item: Item,
  bookEnchantments: EnchantmentInstance[],
  _edition: Edition,
  wantRename: boolean = false
): OptimizerResult {
  memo = {}; // reset memoisation cache each run

  if (bookEnchantments.length === 0) {
    return { steps: [], totalLevels: 0, totalXP: 0, isValid: true, tooExpensive: false };
  }

  // Build label map and raw book nodes
  const enchIdToName: Record<string, string> = {};
  const rawBooks: WorkNode[] = [];

  for (const ei of bookEnchantments) {
    const id = ei.enchantment.id;
    const cost = ei.level * ei.enchantment.bookMultiplier;
    enchIdToName[id] = `${ei.enchantment.name} ${levelToRoman(ei.level)}`;
    rawBooks.push(makeBook(id, cost));
  }

  const isItemBase = item.category !== ItemCategory.BOOK;
  const itemLabel = item.name || item.category.toString();

  // ── Step 1: find most expensive book ──────────────────────────────────────
  const mostExpIdx = rawBooks.reduce(
    (maxI, b, i, arr) => (b.l > arr[maxI].l ? i : maxI),
    0
  );

  // ── Step 2: build the initial combined node (item + most expensive book) ──
  // This exactly mirrors work.js lines: merged_item = new MergeEnchants(item, enchant_objs[mostExpensive])
  let baseNode: WorkNode;
  let remainingBooks: WorkNode[];

  if (isItemBase) {
    baseNode = makeItem();
    // Remove the most-expensive book from the list
    remainingBooks = rawBooks.filter((_, i) => i !== mostExpIdx);
    const firstBook = rawBooks[mostExpIdx];

    let mergedBase: WorkNode;
    try {
      mergedBase = mergeNodes(baseNode, firstBook);
      mergedBase.c.L = { I: "item", l: 0, w: 0 };
    } catch {
      // Even one book is too expensive — still report it
      return {
        steps: [{ leftLabel: itemLabel, rightLabel: enchIdToName[firstBook.e[0]], mergeCost: 40, xpCost: 0, resultPriorWork: 0 }],
        totalLevels: 40,
        totalXP: 0,
        isValid: false,
        tooExpensive: true,
      };
    }

    if (remainingBooks.length === 0) {
      // Only one book — return immediately
      const steps = extractSteps(mergedBase.c, enchIdToName, itemLabel);
      if (wantRename && steps.length > 0) {
        steps[0].mergeCost += 1;
        steps[0].xpCost = xpFromLevels(steps[0].mergeCost);
        steps[0].isRename = true;
      }
      const totalLevels = steps.reduce((s, st) => s + st.mergeCost, 0);
      const totalXP = steps.reduce((s, st) => s + st.xpCost, 0);
      return {
        steps,
        totalLevels,
        totalXP,
        isValid: !steps.some(s => s.mergeCost > MAXIMUM_MERGE_LEVELS),
        tooExpensive: steps.some(s => s.mergeCost > MAXIMUM_MERGE_LEVELS),
      };
    }

    // Run the combinatorial search over [remaining books..., mergedBase]
    const allNodes = [...remainingBooks, mergedBase];
    const cheapestDict = cheapestFromList(allNodes);

    let bestNode: WorkNode | null = null;
    let bestXP = Infinity;
    for (const w in cheapestDict) {
      const node = cheapestDict[w];
      if (node && node.x < bestXP) {
        bestXP = node.x;
        bestNode = node;
      }
    }

    if (!bestNode) {
      return { steps: [], totalLevels: 0, totalXP: 0, isValid: false, tooExpensive: true };
    }

    const steps = extractSteps(bestNode.c, enchIdToName, itemLabel);
    if (wantRename && steps.length > 0) {
      steps[0].mergeCost += 1;
      steps[0].xpCost = xpFromLevels(steps[0].mergeCost);
      steps[0].isRename = true;
    }
    const totalLevels = steps.reduce((s, st) => s + st.mergeCost, 0);
    const totalXP = steps.reduce((s, st) => s + st.xpCost, 0);
    const tooExpensive = steps.some(s => s.mergeCost > MAXIMUM_MERGE_LEVELS);
    return { steps, totalLevels, totalXP, isValid: !tooExpensive, tooExpensive };

  } else {
    // Book base: most expensive book becomes the "item"
    const mostExpBook = rawBooks[mostExpIdx];
    baseNode = { ...mostExpBook, i: mostExpBook.e[0] };
    remainingBooks = rawBooks.filter((_, i) => i !== mostExpIdx);

    if (remainingBooks.length === 0) {
      return { steps: [], totalLevels: 0, totalXP: 0, isValid: true, tooExpensive: false };
    }

    const allNodes = [...remainingBooks, baseNode];
    const cheapestDict = cheapestFromList(allNodes);

    let bestNode: WorkNode | null = null;
    let bestXP = Infinity;
    for (const w in cheapestDict) {
      const node = cheapestDict[w];
      if (node && node.x < bestXP) {
        bestXP = node.x;
        bestNode = node;
      }
    }

    if (!bestNode) {
      return { steps: [], totalLevels: 0, totalXP: 0, isValid: false, tooExpensive: true };
    }

    const steps = extractSteps(bestNode.c, enchIdToName, itemLabel);
    if (wantRename && steps.length > 0) {
      steps[0].mergeCost += 1;
      steps[0].xpCost = xpFromLevels(steps[0].mergeCost);
      steps[0].isRename = true;
    }
    const totalLevels = steps.reduce((s, st) => s + st.mergeCost, 0);
    const totalXP = steps.reduce((s, st) => s + st.xpCost, 0);
    const tooExpensive = steps.some(s => s.mergeCost > MAXIMUM_MERGE_LEVELS);
    return { steps, totalLevels, totalXP, isValid: !tooExpensive, tooExpensive };
  }
}

function levelToRoman(level: number): string {
  const roman = ["", "I", "II", "III", "IV", "V"];
  return roman[level] ?? level.toString();
}
