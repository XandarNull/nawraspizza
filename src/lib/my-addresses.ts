// Client-side saved delivery addresses per device (no account required).

const KEY = "nawras_my_addresses_v1";

export type SavedAddress = {
  id: string;
  label?: string;
  name: string;
  phone: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  updatedAt: number;
};

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function makeId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function loadAddresses(): SavedAddress[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr
      .filter(
        (a): a is SavedAddress =>
          !!a &&
          typeof a === "object" &&
          typeof (a as SavedAddress).id === "string" &&
          typeof (a as SavedAddress).name === "string" &&
          typeof (a as SavedAddress).phone === "string" &&
          typeof (a as SavedAddress).address === "string",
      )
      .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  } catch {
    return [];
  }
}

function writeAll(list: SavedAddress[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 20)));
  } catch {
    /* ignore */
  }
}

export function saveAddress(input: Omit<SavedAddress, "id" | "updatedAt"> & { id?: string }): SavedAddress {
  const list = loadAddresses();
  const now = Date.now();
  // De-dupe by same phone+address
  const existingIdx = list.findIndex(
    (a) =>
      a.id === input.id ||
      (a.phone.trim() === input.phone.trim() && a.address.trim() === input.address.trim()),
  );
  const entry: SavedAddress = {
    id: input.id ?? (existingIdx >= 0 ? list[existingIdx].id : makeId()),
    label: input.label,
    name: input.name,
    phone: input.phone,
    address: input.address,
    latitude: input.latitude,
    longitude: input.longitude,
    updatedAt: now,
  };
  if (existingIdx >= 0) list.splice(existingIdx, 1);
  const next = [entry, ...list];
  writeAll(next);
  return entry;
}

export function deleteAddress(id: string) {
  const list = loadAddresses().filter((a) => a.id !== id);
  writeAll(list);
}
