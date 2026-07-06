export enum Edition {
  JAVA = "JAVA",
  BEDROCK = "BEDROCK",
}

export enum ItemCategory {
  SWORD = "SWORD",
  AXE = "AXE",
  PICKAXE = "PICKAXE",
  SHOVEL = "SHOVEL",
  HOE = "HOE",
  HELMET = "HELMET",
  CHESTPLATE = "CHESTPLATE",
  LEGGINGS = "LEGGINGS",
  BOOTS = "BOOTS",
  BOW = "BOW",
  CROSSBOW = "CROSSBOW",
  TRIDENT = "TRIDENT",
  FISHING_ROD = "FISHING_ROD",
  MACE = "MACE",
  ELYTRA = "ELYTRA",
  BOOK = "BOOK",
}

export interface Enchantment {
  id: string;
  name: string;
  maxLevel: number;
  itemMultiplier: number;
  bookMultiplier: number;
  categories: ItemCategory[];
  conflicts: string[];
}

export interface EnchantmentInstance {
  enchantment: Enchantment;
  level: number;
}

export interface Item {
  name?: string;
  category: ItemCategory;
  enchantments: EnchantmentInstance[];
  priorWorkPenalty: number;
}

export interface MergeStep {
  left: Item;
  right: Item;
  result: Item;
  cost: number;
  isTooExpensive: boolean;
  stepNumber: number;
}

export interface MergeTree {
  item: Item;
  left?: MergeTree;
  right?: MergeTree;
  cost?: number; // Cost of this specific merge
  cumulativeCost?: number; // Cost up to this point
  isItem?: boolean; // True if this is the target item, false if it's a book
  stepNumber?: number; // Execution order
}

export interface OptimizationResult {
  steps: MergeStep[];
  totalCost: number;
  totalLevels: number;
  isValid: boolean; // false if Too Expensive
  tree: MergeTree;
}
