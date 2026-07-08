import pizzaMixedAsset from "@/assets/pizza-mixed.jpg.asset.json";
import pizzaShawarmaMeatAsset from "@/assets/pizza-shawarma-meat.jpg.asset.json";
import pizzaShawarmaChickenAsset from "@/assets/pizza-shawarma-chicken.jpg.asset.json";
import pizzaKebabAsset from "@/assets/pizza-kebab.jpg.asset.json";
import pizzaSmokedBeefAsset from "@/assets/pizza-smoked-beef.jpg.asset.json";
import pizzaPepperoniAsset from "@/assets/pizza-pepperoni-new.jpg.asset.json";
import pizzaSalamiAsset from "@/assets/pizza-salami-new.jpg.asset.json";
import pizzaTurkeyAsset from "@/assets/pizza-turkey.jpg.asset.json";
import pizzaSauceAsset from "@/assets/pizza-sauce.jpg.asset.json";
import pizzaMushroomAsset from "@/assets/pizza-mushroom.jpg.asset.json";
import pizzaVeggieAsset from "@/assets/pizza-veggie.jpg.asset.json";
import pizzaMargheritaAsset from "@/assets/pizza-margherita.jpg.asset.json";
import pizzaHoneyAsset from "@/assets/pizza-honey.jpg.asset.json";
import pizzaPistachioAsset from "@/assets/pizza-pistachio.jpg.asset.json";
import drinkPepsiAsset from "@/assets/drink-pepsi.jpg.asset.json";
import drinkMirandaAsset from "@/assets/drink-miranda.jpg.asset.json";
import drinkSevenAsset from "@/assets/drink-seven.jpg.asset.json";
import drinkDewAsset from "@/assets/drink-dew.jpg.asset.json";
import drinkPepsiFamilyAsset from "@/assets/drink-pepsi-family.jpg.asset.json";
import drinkWaterAsset from "@/assets/drink-water.jpg.asset.json";
import { assetUrl } from "@/lib/asset-url";

const pizzaMixed = assetUrl(pizzaMixedAsset);
const pizzaShawarmaMeat = assetUrl(pizzaShawarmaMeatAsset);
const pizzaShawarmaChicken = assetUrl(pizzaShawarmaChickenAsset);
const pizzaKebab = assetUrl(pizzaKebabAsset);
const pizzaSmokedBeef = assetUrl(pizzaSmokedBeefAsset);
const pizzaTurkey = assetUrl(pizzaTurkeyAsset);
const pizzaSauce = assetUrl(pizzaSauceAsset);
const pizzaMushroom = assetUrl(pizzaMushroomAsset);
const pizzaVeggie = assetUrl(pizzaVeggieAsset);
const pizzaMargherita = assetUrl(pizzaMargheritaAsset);
const pizzaPepperoni = assetUrl(pizzaPepperoniAsset);
const pizzaSalami = assetUrl(pizzaSalamiAsset);
const pizzaHoney = assetUrl(pizzaHoneyAsset);
const pizzaPistachio = assetUrl(pizzaPistachioAsset);


export type PizzaSize = "S" | "M" | "L";

export const SIZE_LABELS: Record<PizzaSize, string> = {
  S: "صغير",
  M: "وسط",
  L: "كبير (عائلي)",
};

export const SIZE_SHORT: Record<PizzaSize, string> = {
  S: "صغير",
  M: "وسط",
  L: "عائلي",
};

export const CURRENCY = "د.ع";

export function formatPrice(n: number): string {
  return `${n.toLocaleString("en-US")} ${CURRENCY}`;
}

export type Pizza = {
  id: string;
  name: string;
  description: string;
  prices: Record<PizzaSize, number>;
  image: string;
};

const STANDARD = { S: 5000, M: 7000, L: 10000 } as const;
const BASIC = { S: 4000, M: 6000, L: 8000 } as const;

export const PIZZAS: Pizza[] = [
  { id: "mixed",            name: "مشكل",               description: "صلصة خاصة, شاورما لحم, شاورما دجاج, جبن موزريلا, فلفل, طماطم, زيتون",       prices: { ...STANDARD }, image: pizzaMixed },
  { id: "shawarma-meat",    name: "شاورما لحم",         description: "صلصة خاصة, شاورما لحم, جبن موزريلا, فلفل, طماطم, زيتون",                    prices: { ...STANDARD }, image: pizzaShawarmaMeat },
  { id: "shawarma-chicken", name: "شاورما دجاج",        description: "صلصة خاصة, شاورما دجاج, جبن موزريلا, فلفل, طماطم, زيتون",                   prices: { ...STANDARD }, image: pizzaShawarmaChicken },
  { id: "kebab",            name: "كباب لحم",           description: "صلصة خاصة, جبن موزريلا, كباب لحم عراقي, فلفل, طماطم, زيتون",                prices: { ...STANDARD }, image: pizzaKebab },
  { id: "smoked-beef",      name: "شرائح لحم مدخن",     description: "صلصة خاصة, جبن موزريلا, شرائح لحم مدخن",                                    prices: { ...STANDARD }, image: pizzaSmokedBeef },
  { id: "pepperoni",        name: "ببروني",             description: "صلصة خاصة, جبن موزريلا, شرائح ببروني",                                      prices: { ...STANDARD }, image: pizzaPepperoni },
  { id: "salami",           name: "سلامي",              description: "صلصة خاصة, جبن موزريلا, شرائح سلامي",                                       prices: { ...STANDARD }, image: pizzaSalami },
  { id: "turkey",           name: "حبش ديك رومي",       description: "صلصة خاصة, جبن موزريلا, حبش",                                               prices: { ...STANDARD }, image: pizzaTurkey },
  { id: "sauce",            name: "صوصج",               description: "صلصة خاصة, جبن موزريلا, صوصج",                                              prices: { ...STANDARD }, image: pizzaSauce },
  { id: "mushroom",         name: "فطر",                description: "صلصة خاصة, جبن موزريلا, فلفل, طماطم, زيتون, فطر",                           prices: { ...STANDARD }, image: pizzaMushroom },
  { id: "veggie",           name: "خضراوات",            description: "صلصة خاصة, جبن موزريلا, فلفل, طماطم, زيتون",                                prices: { ...BASIC },    image: pizzaVeggie },
  { id: "margherita",       name: "مارغاريتا",          description: "صلصة خاصة, جبن موزريلا",                                                    prices: { ...BASIC },    image: pizzaMargherita },
  { id: "honey",            name: "عسلية",              description: "صلصة عسل مع حليب, جبن موزريلا",                                             prices: { ...STANDARD }, image: pizzaHoney },
  { id: "pistachio",        name: "بستاشيو",            description: "صلصة بستاشيو خاصة, جبن موزريلا",                                            prices: { ...STANDARD }, image: pizzaPistachio },
];

export type Drink = {
  id: string;
  name: string;
  price: number;
  emoji: string;
  image?: string;
};

export const DRINKS: Drink[] = [
  { id: "pepsi",   name: "بيبسي ٣٣٠ مل",          price: 500,  emoji: "🥤", image: drinkPepsiAsset.url },
  { id: "miranda", name: "ميراندا برتقال ٣٣٠ مل", price: 500,  emoji: "🍊", image: drinkMirandaAsset.url },
  { id: "seven",   name: "سفن أب ٣٣٠ مل",         price: 500,  emoji: "🥤", image: drinkSevenAsset.url },
  { id: "dew",     name: "ديو ٣٣٠ مل",            price: 500,  emoji: "🥤", image: drinkDewAsset.url },
  { id: "pepsi-family", name: "بطل بيبسي عائلي",  price: 1000, emoji: "🥤", image: drinkPepsiFamilyAsset.url },
  { id: "water",   name: "ماء ٥٠٠ مل",            price: 250,  emoji: "💧", image: drinkWaterAsset.url },
];

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

export function pizzaPrice(pizzaId: string, size: PizzaSize): number {
  const p = PIZZAS.find((x) => x.id === pizzaId);
  return p ? p.prices[size] : 0;
}

export function itemLabel(item: CartItem): string {
  if (item.kind === "pizza") {
    const p = PIZZAS.find((x) => x.id === item.pizzaId);
    return `${p?.name ?? "بيتزا"} · ${SIZE_LABELS[item.size]}`;
  }
  const d = DRINKS.find((x) => x.id === item.drinkId);
  return d?.name ?? "مشروب";
}

export function itemUnitPrice(item: CartItem): number {
  if (item.kind === "pizza") return pizzaPrice(item.pizzaId, item.size);
  const d = DRINKS.find((x) => x.id === item.drinkId);
  return d?.price ?? 0;
}

export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + itemUnitPrice(i) * i.qty, 0);
}
