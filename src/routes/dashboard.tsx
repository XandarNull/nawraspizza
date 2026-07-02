import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { MapPin, Phone, Clock, ChefHat, Bike, CheckCheck, X, ExternalLink } from "lucide-react";
import { formatPrice } from "@/lib/menu";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "لوحة المطبخ — مطعم بيتزا نورس" },
      { name: "description", content: "الطلبات الحيّة للمطبخ وموظفي التوصيل." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

type OrderItem = {
  kind: "pizza" | "drink";
  qty: number;
  label: string;
  unit_price: number;
};

type Order = {
  id: string;
  customer_name: string;
  phone: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  items: OrderItem[];
  total: number;
  status: string;
  notes: string | null;
  created_at: string;
};

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

function Dashboard() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [filter, setFilter] = useState<string>("active");

  useEffect(() => {
    let mounted = true;
    supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) toast.error(error.message);
        else setOrders((data ?? []) as Order[]);
      });

    const channel = supabase
      .channel("orders-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        setOrders((cur) => {
          const list = cur ?? [];
          if (payload.eventType === "INSERT") {
            toast.success(`طلب جديد من ${(payload.new as Order).customer_name}`);
            return [payload.new as Order, ...list];
          }
          if (payload.eventType === "UPDATE") {
            return list.map((o) => (o.id === (payload.new as Order).id ? (payload.new as Order) : o));
          }
          if (payload.eventType === "DELETE") {
            return list.filter((o) => o.id !== (payload.old as Order).id);
          }
          return list;
        });
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
  };

  const filtered =
    orders?.filter((o) => (filter === "active" ? o.status !== "done" && o.status !== "cancelled" : o.status === filter)) ?? [];

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
            <div className="text-[11px] tracking-widest text-[color:var(--ink-muted)]">المطبخ</div>
            <h1 className="font-serif text-2xl">الطلبات الحيّة</h1>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Stat label="جديد" value={counts.new} tone="tomato" />
            <Stat label="في الفرن" value={counts.preparing} />
            <Stat label="في الطريق" value={counts.out} />
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

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {orders === null && <p className="text-[color:var(--ink-muted)]">جارِ التحميل…</p>}
        {orders !== null && filtered.length === 0 && (
          <div className="text-center py-16 text-[color:var(--ink-muted)]">لا توجد طلبات هنا.</div>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((o) => (
            <OrderCard key={o.id} order={o} onStatus={setStatus} />
          ))}
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "tomato" }) {
  return (
    <div className="text-center">
      <div className={"font-serif text-2xl " + (tone === "tomato" ? "text-[color:var(--tomato)]" : "")}>{value}</div>
      <div className="text-[10px] tracking-widest text-[color:var(--ink-muted)]">{label}</div>
    </div>
  );
}

function OrderCard({ order, onStatus }: { order: Order; onStatus: (id: string, s: string) => void }) {
  const step = STATUS_FLOW.find((s) => s.key === order.status);
  const created = new Date(order.created_at);
  const mins = Math.max(0, Math.round((Date.now() - created.getTime()) / 60000));
  const items = Array.isArray(order.items) ? order.items : [];
  const mapUrl =
    order.latitude != null && order.longitude != null
      ? `https://www.google.com/maps?q=${order.latitude},${order.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}`;

  return (
    <article className="bg-white rounded-2xl border border-[color:var(--line)] overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs tracking-widest text-[color:var(--ink-muted)]">#{order.id.slice(0, 6)} · قبل {mins} دقيقة</div>
            <h3 className="font-serif text-xl mt-0.5">{order.customer_name}</h3>
          </div>
          <StatusPill status={order.status} />
        </div>

        <div className="mt-3 space-y-1.5 text-sm">
          <a href={`tel:${order.phone}`} className="flex items-center gap-2 hover:text-[color:var(--tomato)]" dir="ltr">
            <Phone className="w-4 h-4 text-[color:var(--ink-muted)]" /> {order.phone}
          </a>
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-[color:var(--ink-muted)] mt-0.5 shrink-0" />
            <div className="flex-1">
              <div>{order.address}</div>
              <a href={mapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-[color:var(--tomato)] hover:underline mt-0.5">
                فتح في الخرائط <ExternalLink className="w-3 h-3" />
                {order.latitude != null && order.longitude != null && (
                  <span className="text-[color:var(--ink-muted)] mx-1" dir="ltr">({order.latitude.toFixed(4)}, {order.longitude.toFixed(4)})</span>
                )}
              </a>
            </div>
          </div>
        </div>

        <ul className="mt-4 divide-y divide-[color:var(--line)] border-y border-[color:var(--line)]">
          {items.map((it, i) => (
            <li key={i} className="py-2 flex items-center justify-between text-sm">
              <span><span className="font-bold">{it.qty}×</span> {it.label}</span>
              <span className="text-[color:var(--ink-muted)]">{formatPrice(it.unit_price * it.qty)}</span>
            </li>
          ))}
        </ul>

        {order.notes && (
          <p className="mt-3 text-sm bg-[color:var(--cream)] rounded-lg px-3 py-2">
            <span className="font-bold">ملاحظة:</span> {order.notes}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between">
          <div className="font-serif text-2xl">{formatPrice(Number(order.total))}</div>
          <div className="flex gap-2">
            {order.status !== "cancelled" && order.status !== "done" && (
              <button
                onClick={() => onStatus(order.id, "cancelled")}
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
  return <span className={"text-[11px] tracking-widest px-2.5 py-1 rounded-full " + s.bg}>{s.label}</span>;
}
