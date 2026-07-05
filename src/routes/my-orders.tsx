import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getOrderByToken } from "@/lib/orders.functions";
import { loadMyOrders, removeMyOrder, type SavedOrder } from "@/lib/my-orders";
import { formatPrice } from "@/lib/menu";
import { CheckCheck, ChefHat, Bike, Clock, XCircle, Trash2 } from "lucide-react";

export const Route = createFileRoute("/my-orders")({
  head: () => ({
    meta: [
      { title: "طلباتي — مطعم بيتزا نورس" },
      { name: "description", content: "تابع كل طلباتك من هذا الجهاز." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MyOrdersPage,
});

type Row = {
  saved: SavedOrder;
  data: Awaited<ReturnType<typeof getOrderByToken>> | null;
  loading: boolean;
};

const STATUS_META: Record<
  string,
  { label: string; Icon: typeof Clock; color: string }
> = {
  new: { label: "استلمنا طلبك", Icon: Clock, color: "text-[color:var(--ink-muted)]" },
  preparing: { label: "في الفرن", Icon: ChefHat, color: "text-[color:var(--tomato)]" },
  out: { label: "في الطريق إليك", Icon: Bike, color: "text-[color:var(--tomato)]" },
  done: { label: "تم التسليم", Icon: CheckCheck, color: "text-green-700" },
  cancelled: { label: "ملغى", Icon: XCircle, color: "text-red-600" },
};

function MyOrdersPage() {
  const fetchOrder = useServerFn(getOrderByToken);
  const [rows, setRows] = useState<Row[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = loadMyOrders();
    setRows(saved.map((s) => ({ saved: s, data: null, loading: true })));
    setReady(true);

    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        saved.map(async (s) => {
          try {
            const data = await fetchOrder({ data: { token: s.token } });
            return { saved: s, data, loading: false } satisfies Row;
          } catch {
            return { saved: s, data: null, loading: false } satisfies Row;
          }
        }),
      );
      if (!cancelled) setRows(results);
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchOrder]);

  const forget = (token: string) => {
    removeMyOrder(token);
    setRows((cur) => cur.filter((r) => r.saved.token !== token));
  };

  return (
    <div className="min-h-screen bg-[color:var(--cream)] text-[color:var(--ink)]">
      <header className="border-b border-[color:var(--line)] bg-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] tracking-widest text-[color:var(--ink-muted)]">
              طلباتي
            </div>
            <h1 className="font-serif text-2xl">سجل طلباتك</h1>
          </div>
          <Link
            to="/"
            className="text-sm text-[color:var(--ink-muted)] hover:text-[color:var(--tomato)]"
          >
            → القائمة
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {!ready ? (
          <div className="text-center text-[color:var(--ink-muted)]">جارِ التحميل…</div>
        ) : rows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[color:var(--line)] p-8 text-center">
            <div className="text-5xl mb-3">🍕</div>
            <h2 className="font-serif text-2xl">لا توجد طلبات بعد</h2>
            <p className="text-sm text-[color:var(--ink-muted)] mt-2">
              عند إرسال أول طلب سيظهر هنا تلقائياً.
            </p>
            <Link
              to="/"
              className="mt-6 inline-flex px-5 py-3 rounded-full bg-[color:var(--tomato)] text-white font-bold hover:bg-[color:var(--tomato-dark)]"
            >
              اطلب الآن
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => {
              const s = row.saved;
              const d = row.data;
              const meta = d ? STATUS_META[d.status] ?? STATUS_META.new : null;
              const Icon = meta?.Icon ?? Clock;
              return (
                <li
                  key={s.token}
                  className="bg-white rounded-2xl border border-[color:var(--line)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      to="/track/$token"
                      params={{ token: s.token }}
                      className="flex-1 flex items-center gap-3 min-w-0"
                    >
                      <div
                        className={
                          "w-11 h-11 rounded-full grid place-items-center shrink-0 bg-[color:var(--cream)] " +
                          (meta?.color ?? "text-[color:var(--ink-muted)]")
                        }
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold truncate">
                          {row.loading
                            ? "جارِ التحديث…"
                            : d
                              ? meta?.label
                              : "لم نعد نجد هذا الطلب"}
                        </div>
                        <div className="text-xs text-[color:var(--ink-muted)] mt-0.5">
                          #{s.id.slice(0, 6)} ·{" "}
                          {new Date(s.createdAt).toLocaleString("ar", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                          {d ? ` · ${formatPrice(Number(d.total))}` : ""}
                        </div>
                      </div>
                    </Link>
                    <button
                      type="button"
                      onClick={() => forget(s.token)}
                      aria-label="حذف من القائمة"
                      className="p-2 rounded-full text-[color:var(--ink-muted)] hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
