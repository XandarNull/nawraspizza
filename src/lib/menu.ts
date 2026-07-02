export type PizzaSize = "S" | "M" | "L";

export const SIZE_LABELS: Record<PizzaSize, string> = {
  S: 'Small (10")',
  M: 'Medium (12")',
  L: 'Large (14")',
};

export const SIZE_MULTIPLIER: Record<PizzaSize, number> = {
  S: 1,
  M: 1.3,
  L: 1.6,
};

export type Pizza = {
  id: string;
  name: string;
  description: string;
  basePrice: number; // price for Small
  emoji: string;
};

export const PIZZAS: Pizza[] = [
  { id: "margherita", name: "Margherita", description: "Tomato, fresh mozzarella, basil", basePrice: 9, emoji: "🍅" },
  { id: "pepperoni", name: "Pepperoni", description: "Tomato, mozzarella, spicy pepperoni", basePrice: 11, emoji: "🌶️" },
  { id: "quattro", name: "Quattro Formaggi", description: "Mozzarella, gorgonzola, parmesan, fontina", basePrice: 12, emoji: "🧀" },
  { id: "veggie", name: "Garden Veggie", description: "Peppers, olives, onion, mushrooms, corn", basePrice: 11, emoji: "🥬" },
  { id: "hawaiian", name: "Hawaiian", description: "Ham, pineapple, mozzarella", basePrice: 11, emoji: "🍍" },
  { id: "bbq", name: "BBQ Chicken", description: "Chicken, red onion, BBQ sauce, mozzarella", basePrice: 12, emoji: "🍗" },
  { id: "diavola", name: "Diavola", description: "Spicy salami, chili, mozzarella, tomato", basePrice: 12, emoji: "🔥" },
];

export type Drink = {
  id: string;
  name: string;
  price: number;
  emoji: string;
};

export const DRINKS: Drink[] = [
  { id: "coke", name: "Coca-Cola 330ml", price: 2.5, emoji: "🥤" },
  { id: "sprite", name: "Sprite 330ml", price: 2.5, emoji: "🥤" },
  { id: "water", name: "Still Water 500ml", price: 1.5, emoji: "💧" },
  { id: "beer", name: "Craft Beer 330ml", price: 4, emoji: "🍺" },
  { id: "juice", name: "Orange Juice 250ml", price: 3, emoji: "🍊" },
];

export function pizzaPrice(basePrice: number, size: PizzaSize) {
  return Math.round(basePrice * SIZE_MULTIPLIER[size] * 100) / 100;
}

export type CartPizza = {
  kind: "pizza";
  pizzaId: string;
  size: PizzaSize;
  qty: number;
};

export type CartDrink = {
  kind: "drink";
  drinkId: string;
  qty: number;
};

export type CartItem = CartPizza | CartDrink;

export function itemLabel(item: CartItem): string {
  if (item.kind === "pizza") {
    const p = PIZZAS.find((x) => x.id === item.pizzaId);
    return `${p?.name ?? "Pizza"} · ${SIZE_LABELS[item.size]}`;
  }
  const d = DRINKS.find((x) => x.id === item.drinkId);
  return d?.name ?? "Drink";
}

export function itemUnitPrice(item: CartItem): number {
  if (item.kind === "pizza") {
    const p = PIZZAS.find((x) => x.id === item.pizzaId);
    return p ? pizzaPrice(p.basePrice, item.size) : 0;
  }
  const d = DRINKS.find((x) => x.id === item.drinkId);
  return d?.price ?? 0;
}

export function cartTotal(items: CartItem[]): number {
  return Math.round(items.reduce((sum, i) => sum + itemUnitPrice(i) * i.qty, 0) * 100) / 100;
}
