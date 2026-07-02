import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  PIZZAS,
  DRINKS,
  SIZE_LABELS,
  type PizzaSize,
  type CartItem,
  pizzaPrice,
  itemLabel,
  itemUnitPrice,
  cartTotal,
} from "@/lib/menu";
import { Pizza as PizzaIcon, MapPin, Plus, Minus, Trash2, ShoppingBag, LocateFixed } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Forno & Fuoco — Wood-fired pizza, delivered" },
      { name: "description", content: "Order artisan wood-fired pizza and drinks. Pick your pies, share your address, we deliver hot." },
      { property: "og:title", content: "Forno & Fuoco — Wood-fired pizza" },
      { property: "og:description", content: "Order wood-fired pizza and drinks, straight to your door." },
    ],
  }),
  component: OrderPage,
});

type Step = "menu" | "checkout" | "done";

function OrderPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [step, setStep] = useState<Step>("menu");
  const [sizeById, setSizeById] = useState<Record<string, PizzaSize>>(
    () => Object.fromEntries(PIZZAS.map((p) => [p.id, "M" as PizzaSize])),
  );

  const addPizza = (pizzaId: string) => {
    const size = sizeById[pizzaId] ?? "M";
    setCart((c) => {
      const idx = c.findIndex((i) => i.kind === "pizza" && i.pizzaId === pizzaId && i.size === size);
      if (idx >= 0) {
        const next = [...c];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [...c, { kind: "pizza", pizzaId, size, qty: 1 }];
    });
  };

  const addDrink = (drinkId: string) => {
    setCart((c) => {
      const idx = c.findIndex((i) => i.kind === "drink" && i.drinkId === drinkId);
      if (idx >= 0) {
        const next = [...c];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [...c, { kind: "drink", drinkId, qty: 1 }];
    });
  };

  const changeQty = (index: number, delta: number) => {
    setCart((c) => {
      const next = [...c];
      const q = next[index].qty + delta;
      if (q <= 0) return next.filter((_, i) => i !== index);
      next[index] = { ...next[index], qty: q };
      return next;
    });
  };

  const removeItem = (index: number) => setCart((c) => c.filter((_, i) => i !== index));

  const total = cartTotal(cart);
  const totalCount = cart.reduce((s, i) => s + i.qty, 0);

  return (
    <div className="min-h-screen bg-[color:var(--cream)] text-[color:var(--ink)]">
      <Toaster richColors position="top-center" />
      <Header />

      {step === "menu" && (
        <MenuStep
          cart={cart}
          total={total}
          totalCount={totalCount}
          sizeById={sizeById}
          setSizeById={setSizeById}
          addPizza={addPizza}
          addDrink={addDrink}
          changeQty={changeQty}
          removeItem={removeItem}
          onCheckout={() => setStep("checkout")}
        />
      )}

      {step === "checkout" && (
        <CheckoutStep
          cart={cart}
          total={total}
          onBack={() => setStep("menu")}
          onDone={() => {
            setCart([]);
            setStep("done");
          }}
        />
      )}

      {step === "done" && <DoneStep onNew={() => setStep("menu")} />}

      <footer className="border-t border-[color:var(--line)] mt-16 py-8 text-center text-sm text-[color:var(--ink-muted)]">
        Forno &amp; Fuoco · Open 11:00 – 23:00 · <Link to="/dashboard" className="underline underline-offset-4 hover:text-[color:var(--tomato)]">Staff dashboard</Link>
      </footer>
    </div>
  );
}

function Header() {
  return (
    <header className="border-b border-[color:var(--line)] bg-[color:var(--cream)]/90 backdrop-blur sticky top-0 z-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-[color:var(--tomato)] text-white grid place-items-center">
            <PizzaIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="font-serif text-xl leading-none">Forno &amp; Fuoco</div>
            <div className="text-[11px] uppercase tracking-widest text-[color:var(--ink-muted)]">Wood-fired since 1998</div>
          </div>
        </div>
      </div>
    </header>
  );
}

function MenuStep(props: {
  cart: CartItem[];
  total: number;
  totalCount: number;
  sizeById: Record<string, PizzaSize>;
  setSizeById: (fn: (prev: Record<string, PizzaSize>) => Record<string, PizzaSize>) => void;
  addPizza: (id: string) => void;
  addDrink: (id: string) => void;
  changeQty: (i: number, d: number) => void;
  removeItem: (i: number) => void;
  onCheckout: () => void;
}) {
  const { cart, total, totalCount, sizeById, setSizeById, addPizza, addDrink, changeQty, removeItem, onCheckout } = props;

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-32">
      <section className="mb-10">
        <p className="text-[color:var(--tomato)] uppercase tracking-[0.25em] text-xs font-semibold">Menu</p>
        <h1 className="font-serif text-4xl sm:text-5xl mt-2 leading-tight">Pick your pizza,<br/>we&apos;ll fire the oven.</h1>
        <p className="mt-3 text-[color:var(--ink-muted)] max-w-lg">Seven house recipes, three sizes. Add drinks, tell us where you are, and we&apos;ll bring it hot.</p>
      </section>

      <section aria-labelledby="pizzas" className="mb-12">
        <div className="flex items-baseline justify-between mb-4">
          <h2 id="pizzas" className="font-serif text-2xl">Pizzas</h2>
          <span className="text-xs text-[color:var(--ink-muted)]">S · M · L</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {PIZZAS.map((p) => {
            const size = sizeById[p.id] ?? "M";
            const price = pizzaPrice(p.basePrice, size);
            return (
              <article key={p.id} className="bg-white border border-[color:var(--line)] rounded-2xl p-5 flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-serif text-xl leading-tight">{p.name}</h3>
                    <p className="text-sm text-[color:var(--ink-muted)] mt-1">{p.description}</p>
                  </div>
                  <div className="text-3xl" aria-hidden>{p.emoji}</div>
                </div>

                <div className="mt-4 flex items-center gap-1 bg-[color:var(--cream)] rounded-full p-1 w-fit">
                  {(Object.keys(SIZE_LABELS) as PizzaSize[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSizeById((prev) => ({ ...prev, [p.id]: s }))}
                      className={
                        "px-3 py-1 text-xs font-semibold rounded-full transition-colors " +
                        (size === s
                          ? "bg-[color:var(--ink)] text-[color:var(--cream)]"
                          : "text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]")
                      }
                      aria-pressed={size === s}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="font-serif text-2xl">${price.toFixed(2)}</div>
                  <button
                    onClick={() => addPizza(p.id)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[color:var(--tomato)] text-white text-sm font-semibold hover:bg-[color:var(--tomato-dark)] transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="drinks" className="mb-12">
        <h2 id="drinks" className="font-serif text-2xl mb-4">Drinks</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {DRINKS.map((d) => (
            <div key={d.id} className="bg-white border border-[color:var(--line)] rounded-xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-2xl" aria-hidden>{d.emoji}</div>
                <div>
                  <div className="font-medium">{d.name}</div>
                  <div className="text-sm text-[color:var(--ink-muted)]">${d.price.toFixed(2)}</div>
                </div>
              </div>
              <button
                onClick={() => addDrink(d.id)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-[color:var(--ink)] text-sm font-semibold hover:bg-[color:var(--ink)] hover:text-[color:var(--cream)] transition-colors"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
          ))}
        </div>
      </section>

      {cart.length > 0 && (
        <section className="bg-white border border-[color:var(--line)] rounded-2xl p-5">
          <h2 className="font-serif text-2xl mb-4 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" /> Your order
          </h2>
          <ul className="divide-y divide-[color:var(--line)]">
            {cart.map((item, i) => (
              <li key={i} className="py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{itemLabel(item)}</div>
                  <div className="text-sm text-[color:var(--ink-muted)]">${itemUnitPrice(item).toFixed(2)} each</div>
                </div>
                <div className="flex items-center gap-1 border border-[color:var(--line)] rounded-full">
                  <button onClick={() => changeQty(i, -1)} className="w-8 h-8 grid place-items-center hover:bg-[color:var(--cream)] rounded-full" aria-label="Decrease">
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center text-sm font-semibold">{item.qty}</span>
                  <button onClick={() => changeQty(i, 1)} className="w-8 h-8 grid place-items-center hover:bg-[color:var(--cream)] rounded-full" aria-label="Increase">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="w-16 text-right font-semibold">${(itemUnitPrice(item) * item.qty).toFixed(2)}</div>
                <button onClick={() => removeItem(i)} className="text-[color:var(--ink-muted)] hover:text-[color:var(--tomato)] p-1" aria-label="Remove">
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {totalCount > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-30 border-t border-[color:var(--line)] bg-white/95 backdrop-blur">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-[color:var(--ink-muted)] uppercase tracking-widest">Total · {totalCount} item{totalCount === 1 ? "" : "s"}</div>
              <div className="font-serif text-2xl">${total.toFixed(2)}</div>
            </div>
            <button
              onClick={onCheckout}
              className="px-5 py-3 rounded-full bg-[color:var(--tomato)] text-white font-semibold hover:bg-[color:var(--tomato-dark)] transition-colors"
            >
              Continue to delivery
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function CheckoutStep(props: {
  cart: CartItem[];
  total: number;
  onBack: () => void;
  onDone: () => void;
}) {
  const { cart, total, onBack, onDone } = props;
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const locate = () => {
    if (!("geolocation" in navigator)) {
      toast.error("GPS not available on this device");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
        toast.success("GPS location captured");
      },
      (err) => {
        setLocating(false);
        toast.error(err.message || "Could not get GPS location");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !address.trim()) {
      toast.error("Please fill name, phone and address");
      return;
    }
    setSubmitting(true);
    const payload = {
      customer_name: name.trim().slice(0, 100),
      phone: phone.trim().slice(0, 30),
      address: address.trim().slice(0, 300),
      latitude: coords?.lat ?? null,
      longitude: coords?.lng ?? null,
      notes: notes.trim().slice(0, 500) || null,
      items: cart.map((i) => ({ ...i, label: itemLabel(i), unit_price: itemUnitPrice(i) })),
      total,
      status: "new",
    };
    const { error } = await supabase.from("orders").insert(payload);
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    onDone();
  };

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-8 pb-16">
      <button onClick={onBack} className="text-sm text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] mb-4">← Back to menu</button>
      <h1 className="font-serif text-4xl">Where to?</h1>
      <p className="text-[color:var(--ink-muted)] mt-2">Tell us your address and share your GPS so the driver finds you fast.</p>

      <form onSubmit={submit} className="mt-8 space-y-5">
        <Field label="Your name" required>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required className="input" placeholder="Maria Rossi" />
        </Field>
        <Field label="Phone" required>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} required className="input" placeholder="+1 555 010 0123" inputMode="tel" />
        </Field>
        <Field label="Delivery address" required>
          <textarea value={address} onChange={(e) => setAddress(e.target.value)} maxLength={300} required className="input min-h-[80px]" placeholder="Street, number, floor, city" />
        </Field>

        <div className="rounded-2xl border border-[color:var(--line)] bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[color:var(--tomato)]" />
              <div>
                <div className="font-medium">GPS location</div>
                <div className="text-sm text-[color:var(--ink-muted)]">
                  {coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : "Not shared yet"}
                </div>
              </div>
            </div>
            <button type="button" onClick={locate} disabled={locating} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-[color:var(--ink)] text-sm font-semibold hover:bg-[color:var(--ink)] hover:text-[color:var(--cream)] transition-colors disabled:opacity-50">
              <LocateFixed className="w-4 h-4" /> {locating ? "Locating…" : coords ? "Update" : "Share GPS"}
            </button>
          </div>
        </div>

        <Field label="Notes (optional)">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} className="input min-h-[60px]" placeholder="Ring the top bell, no onions on pizza 2…" />
        </Field>

        <div className="rounded-2xl bg-[color:var(--ink)] text-[color:var(--cream)] p-5">
          <div className="flex items-baseline justify-between">
            <span className="uppercase tracking-widest text-xs">Total</span>
            <span className="font-serif text-3xl">${total.toFixed(2)}</span>
          </div>
          <ul className="mt-3 text-sm space-y-1 text-[color:var(--cream)]/80">
            {cart.map((i, k) => (
              <li key={k} className="flex justify-between gap-2">
                <span className="truncate">{i.qty}× {itemLabel(i)}</span>
                <span>${(itemUnitPrice(i) * i.qty).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>

        <button type="submit" disabled={submitting || cart.length === 0} className="w-full py-3.5 rounded-full bg-[color:var(--tomato)] text-white font-semibold hover:bg-[color:var(--tomato-dark)] transition-colors disabled:opacity-60">
          {submitting ? "Placing order…" : "Place order"}
        </button>
      </form>
    </main>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">
        {label} {required && <span className="text-[color:var(--tomato)]">*</span>}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function DoneStep({ onNew }: { onNew: () => void }) {
  return (
    <main className="max-w-xl mx-auto px-4 sm:px-6 pt-16 pb-16 text-center">
      <div className="text-6xl mb-4">🍕</div>
      <h1 className="font-serif text-4xl">Order received!</h1>
      <p className="mt-3 text-[color:var(--ink-muted)]">The kitchen has your order. We&apos;ll call you if anything comes up.</p>
      <button onClick={onNew} className="mt-8 inline-flex px-5 py-3 rounded-full bg-[color:var(--tomato)] text-white font-semibold hover:bg-[color:var(--tomato-dark)] transition-colors">
        Order again
      </button>
    </main>
  );
}
