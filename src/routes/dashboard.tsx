import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState, useCallback } from "react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  MapPin,
  Phone,
  Clock,
  ChefHat,
  Bike,
  CheckCheck,
  X,
  Check,
  ExternalLink,
  Share2,
  Lock,
} from "lucide-react";
import { PIZZAS, formatPrice } from "@/lib/menu";
import {
  dashboardLogin,
  dashboardLogout,
  dashboardSession,
  listOrders,
  updateOrderStatus,
  getRestaurantState,
  setRestaurantOpen,
  setUnavailablePizzas,
  deleteAllOrders,
  type OrderDTO,
} from "@/lib/orders.functions";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "لوحة المطبخ — مطعم بيتزا نورس" },
      { name: "description", content: "الطلبات الحيّة للمطبخ وموظفي التوصيل." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardGate,
});

type Order = OrderDTO;

const STATUS_FLOW: { key: string; label: string; icon: typeof ChefHat; next?: string }[] = [
  { key: "new", label: "جديد", icon: Clock, next: "preparing" },
  { key: "preparing", label: "في الفرن", icon: ChefHat, next: "out" },
  { key: "out", label: "في الطريق", icon: Bike, next: "done" },
  { key: "done", label: "تم التسليم", icon: CheckCheck },
];

const STATUS_LABEL: Record<string, string> = {
  new: "جديد",
  preparing: "في الفرن",
  out: "في الطريق",
  done: "تم التسليم",
  cancelled: "ملغى",
};

function DashboardGate() {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const session = useServerFn(dashboardSession);
  const login = useServerFn(dashboardLogin);
  const logout = useServerFn(dashboardLogout);

  useEffect(() => {
    let mounted = true;
    session()
      .then((r) => {
        if (!mounted) return;
        setAuthed(Boolean(r?.authed));
      })
      .catch(() => {})
      .finally(() => mounted && setChecking(false));
    return () => {
      mounted = false;
    };
  }, [session]);

  const onLogout = async () => {
    try {
      await logout();
    } catch {
      /* noop */
    }
    setAuthed(false);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-[color:var(--cream)] grid place-items-center text-[color:var(--ink-muted)]">
        جارِ التحقق…
      </div>
    );
  }

  if (authed) return <Dashboard onLogout={onLogout} />;

  return (
    <div className="min-h-screen bg-[color:var(--cream)] text-[color:var(--ink)] flex items-center justify-center px-4">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          setErr(false);
          try {
            const r = await login({ data: { password: pw } });
            if (r?.ok) setAuthed(true);
            else setErr(true);
          } catch {
            setErr(true);
          } finally {
            setSubmitting(false);
          }
        }}
        className="w-full max-w-sm bg-white rounded-2xl border border-[color:var(--line)] p-6 shadow-sm"
      >
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[color:var(--tomato)] text-white mx-auto mb-4">
          <Lock className="w-5 h-5" />
        </div>
        <h1 className="font-serif text-2xl text-center">لوحة المطبخ</h1>
        <p className="text-sm text-[color:var(--ink-muted)] text-center mt-1">
          أدخل كلمة المرور للمتابعة
        </p>
        <input
          type="password"
          value={pw}
          onChange={(e) => {
            setPw(e.target.value);
            setErr(false);
          }}
          placeholder="كلمة المرور"
          autoFocus
          className="mt-5 w-full px-4 py-3 rounded-full border border-[color:var(--line)] bg-[color:var(--cream)] focus:outline-none focus:border-[color:var(--tomato)]"
        />
        {err && (
          <p className="mt-2 text-sm text-[color:var(--tomato)] text-center">
            كلمة المرور غير صحيحة
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="mt-4 w-full px-4 py-3 rounded-full bg-[color:var(--tomato)] text-white font-bold hover:bg-[color:var(--tomato-dark)] transition-colors disabled:opacity-60"
        >
          {submitting ? "جارِ الدخول…" : "دخول"}
        </button>
        <p className="mt-3 text-[11px] text-center text-[color:var(--ink-muted)]">
          يبقى تسجيل الدخول ساري لمدة ٩٠ يوماً على هذا الجهاز.
        </p>
      </form>
    </div>
  );
}

// ---- Looping alarm: keeps ringing until every "new" order is handled ----
function useAlarmLoop(active: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stoppedRef = useRef(false);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (ctxRef.current) {
      ctxRef.current.close().catch(() => {});
      ctxRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!active) {
      stop();
      return;
    }
    stoppedRef.current = false;

    const playBurst = () => {
      if (stoppedRef.current) return;
      try {
        const AC: typeof AudioContext =
          (window as unknown as { AudioContext: typeof AudioContext; webkitAudioContext: typeof AudioContext })
            .AudioContext ||
          (window as unknown as { AudioContext: typeof AudioContext; webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        if (!AC) return;
        if (!ctxRef.current) ctxRef.current = new AC();
        const ctx = ctxRef.current!;
        const master = ctx.createGain();
        master.gain.value = 1.0;
        master.connect(ctx.destination);

        const beeps = 6;
        const beepDur = 0.35;
        const gap = 0.15;
        for (let i = 0; i < beeps; i++) {
          const start = ctx.currentTime + i * (beepDur + gap);
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "square";
          osc.frequency.setValueAtTime(i % 2 === 0 ? 1000 : 750, start);
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(0.9, start + 0.02);
          gain.gain.setValueAtTime(0.9, start + beepDur - 0.05);
          gain.gain.linearRampToValueAtTime(0, start + beepDur);
          osc.connect(gain).connect(master);
          osc.start(start);
          osc.stop(start + beepDur);
        }
      } catch {
        /* browser blocked audio */
      }
      // Loop every ~3.5s while active
      timerRef.current = setTimeout(playBurst, 3600);
    };

    playBurst();
    return () => stop();
  }, [active, stop]);
}

function Dashboard({ onLogout }: { onLogout: () => Promise<void> }) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [filter, setFilter] = useState<string>("active");
  const [confirmCancel, setConfirmCancel] = useState<Order | null>(null);
  const [shareFor, setShareFor] = useState<Order | null>(null);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDone = useRef(false);

  const load = useServerFn(listOrders);
  const setStatusFn = useServerFn(updateOrderStatus);

  const refresh = useCallback(async () => {
    try {
      const data = await load();
      const list = (data ?? []) as Order[];
      if (initialLoadDone.current) {
        for (const o of list) {
          if (!knownIdsRef.current.has(o.id)) {
            toast.success(`طلب جديد من ${o.customer_name}`);
          }
        }
      }
      knownIdsRef.current = new Set(list.map((o) => o.id));
      setOrders(list);
      initialLoadDone.current = true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.toLowerCase().includes("unauthorized")) {
        await onLogout();
        return;
      }
      // silent
    }
  }, [load, onLogout]);

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      refresh();
    };
    tick();
    const id = setInterval(tick, 5000);
    const onFocus = () => tick();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);


  const setStatus = async (id: string, status: string) => {
    // Optimistic update
    setOrders((cur) => (cur ? cur.map((o) => (o.id === id ? { ...o, status } : o)) : cur));
    try {
      await setStatusFn({ data: { id, status } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر تحديث الحالة");
      refresh();
    }
  };

  const hasNew = (orders ?? []).some((o) => o.status === "new");
  useAlarmLoop(hasNew);

  const filtered =
    orders?.filter((o) =>
      filter === "active" ? o.status !== "done" && o.status !== "cancelled" : o.status === filter,
    ) ?? [];

  const counts = {
    new: orders?.filter((o) => o.status === "new").length ?? 0,
    preparing: orders?.filter((o) => o.status === "preparing").length ?? 0,
    out: orders?.filter((o) => o.status === "out").length ?? 0,
  };

  return (
    <div className="min-h-screen bg-[color:var(--cream)] text-[color:var(--ink)]">
      <Toaster richColors position="top-right" />
      <header className="border-b border-[color:var(--line)] bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] tracking-widest text-[color:var(--ink-muted)]">
              المطبخ
            </div>
            <h1 className="font-serif text-2xl">الطلبات الحيّة</h1>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Stat label="جديد" value={counts.new} tone="tomato" />
            <Stat label="في الفرن" value={counts.preparing} />
            <Stat label="في الطريق" value={counts.out} />
            <button
              onClick={onLogout}
              className="text-xs text-[color:var(--ink-muted)] hover:text-[color:var(--tomato)] px-2 py-1 rounded-full border border-[color:var(--line)]"
            >
              خروج
            </button>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-3 flex gap-1 overflow-x-auto">
          {[
            { k: "active", l: "النشطة" },
            { k: "new", l: "جديد" },
            { k: "preparing", l: "في الفرن" },
            { k: "out", l: "في الطريق" },
            { k: "done", l: "تم التسليم" },
            { k: "cancelled", l: "ملغى" },
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => setFilter(t.k)}
              className={
                "px-3 py-1.5 rounded-full text-sm whitespace-nowrap " +
                (filter === t.k
                  ? "bg-[color:var(--ink)] text-[color:var(--cream)]"
                  : "text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]")
              }
            >
              {t.l}
            </button>
          ))}
        </div>
      </header>

      {hasNew && (
        <div className="bg-[color:var(--tomato)] text-white text-center text-sm py-2 animate-pulse">
          🔔 هناك طلب جديد بانتظار القبول أو الرفض — سيستمر التنبيه حتى الرد.
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <RestaurantControls />
        {orders === null && <p className="text-[color:var(--ink-muted)]">جارِ التحميل…</p>}
        {orders !== null && filtered.length === 0 && (
          <div className="text-center py-16 text-[color:var(--ink-muted)]">
            لا توجد طلبات هنا.
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              onStatus={setStatus}
              onAskCancel={() => setConfirmCancel(o)}
              onShare={() => setShareFor(o)}
            />
          ))}
        </div>
      </main>

      {confirmCancel && (
        <Modal onClose={() => setConfirmCancel(null)}>
          <h3 className="font-serif text-xl">تأكيد رفض/إلغاء الطلب</h3>
          <p className="text-sm text-[color:var(--ink-muted)] mt-2">
            هل أنت متأكد من إلغاء طلب{" "}
            <span className="font-bold text-[color:var(--ink)]">
              {confirmCancel.customer_name}
            </span>
            ؟ لا يمكن التراجع عن هذا الإجراء.
          </p>
          <div className="flex gap-2 mt-5 justify-end">
            <button
              onClick={() => setConfirmCancel(null)}
              className="px-4 py-2 rounded-full text-sm text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]"
            >
              تراجع
            </button>
            <button
              onClick={() => {
                setStatus(confirmCancel.id, "cancelled");
                setConfirmCancel(null);
              }}
              className="px-4 py-2 rounded-full bg-[color:var(--tomato)] text-white text-sm font-bold hover:bg-[color:var(--tomato-dark)]"
            >
              نعم، ألغِ الطلب
            </button>
          </div>
        </Modal>
      )}

      {shareFor && <ShareModal order={shareFor} onClose={() => setShareFor(null)} />}
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl border border-[color:var(--line)] w-full max-w-md p-6"
      >
        {children}
      </div>
    </div>
  );
}

function buildShareText(order: Order): string {
  const items = Array.isArray(order.items) ? order.items : [];
  const lines = [
    `🍕 طلب #${order.id.slice(0, 6)}`,
    `👤 ${order.customer_name}`,
    `📞 ${order.phone}`,
    `📍 ${order.address}`,
  ];
  if (order.latitude != null && order.longitude != null) {
    lines.push(`🗺️ https://www.google.com/maps?q=${order.latitude},${order.longitude}`);
  }
  lines.push("", "الطلب:");
  for (const it of items) {
    lines.push(`• ${it.qty}× ${it.label} — ${formatPrice(it.unit_price * it.qty)}`);
  }
  if (order.notes) lines.push("", `📝 ملاحظة: ${order.notes}`);
  lines.push("", `💰 المجموع: ${formatPrice(Number(order.total))}`);
  return lines.join("\n");
}

function ShareModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const text = buildShareText(order);
  const encoded = encodeURIComponent(text);
  const canNative =
    typeof navigator !== "undefined" &&
    !!(navigator as unknown as { share?: (d: { title?: string; text?: string }) => Promise<void> })
      .share;

  const options: { label: string; href?: string; onClick?: () => void; emoji: string }[] = [
    { label: "واتساب", href: `https://wa.me/?text=${encoded}`, emoji: "🟢" },
    {
      label: "تيليغرام",
      href: `https://t.me/share/url?url=${encodeURIComponent(" ")}&text=${encoded}`,
      emoji: "✈️",
    },
    { label: "رسالة SMS", href: `sms:?body=${encoded}`, emoji: "💬" },
    {
      label: "البريد الإلكتروني",
      href: `mailto:?subject=${encodeURIComponent("طلب جديد")}&body=${encoded}`,
      emoji: "✉️",
    },
  ];
  if (canNative) {
    options.unshift({
      label: "مشاركة عبر الجهاز",
      emoji: "📱",
      onClick: async () => {
        try {
          await (
            navigator as unknown as {
              share: (d: { title?: string; text?: string }) => Promise<void>;
            }
          ).share({ title: "طلب جديد", text });
          onClose();
        } catch {
          /* user cancelled */
        }
      },
    });
  }

  return (
    <Modal onClose={onClose}>
      <h3 className="font-serif text-xl">مشاركة الطلب</h3>
      <p className="text-sm text-[color:var(--ink-muted)] mt-1">
        اختر التطبيق لإرسال معلومات العميل
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {options.map((opt) =>
          opt.href ? (
            <a
              key={opt.label}
              href={opt.href}
              target="_blank"
              rel="noreferrer"
              onClick={onClose}
              className="flex items-center gap-2 px-3 py-3 rounded-xl border border-[color:var(--line)] hover:border-[color:var(--tomato)] hover:bg-[color:var(--cream)] text-sm"
            >
              <span className="text-lg">{opt.emoji}</span>
              <span className="font-bold">{opt.label}</span>
            </a>
          ) : (
            <button
              key={opt.label}
              onClick={opt.onClick}
              className="flex items-center gap-2 px-3 py-3 rounded-xl border border-[color:var(--line)] hover:border-[color:var(--tomato)] hover:bg-[color:var(--cream)] text-sm text-right"
            >
              <span className="text-lg">{opt.emoji}</span>
              <span className="font-bold">{opt.label}</span>
            </button>
          ),
        )}
      </div>
      <button
        onClick={() => {
          navigator.clipboard?.writeText(text);
          toast.success("تم نسخ معلومات الطلب");
        }}
        className="mt-3 w-full px-4 py-2 rounded-full border border-[color:var(--line)] text-sm hover:border-[color:var(--tomato)]"
      >
        نسخ النص
      </button>
      <div className="mt-4 text-xs text-[color:var(--ink-muted)] bg-[color:var(--cream)] rounded-lg p-3 whitespace-pre-wrap max-h-40 overflow-auto">
        {text}
      </div>
    </Modal>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "tomato" }) {
  return (
    <div className="text-center">
      <div
        className={
          "font-serif text-2xl " + (tone === "tomato" ? "text-[color:var(--tomato)]" : "")
        }
      >
        {value}
      </div>
      <div className="text-[10px] tracking-widest text-[color:var(--ink-muted)]">{label}</div>
    </div>
  );
}

function OrderCard({
  order,
  onStatus,
  onAskCancel,
  onShare,
}: {
  order: Order;
  onStatus: (id: string, s: string) => void;
  onAskCancel: () => void;
  onShare: () => void;
}) {
  const step = STATUS_FLOW.find((s) => s.key === order.status);
  const created = new Date(order.created_at);
  const mins = Math.max(0, Math.round((Date.now() - created.getTime()) / 60000));
  const items = Array.isArray(order.items) ? order.items : [];
  const mapUrl =
    order.latitude != null && order.longitude != null
      ? `https://www.google.com/maps?q=${order.latitude},${order.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}`;
  const isNew = order.status === "new";

  return (
    <article
      className={
        "bg-white rounded-2xl border overflow-hidden " +
        (isNew
          ? "border-[color:var(--tomato)] ring-2 ring-[color:var(--tomato)]/30 animate-pulse-once"
          : "border-[color:var(--line)]")
      }
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs tracking-widest text-[color:var(--ink-muted)]">
              #{order.id.slice(0, 6)} · قبل {mins} دقيقة
            </div>
            <h3 className="font-serif text-xl mt-0.5">{order.customer_name}</h3>
          </div>
          <StatusPill status={order.status} />
        </div>

        <div className="mt-3 space-y-1.5 text-sm">
          <a
            href={`tel:${order.phone}`}
            className="flex items-center gap-2 hover:text-[color:var(--tomato)]"
            dir="ltr"
          >
            <Phone className="w-4 h-4 text-[color:var(--ink-muted)]" /> {order.phone}
          </a>
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-[color:var(--ink-muted)] mt-0.5 shrink-0" />
            <div className="flex-1">
              <div>{order.address}</div>
              <a
                href={mapUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-[color:var(--tomato)] hover:underline mt-0.5"
              >
                فتح في الخرائط <ExternalLink className="w-3 h-3" />
                {order.latitude != null && order.longitude != null && (
                  <span className="text-[color:var(--ink-muted)] mx-1" dir="ltr">
                    ({order.latitude.toFixed(4)}, {order.longitude.toFixed(4)})
                  </span>
                )}
              </a>
            </div>
          </div>
        </div>

        <ul className="mt-4 divide-y divide-[color:var(--line)] border-y border-[color:var(--line)]">
          {items.map((it, i) => (
            <li key={i} className="py-2 flex items-center justify-between text-sm">
              <span>
                <span className="font-bold">{it.qty}×</span> {it.label}
              </span>
              <span className="text-[color:var(--ink-muted)]">
                {formatPrice(it.unit_price * it.qty)}
              </span>
            </li>
          ))}
        </ul>

        {order.notes && (
          <p className="mt-3 text-sm bg-[color:var(--cream)] rounded-lg px-3 py-2">
            <span className="font-bold">ملاحظة:</span> {order.notes}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between gap-2 flex-wrap">
          <div className="font-serif text-2xl">{formatPrice(Number(order.total))}</div>
          <div className="flex gap-2 items-center flex-wrap justify-end">
            <button
              onClick={onShare}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-full text-sm border border-[color:var(--line)] hover:border-[color:var(--tomato)] hover:text-[color:var(--tomato)]"
              aria-label="مشاركة الطلب"
            >
              <Share2 className="w-4 h-4" /> مشاركة
            </button>

            {isNew ? (
              <>
                <button
                  onClick={onAskCancel}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[color:var(--tomato)] text-[color:var(--tomato)] text-sm font-bold hover:bg-[color:var(--tomato)] hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" /> رفض
                </button>
                <button
                  onClick={() => onStatus(order.id, "preparing")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors"
                >
                  <Check className="w-4 h-4" /> قبول الطلب
                </button>
              </>
            ) : (
              <>
                {order.status !== "cancelled" && order.status !== "done" && (
                  <button
                    onClick={onAskCancel}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-full text-sm text-[color:var(--ink-muted)] hover:text-[color:var(--tomato)]"
                    aria-label="إلغاء الطلب"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {step?.next && (
                  <button
                    onClick={() => onStatus(order.id, step.next!)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[color:var(--tomato)] text-white text-sm font-bold hover:bg-[color:var(--tomato-dark)] transition-colors"
                  >
                    نقل إلى: {STATUS_LABEL[step.next] ?? step.next}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; label: string }> = {
    new: { bg: "bg-[color:var(--tomato)] text-white", label: "جديد" },
    preparing: { bg: "bg-amber-500 text-white", label: "في الفرن" },
    out: { bg: "bg-sky-600 text-white", label: "في الطريق" },
    done: { bg: "bg-emerald-600 text-white", label: "تم التسليم" },
    cancelled: { bg: "bg-neutral-400 text-white", label: "ملغى" },
  };
  const s = map[status] ?? { bg: "bg-neutral-300 text-neutral-700", label: status };
  return (
    <span className={"text-[11px] tracking-widest px-2.5 py-1 rounded-full " + s.bg}>
      {s.label}
    </span>
  );
}

function RestaurantControls() {
  const getState = useServerFn(getRestaurantState);
  const setOpen = useServerFn(setRestaurantOpen);
  const setUnavailable = useServerFn(setUnavailablePizzas);
  const deleteAll = useServerFn(deleteAllOrders);

  const [isOpen, setIsOpen] = useState<boolean | null>(null);
  const [unavailable, setUnavailableIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showPizzas, setShowPizzas] = useState(false);

  useEffect(() => {
    getState()
      .then((s) => {
        setIsOpen(s.is_open);
        setUnavailableIds(s.unavailable_pizzas ?? []);
      })
      .catch(() => {});
  }, [getState]);

  const toggleOpen = async () => {
    if (isOpen === null) return;
    const next = !isOpen;
    setIsOpen(next);
    setSaving(true);
    try {
      await setOpen({ data: { is_open: next } });
      toast.success(next ? "تم فتح المطعم" : "تم إغلاق المطعم");
    } catch (e) {
      setIsOpen(!next);
      toast.error(e instanceof Error ? e.message : "فشل التحديث");
    } finally {
      setSaving(false);
    }
  };

  const togglePizza = async (id: string) => {
    const next = unavailable.includes(id)
      ? unavailable.filter((x) => x !== id)
      : [...unavailable, id];
    setUnavailableIds(next);
    try {
      await setUnavailable({ data: { ids: next } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل التحديث");
    }
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      await deleteAll();
      toast.success("تم حذف كل الطلبات");
      setConfirmDelete(false);
      window.location.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الحذف");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="mb-6 bg-white border border-[color:var(--line)] rounded-2xl p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <div
            className={
              "w-3 h-3 rounded-full " +
              (isOpen ? "bg-emerald-500" : isOpen === false ? "bg-[color:var(--tomato)]" : "bg-neutral-300")
            }
          />
          <div>
            <div className="font-serif text-lg">
              حالة المطعم: {isOpen === null ? "…" : isOpen ? "مفتوح" : "مغلق"}
            </div>
            <div className="text-xs text-[color:var(--ink-muted)]">
              عند الإغلاق تُعطَّل الطلبات من الموقع.
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={toggleOpen}
            disabled={saving || isOpen === null}
            className={
              "px-4 py-2 rounded-full text-sm font-bold transition-colors disabled:opacity-60 " +
              (isOpen
                ? "bg-[color:var(--tomato)] text-white hover:bg-[color:var(--tomato-dark)]"
                : "bg-emerald-600 text-white hover:bg-emerald-700")
            }
          >
            {isOpen ? "إغلاق المطعم" : "فتح المطعم"}
          </button>
          <button
            onClick={() => setShowPizzas((v) => !v)}
            className="px-4 py-2 rounded-full text-sm font-bold border border-[color:var(--line)] hover:border-[color:var(--tomato)]"
          >
            {showPizzas ? "إخفاء" : "تحديد"} الأصناف غير المتوفرة ({unavailable.length})
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="px-4 py-2 rounded-full text-sm font-bold border border-[color:var(--tomato)] text-[color:var(--tomato)] hover:bg-[color:var(--tomato)] hover:text-white"
          >
            حذف كل الطلبات (بداية يوم جديد)
          </button>
        </div>
      </div>

      {showPizzas && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {PIZZAS.map((p) => {
            const off = unavailable.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() => togglePizza(p.id)}
                className={
                  "px-3 py-2 rounded-xl text-sm border text-right transition-colors " +
                  (off
                    ? "bg-[color:var(--tomato)] text-white border-[color:var(--tomato)]"
                    : "bg-white border-[color:var(--line)] hover:border-[color:var(--tomato)]")
                }
              >
                {off ? "🚫 " : "✓ "} {p.name}
              </button>
            );
          })}
        </div>
      )}

      {confirmDelete && (
        <Modal onClose={() => !deleting && setConfirmDelete(false)}>
          <h3 className="font-serif text-xl">تأكيد حذف كل الطلبات</h3>
          <p className="text-sm text-[color:var(--ink-muted)] mt-2">
            سيتم حذف جميع الطلبات (الجديدة، الجارية، والمكتملة) بشكل نهائي.
            لا يمكن التراجع عن هذا الإجراء.
          </p>
          <div className="flex gap-2 mt-5 justify-end">
            <button
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
              className="px-4 py-2 rounded-full text-sm text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]"
            >
              تراجع
            </button>
            <button
              onClick={doDelete}
              disabled={deleting}
              className="px-4 py-2 rounded-full bg-[color:var(--tomato)] text-white text-sm font-bold hover:bg-[color:var(--tomato-dark)] disabled:opacity-60"
            >
              {deleting ? "جارِ الحذف…" : "نعم، احذف الكل"}
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
