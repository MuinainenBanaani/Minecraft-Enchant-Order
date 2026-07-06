import { EnchantmentInstance, Item, ItemCategory } from "../lib/types";

interface TooltipProps {
  item: Item;
}

export function Tooltip({ item }: TooltipProps) {
  const getItemDisplayName = (category: ItemCategory) => {
    switch (category) {
      case ItemCategory.SWORD: return "Sword";
      case ItemCategory.AXE: return "Axe";
      case ItemCategory.PICKAXE: return "Pickaxe";
      case ItemCategory.SHOVEL: return "Shovel";
      case ItemCategory.HOE: return "Hoe";
      case ItemCategory.HELMET: return "Helmet";
      case ItemCategory.CHESTPLATE: return "Chestplate";
      case ItemCategory.LEGGINGS: return "Leggings";
      case ItemCategory.BOOTS: return "Boots";
      case ItemCategory.BOW: return "Bow";
      case ItemCategory.CROSSBOW: return "Crossbow";
      case ItemCategory.TRIDENT: return "Trident";
      case ItemCategory.FISHING_ROD: return "Fishing Rod";
      case ItemCategory.MACE: return "Mace";
      case ItemCategory.ELYTRA: return "Elytra";
      case ItemCategory.BOOK: return "Enchanted Book";
      default: return "Item";
    }
  };

  const toRoman = (num: number) => {
    const roman = ["", "I", "II", "III", "IV", "V"];
    return roman[num] || num.toString();
  };

  const getAttackDamage = (category: ItemCategory) => {
    switch (category) {
      case ItemCategory.SWORD: return 8;
      case ItemCategory.AXE: return 10;
      case ItemCategory.PICKAXE: return 6;
      case ItemCategory.SHOVEL: return 5.5;
      case ItemCategory.HOE: return 1;
      case ItemCategory.TRIDENT: return 9;
      case ItemCategory.MACE: return 5;
      default: return 0;
    }
  };

  const getAttackSpeed = (category: ItemCategory) => {
    switch (category) {
      case ItemCategory.SWORD: return 1.6;
      case ItemCategory.AXE: return 1;
      case ItemCategory.PICKAXE: return 1.2;
      case ItemCategory.SHOVEL: return 1;
      case ItemCategory.HOE: return 4;
      case ItemCategory.TRIDENT: return 1.1;
      case ItemCategory.MACE: return 0.6;
      default: return 0;
    }
  };
  
  const getArmorInfo = (category: ItemCategory) => {
    switch (category) {
      case ItemCategory.HELMET: return { armor: 3, toughness: 3, knockback: 1 };
      case ItemCategory.CHESTPLATE: return { armor: 8, toughness: 3, knockback: 1 };
      case ItemCategory.LEGGINGS: return { armor: 6, toughness: 3, knockback: 1 };
      case ItemCategory.BOOTS: return { armor: 3, toughness: 3, knockback: 1 };
      default: return null;
    }
  };

  const displayName = item.name && item.name !== "Enchanted Book" ? item.name : getItemDisplayName(item.category);
  const isBook = item.category === ItemCategory.BOOK;
  const attackDamage = getAttackDamage(item.category);
  const attackSpeed = getAttackSpeed(item.category);
  const armorInfo = getArmorInfo(item.category);
  
  const isToolOrWeapon = attackDamage > 0;
  const isArmor = armorInfo !== null;
  const imageFileName = item.category.toLowerCase() + ".png";

  return (
    <div className="bg-[#110211] border-2 border-[#2b0563] p-2 shadow-[0_0_0_2px_#110211] font-mono text-base inline-block rounded max-w-lg w-full font-mc z-50">
      <div className="flex items-start gap-4 p-2">
        {/* Left: Square Image Box */}
        <div className="mc-slot flex-shrink-0 w-20 h-20 flex items-center justify-center">
          <img 
            src={`/items/${isBook ? 'enchanted_book.png' : imageFileName}`} 
            alt={displayName}
            className="pixelated w-14 h-14"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>

        {/* Right: Text */}
        <div className="flex-1 flex flex-col pt-1">
          {/* Title */}
          <div className={`${isBook ? "text-[#ffff55]" : "text-[#55ffff]"} text-xl`}>
            {displayName}
          </div>

          {/* Enchantments */}
          <div className="text-[#aaaaaa] mt-1 leading-snug">
            {item.enchantments.map((ench, i) => (
              <div key={i}>
                {ench.enchantment.name} {ench.level > 1 || ench.enchantment.maxLevel > 1 ? toRoman(ench.level) : ""}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
