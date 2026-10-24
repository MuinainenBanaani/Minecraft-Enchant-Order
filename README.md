# ⚒️ Minecraft Enchantment Optimizer

A modern **Minecraft Enchantment Optimizer** built with **Next.js**, designed to calculate the most XP-efficient order for combining enchanted books and items using an anvil.

The optimizer minimizes experience cost by finding the optimal merge tree while respecting Minecraft's anvil mechanics, work penalties, enchantment conflicts, and edition-specific rules.

## ✨ Features

* 🎯 Calculate the cheapest enchantment order
* 📚 Add existing enchantments already on an item
* 📖 Add multiple enchanted books
* ⚡ XP-efficient merge algorithm
* 🛡️ Detect conflicting enchantments
* ☕ Supports both **Java** and **Bedrock** editions
* 🪓 Supports nearly every enchantable item:

  * Swords
  * Pickaxes
  * Axes
  * Shovels
  * Hoes
  * Helmets
  * Chestplates
  * Leggings
  * Boots
  * Bows
  * Crossbows
  * Tridents
  * Maces
  * Elytra
  * Fishing Rods
  * Books
* 💻 Clean, responsive interface
* ⚙️ Built with TypeScript and React

---

## 📸 Preview

> Add a screenshot or GIF here.

```
public/screenshot.png
```

---

## 🚀 Getting Started

### Clone the repository

```bash
git clone https://github.com/yourusername/minecraft-enchantment-optimizer.git

cd minecraft-enchantment-optimizer
```

### Install dependencies

```bash
npm install
```

### Run the development server

```bash
npm run dev
```

Open:

```
http://localhost:3000
```

---

## 🧮 How It Works

The optimizer recreates Minecraft's anvil mechanics, including:

* Prior work penalties
* Enchantment costs
* XP conversion formulas
* Merge tree optimization
* Maximum anvil level limits
* Enchantment compatibility rules

It searches possible merge combinations and chooses the one with the lowest total XP cost.

---

## 🛠 Tech Stack

* **Next.js 16**
* **React 19**
* **TypeScript**
* **Tailwind CSS v4**

---

## 📁 Project Structure

```
src/
 ├── app/
 │   ├── page.tsx
 │   └── layout.tsx
 │
 ├── components/
 │   └── Tooltip.tsx
 │
 └── lib/
     ├── enchantments.ts
     ├── optimizer.ts
     └── types.ts

public/
 └── items/
```

---

## 🎮 Supported Editions

* ✅ Minecraft Java Edition
* ✅ Minecraft Bedrock Edition

Edition-specific enchantment rules and compatibility are handled automatically.

---

## 🤝 Contributing

Contributions, bug reports, and feature requests are welcome.

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Open a Pull Request

---

## 📄 License

This project is open source. Feel free to use, modify, and distribute it under the license of your choice.

---

## ❤️ Acknowledgements

Inspired by Minecraft's anvil mechanics and community enchantment optimization research. Thanks to the Minecraft community for documenting enchantment behavior and XP calculations.
