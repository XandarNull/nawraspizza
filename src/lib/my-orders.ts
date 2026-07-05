// Client-side tracker for orders placed on this device.
// No accounts — we just remember the tokens the customer already owns.

const KEY = "nawras_my_orders_v1";

export type SavedOrder = {
  id: string;
  token: string;
  createdAt: number; // ms since epoch
};

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function loadMyOrders(): SavedOrder[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (o): o is SavedOrder =>
          !!o &&
          typeof o === "object" &&
          typeof (o as SavedOrder).id === "string" &&
          typeof (o as SavedOrder).token === "string" &&
          typeof (o as SavedOrder).createdAt === "number",
      )
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export function saveMyOrder(order: { id: string; token: string }) {
  if (!isBrowser()) return;
  const list = loadMyOrders();
  if (list.some((o) => o.token === order.token)) return;
  const next: SavedOrder[] = [
    { id: order.id, token: order.token, createdAt: Date.now() },
    ...list,
  ].slice(0, 40); // keep the last 40
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore quota errors
  }
}

export function removeMyOrder(token: string) {
  if (!isBrowser()) return;
  const list = loadMyOrders().filter((o) => o.token !== token);
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}
