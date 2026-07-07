import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createOrder, getRestaurantState, type RestaurantState } from "@/lib/orders.functions";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  PIZZAS,
  DRINKS,
  SIZE_LABELS,
  SIZE_SHORT,
  type PizzaSize,
  type CartItem,
  pizzaPrice,
  itemLabel,
  itemUnitPrice,
  cartTotal,
  formatPrice,
} from "@/lib/menu";
import { MapPin, Plus, Minus, Trash2, ShoppingBag, LocateFixed, Phone, Lock, ClipboardList } from "lucide-react";
import nawrasLogo from "@/assets/nawras-logo.jpg.asset.json";
import { assetUrl } from "@/lib/asset-url";
import { saveMyOrder } from "@/lib/my-orders";



export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "مطعم بيتزا نورس — اطلب الآن" },
      { name: "description", content: "اختر البيتزا والحجم والمشروبات، شارك موقعك، ونحن نوصلها ساخنة." },
      { property: "og:title", content: "مطعم بيتزا نورس" },
      { property: "og:description", content: "اطلب بيتزا نورس مع التوصيل." },
    ],
  }),
  component: OrderPage,
});

type Step = "menu" | "checkout";

const BRANCHES = [
  { name: "فرع الجامعة", phone: "07710217701" },
  { name: "فرع العامرية", phone: "07700027625" },
  { name: "فرع السيدية", phone: "07711171441" },
];

function OrderPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [step, setStep] = useState<Step>("menu");
  const [sizeById, setSizeById] = useState<Record<string, PizzaSize>>(
    () => Object.fromEntries(PIZZAS.map((p) => [p.id, "M" as PizzaSize])),
  );
  const [state, setState] = useState<RestaurantState>({ is_open: true, unavailable_pizzas: [] });
  const fetchState = useServerFn(getRestaurantState);
  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetchState().then((s) => { if (!cancelled) setState(s); }).catch(() => {});
    };
    load();
    const id = setInterval(load, 15000);
    return () => { cancelled = true; clearInterval(id); };
  }, [fetchState]);
  const unavailableSet = new Set(state.unavailable_pizzas);

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

      {!state.is_open && (
        <div className="bg-[color:var(--tomato)] text-white text-center text-sm py-2 font-bold">
          🚫 المطعم مغلق حالياً — لا يمكن استقبال الطلبات
        </div>
      )}

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
          isOpen={state.is_open}
          unavailableSet={unavailableSet}
          onCheckout={() => setStep("checkout")}
        />
      )}

      {step === "checkout" && (
        <CheckoutStep
          cart={cart}
          total={total}
          onBack={() => setStep("menu")}
        />
      )}

      <footer className="border-t border-[color:var(--line)] mt-16 py-8 text-center text-sm text-[color:var(--ink-muted)]">
        <div className="mb-2">مطعم بيتزا نورس · مفتوح من ١١:٠٠ حتى ٢٣:٠٠</div>
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mb-3">
          {BRANCHES.map((b) => (
            <a key={b.phone} href={`tel:${b.phone}`} className="inline-flex items-center gap-1.5 hover:text-[color:var(--tomato)]">
              <Phone className="w-3.5 h-3.5" /> {b.name} — {b.phone}
            </a>
          ))}
        </div>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[color:var(--navy-deep)] text-white text-sm font-bold hover:bg-[color:var(--tomato)] transition-colors"
        >
          <Lock className="w-4 h-4" /> لوحة تحكم المطعم
        </Link>
      </footer>
    </div>
  );
}

function Header() {
  return (
    <header className="border-b border-[color:var(--line)] bg-[color:var(--cream)]/90 backdrop-blur sticky top-0 z-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={assetUrl(nawrasLogo)}
            alt="شعار مطعم بيتزا نورس"
            width={48}
            height={48}
            className="w-12 h-12 rounded-full object-cover ring-2 ring-[color:var(--tomato)]/50 shadow-sm"
          />
          <div>
            <div className="font-serif text-xl leading-none">مطعم بيتزا نورس</div>
            <div className="text-[11px] uppercase tracking-widest text-[color:var(--tomato)] mt-1">Nawras Pizza</div>
          </div>
        </div>
        <Link
          to="/my-orders"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white border border-[color:var(--line)] text-sm font-bold text-[color:var(--ink)] hover:bg-[color:var(--tomato)] hover:text-white hover:border-transparent transition-colors"
        >
          <ClipboardList className="w-4 h-4" />
          <span>طلباتي</span>
        </Link>
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
        <p className="text-[color:var(--tomato)] tracking-[0.25em] text-xs font-bold">القائمة</p>
        <h1 className="font-serif text-4xl sm:text-5xl mt-2 leading-tight">اختر البيتزا،<br/>ونحن نوصلها إليك ساخنة.</h1>
        <p className="mt-3 text-[color:var(--ink-muted)] max-w-lg">أربعة عشر نوعاً من البيتزا بثلاثة أحجام. أضف مشروبك، شاركنا عنوانك، ونصلك بسرعة.</p>
      </section>

      <section aria-labelledby="pizzas" className="mb-12">
        <div className="flex items-baseline justify-between mb-4">
          <h2 id="pizzas" className="font-serif text-2xl">البيتزا</h2>
          <span className="text-xs text-[color:var(--ink-muted)]">صغير · وسط · عائلي</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {PIZZAS.map((p) => {
            const size = sizeById[p.id] ?? "M";
            const price = pizzaPrice(p.id, size);
            return (
              <article key={p.id} className="bg-white border border-[color:var(--line)] rounded-2xl overflow-hidden flex flex-col">
                <div className="relative aspect-[4/3] bg-[color:var(--cream)] overflow-hidden">
                  <img
                    src={p.image}
                    alt={p.name}
                    loading="lazy"
                    decoding="async"
                    width={768}
                    height={576}
                    className="w-full h-full object-cover"
                  />

                </div>
                <div className="p-5 flex flex-col flex-1">
                  <div>
                    <h3 className="font-serif text-xl leading-tight">{p.name}</h3>
                    <p className="text-sm text-[color:var(--ink-muted)] mt-1">{p.description}</p>
                  </div>

                  <div className="mt-4 flex items-center gap-1 bg-[color:var(--cream)] rounded-full p-1 w-fit">
                    {(Object.keys(SIZE_LABELS) as PizzaSize[]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSizeById((prev) => ({ ...prev, [p.id]: s }))}
                        className={
                          "px-3 py-1 text-xs font-bold rounded-full transition-colors " +
                          (size === s
                            ? "bg-[color:var(--ink)] text-[color:var(--cream)]"
                            : "text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]")
                        }
                        aria-pressed={size === s}
                      >
                        {SIZE_SHORT[s]}
                      </button>
                    ))}
                  </div>

                  <div className="mt-auto pt-4 flex items-center justify-between">
                    <div className="font-serif text-2xl">{formatPrice(price)}</div>
                    <button
                      onClick={() => addPizza(p.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[color:var(--tomato)] text-white text-sm font-bold hover:bg-[color:var(--tomato-dark)] transition-colors"
                    >
                      <Plus className="w-4 h-4" /> أضف
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="drinks" className="mb-12">
        <h2 id="drinks" className="font-serif text-2xl mb-4">المشروبات</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {DRINKS.map((d) => (
            <div key={d.id} className="bg-white border border-[color:var(--line)] rounded-xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-2xl" aria-hidden>{d.emoji}</div>
                <div>
                  <div className="font-medium">{d.name}</div>
                  <div className="text-sm text-[color:var(--ink-muted)]">{formatPrice(d.price)}</div>
                </div>
              </div>
              <button
                onClick={() => addDrink(d.id)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-[color:var(--ink)] text-sm font-bold hover:bg-[color:var(--ink)] hover:text-[color:var(--cream)] transition-colors"
              >
                <Plus className="w-4 h-4" /> أضف
              </button>
            </div>
          ))}
        </div>
      </section>

      {cart.length > 0 && (
        <section className="bg-white border border-[color:var(--line)] rounded-2xl p-5">
          <h2 className="font-serif text-2xl mb-4 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" /> طلبك
          </h2>
          <ul className="divide-y divide-[color:var(--line)]">
            {cart.map((item, i) => (
              <li key={i} className="py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{itemLabel(item)}</div>
                  <div className="text-sm text-[color:var(--ink-muted)]">{formatPrice(itemUnitPrice(item))} للواحد</div>
                </div>
                <div className="flex items-center gap-1 border border-[color:var(--line)] rounded-full">
                  <button onClick={() => changeQty(i, -1)} className="w-8 h-8 grid place-items-center hover:bg-[color:var(--cream)] rounded-full" aria-label="تقليل">
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center text-sm font-bold">{item.qty}</span>
                  <button onClick={() => changeQty(i, 1)} className="w-8 h-8 grid place-items-center hover:bg-[color:var(--cream)] rounded-full" aria-label="زيادة">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="w-24 text-left font-bold">{formatPrice(itemUnitPrice(item) * item.qty)}</div>
                <button onClick={() => removeItem(i)} className="text-[color:var(--ink-muted)] hover:text-[color:var(--tomato)] p-1" aria-label="حذف">
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
              <div className="text-xs text-[color:var(--ink-muted)] tracking-widest">الإجمالي · {totalCount} قطعة</div>
              <div className="font-serif text-2xl">{formatPrice(total)}</div>
            </div>
            <button
              onClick={onCheckout}
              className="px-5 py-3 rounded-full bg-[color:var(--tomato)] text-white font-bold hover:bg-[color:var(--tomato-dark)] transition-colors"
            >
              متابعة إلى التوصيل
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
}) {
  const { cart, total, onBack } = props;
  const navigate = useNavigate();
  const submitOrder = useServerFn(createOrder);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const locate = () => {
    if (!("geolocation" in navigator)) {
      toast.error("خدمة الموقع غير متاحة على هذا الجهاز");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
        toast.success("تم تسجيل الموقع");
      },
      (err) => {
        setLocating(false);
        toast.error(err.message || "تعذّر الحصول على الموقع");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !address.trim()) {
      toast.error("يرجى إدخال الاسم والهاتف والعنوان");
      return;
    }
    setSubmitting(true);
    try {
      const res = await submitOrder({
        data: {
          customer_name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
          notes: notes.trim() || null,
          items: cart.map((i) => ({ ...i, label: itemLabel(i), unit_price: itemUnitPrice(i) })),
          total,
        },
      });
      saveMyOrder({ id: res.id, token: res.tracking_token });
      navigate({ to: "/track/$token", params: { token: res.tracking_token } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر إرسال الطلب");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-8 pb-16">
      <button onClick={onBack} className="text-sm text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] mb-4">→ العودة إلى القائمة</button>
      <h1 className="font-serif text-4xl">أين نوصل الطلب؟</h1>
      <p className="text-[color:var(--ink-muted)] mt-2">أدخل عنوانك وشارك موقعك ليصلك السائق بسرعة.</p>

      <form onSubmit={submit} className="mt-8 space-y-5">
        <Field label="الاسم" required>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required className="input" placeholder="محمد علي" />
        </Field>
        <Field label="رقم الهاتف" required>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} required className="input" placeholder="07XX XXX XXXX" inputMode="tel" />
        </Field>
        <Field label="عنوان التوصيل" required>
          <textarea value={address} onChange={(e) => setAddress(e.target.value)} maxLength={300} required className="input min-h-[80px]" placeholder="المحافظة، المنطقة، الشارع، رقم الدار" />
        </Field>

        <div className="rounded-2xl border border-[color:var(--line)] bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[color:var(--tomato)]" />
              <div>
                <div className="font-bold">الموقع الجغرافي (GPS)</div>
                <div className="text-sm text-[color:var(--ink-muted)]">
                  {coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : "لم يُشارَك بعد"}
                </div>
              </div>
            </div>
            <button type="button" onClick={locate} disabled={locating} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-[color:var(--ink)] text-sm font-bold hover:bg-[color:var(--ink)] hover:text-[color:var(--cream)] transition-colors disabled:opacity-50">
              <LocateFixed className="w-4 h-4" /> {locating ? "جارِ التحديد…" : coords ? "تحديث" : "شارك الموقع"}
            </button>
          </div>
          {coords && (
            <div className="mt-4 overflow-hidden rounded-xl border border-[color:var(--line)]">
              <iframe
                key={`${coords.lat},${coords.lng}`}
                title="موقع التوصيل"
                className="w-full h-56 block"
                loading="lazy"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - 0.003}%2C${coords.lat - 0.002}%2C${coords.lng + 0.003}%2C${coords.lat + 0.002}&layer=mapnik&marker=${coords.lat}%2C${coords.lng}`}
              />
              <a
                href={`https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lng}#map=17/${coords.lat}/${coords.lng}`}
                target="_blank"
                rel="noreferrer"
                className="block text-center text-xs py-2 bg-[color:var(--cream)] text-[color:var(--ink-muted)] hover:text-[color:var(--tomato)]"
              >
                عرض على الخريطة الكاملة ↗
              </a>
            </div>
          )}
        </div>

        <Field label="ملاحظات (اختياري)">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} className="input min-h-[60px]" placeholder="اضغط الجرس، بدون بصل على البيتزا الثانية…" />
        </Field>

        <div className="rounded-2xl bg-[color:var(--ink)] text-[color:var(--cream)] p-5">
          <div className="flex items-baseline justify-between">
            <span className="tracking-widest text-xs">الإجمالي</span>
            <span className="font-serif text-3xl">{formatPrice(total)}</span>
          </div>
          <ul className="mt-3 text-sm space-y-1 text-[color:var(--cream)]/80">
            {cart.map((i, k) => (
              <li key={k} className="flex justify-between gap-2">
                <span className="truncate">{i.qty}× {itemLabel(i)}</span>
                <span>{formatPrice(itemUnitPrice(i) * i.qty)}</span>
              </li>
            ))}
          </ul>
        </div>

        <button type="submit" disabled={submitting || cart.length === 0} className="w-full py-3.5 rounded-full bg-[color:var(--tomato)] text-white font-bold hover:bg-[color:var(--tomato-dark)] transition-colors disabled:opacity-60">
          {submitting ? "جارِ إرسال الطلب…" : "تأكيد الطلب"}
        </button>
      </form>
    </main>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-bold">
        {label} {required && <span className="text-[color:var(--tomato)]">*</span>}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

