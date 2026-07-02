import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { MapPin, Phone, Clock, ChefHat, Bike, CheckCheck, X, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Kitchen dashboard — Forno & Fuoco" },
      { name: "description", content: "Live incoming orders for the kitchen and delivery staff." },
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
  { key: "new", label: "New", icon: Clock, next: "preparing" },
  { key: "preparing", label: "In oven", icon: ChefHat, next: "out" },
  { key: "out", label: "Out for delivery", icon: Bike, next: "done" },
  { key: "done", label: "Delivered", icon: CheckCheck },
];

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
            toast.success(`New order from ${(payload.new as Order).customer_name}`);
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
            <div className="text-[11px] uppercase tracking-widest text-[color:var(--ink-muted)]">Kitchen</div>
            <h1 className="font-serif text-2xl">Live orders</h1>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Stat label="New" value={counts.new} tone="tomato" />
            <Stat label="In oven" value={counts.preparing} />
            <Stat label="Out" value={counts.out} />
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-3 flex gap-1 overflow-x-auto">
          {[
            { k: "active", l: "Active" },
            { k: "new", l: "New" },
            { k: "preparing", l: "In oven" },
            { k: "out", l: "Out" },
            { k: "done", l: "Delivered" },
            { k: "cancelled", l: "Cancelled" },
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
        {orders === null && <p className="text-[color:var(--ink-muted)]">Loading…</p>}
        {orders !== null && filtered.length === 0 && (
          <div className="text-center py-16 text-[color:var(--ink-muted)]">No orders here.</div>
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
      <div className="text-[10px] uppercase tracking-widest text-[color:var(--ink-muted)]">{label}</div>
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
            <div className="text-xs uppercase tracking-widest text-[color:var(--ink-muted)]">#{order.id.slice(0, 6)} · {mins}m ago</div>
            <h3 className="font-serif text-xl mt-0.5">{order.customer_name}</h3>
          </div>
          <StatusPill status={order.status} />
        </div>

        <div className="mt-3 space-y-1.5 text-sm">
          <a href={`tel:${order.phone}`} className="flex items-center gap-2 hover:text-[color:var(--tomato)]">
            <Phone className="w-4 h-4 text-[color:var(--ink-muted)]" /> {order.phone}
          </a>
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-[color:var(--ink-muted)] mt-0.5 shrink-0" />
            <div className="flex-1">
              <div>{order.address}</div>
              <a href={mapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-[color:var(--tomato)] hover:underline mt-0.5">
                Open in Maps <ExternalLink className="w-3 h-3" />
                {order.latitude != null && order.longitude != null && (
                  <span className="text-[color:var(--ink-muted)] ml-1">({order.latitude.toFixed(4)}, {order.longitude.toFixed(4)})</span>
                )}
              </a>
            </div>
          </div>
        </div>

        <ul className="mt-4 divide-y divide-[color:var(--line)] border-y border-[color:var(--line)]">
          {items.map((it, i) => (
            <li key={i} className="py-2 flex items-center justify-between text-sm">
              <span><span className="font-semibold">{it.qty}×</span> {it.label}</span>
              <span className="text-[color:var(--ink-muted)]">${(it.unit_price * it.qty).toFixed(2)}</span>
            </li>
          ))}
        </ul>

        {order.notes && (
          <p className="mt-3 text-sm bg-[color:var(--cream)] rounded-lg px-3 py-2">
            <span className="font-semibold">Note:</span> {order.notes}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between">
          <div className="font-serif text-2xl">${Number(order.total).toFixed(2)}</div>
          <div className="flex gap-2">
            {order.status !== "cancelled" && order.status !== "done" && (
              <button
                onClick={() => onStatus(order.id, "cancelled")}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-full text-sm text-[color:var(--ink-muted)] hover:text-[color:var(--tomato)]"
                aria-label="Cancel order"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            {step?.next && (
              <button
                onClick={() => onStatus(order.id, step.next!)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[color:var(--tomato)] text-white text-sm font-semibold hover:bg-[color:var(--tomato-dark)] transition-colors"
              >
                Mark {STATUS_FLOW.find((s) => s.key === step.next)?.label}
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
    new: { bg: "bg-[color:var(--tomato)] text-white", label: "New" },
    preparing: { bg: "bg-amber-500 text-white", label: "In oven" },
    out: { bg: "bg-sky-600 text-white", label: "Out" },
    done: { bg: "bg-emerald-600 text-white", label: "Delivered" },
    cancelled: { bg: "bg-neutral-400 text-white", label: "Cancelled" },
  };
  const s = map[status] ?? { bg: "bg-neutral-300 text-neutral-700", label: status };
  return <span className={"text-[11px] uppercase tracking-widest px-2.5 py-1 rounded-full " + s.bg}>{s.label}</span>;
}
