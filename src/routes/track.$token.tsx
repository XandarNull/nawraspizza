import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { getOrderByToken } from "@/lib/orders.functions";
import { formatPrice } from "@/lib/menu";
import { saveMyOrder } from "@/lib/my-orders";
import { CheckCheck, ChefHat, Bike, Clock, XCircle, ClipboardList } from "lucide-react";


export const Route = createFileRoute("/track/$token")({
  head: () => ({
    meta: [
      { title: "متابعة الطلب — مطعم بيتزا نورس" },
      { name: "description", content: "تابع حالة طلبك مباشرة." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TrackPage,
});

type TrackedOrder = Awaited<ReturnType<typeof getOrderByToken>>;

const STEPS = [
  { key: "new", label: "استلمنا طلبك", icon: Clock },
  { key: "preparing", label: "في الفرن", icon: ChefHat },
  { key: "out", label: "في الطريق إليك", icon: Bike },
  { key: "done", label: "تم التسليم", icon: CheckCheck },
] as const;

function TrackPage() {
  const { token } = Route.useParams();
  const fetchOrder = useServerFn(getOrderByToken);
  const [order, setOrder] = useState<TrackedOrder | null | undefined>(undefined);
  const [notFound, setNotFound] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const r = await fetchOrder({ data: { token } });
      if (!r) {
        setNotFound(true);
        setOrder(null);
      } else {
        setOrder(r);
        setNotFound(false);
        saveMyOrder({ id: r.id, token: r.tracking_token });
      }
    } catch {
      setNotFound(true);
    }
  }, [fetchOrder, token]);


  const status = order?.status;
  const isTerminal = status === "done" || status === "cancelled";

  useEffect(() => {
    refresh();
    // Once the order reaches a final state, stop polling — the status
    // won't change anymore, so further requests are pure waste.
    if (isTerminal) return;
    const tick = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      refresh();
    };
    const id = setInterval(tick, 8000);
    const onVisible = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh, isTerminal]);

  if (order === undefined) {
    return (
      <div className="min-h-screen bg-[color:var(--cream)] grid place-items-center text-[color:var(--ink-muted)]">
        جارِ التحميل…
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="min-h-screen bg-[color:var(--cream)] grid place-items-center px-4 text-center">
        <div>
          <div className="text-5xl mb-3">🕵️</div>
          <h1 className="font-serif text-2xl">لم نجد هذا الطلب</h1>
          <p className="text-sm text-[color:var(--ink-muted)] mt-2">
            الرابط قد يكون غير صحيح أو انتهت صلاحيته.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex px-5 py-3 rounded-full bg-[color:var(--tomato)] text-white font-bold hover:bg-[color:var(--tomato-dark)]"
          >
            الرجوع إلى القائمة
          </Link>
        </div>
      </div>
    );
  }

  const cancelled = order.status === "cancelled";
  const currentIdx = STEPS.findIndex((s) => s.key === order.status);
  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <div className="min-h-screen bg-[color:var(--cream)] text-[color:var(--ink)]">
      <header className="border-b border-[color:var(--line)] bg-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] tracking-widest text-[color:var(--ink-muted)]">
              متابعة الطلب
            </div>
            <h1 className="font-serif text-2xl">مرحباً {order.customer_name}</h1>
          </div>
          <div className="text-xs tracking-widest text-[color:var(--ink-muted)]">
            #{order.id.slice(0, 6)}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {cancelled ? (
          <div className="bg-white rounded-2xl border border-[color:var(--line)] p-6 text-center">
            <XCircle className="w-10 h-10 text-[color:var(--tomato)] mx-auto" />
            <h2 className="font-serif text-2xl mt-3">تم إلغاء هذا الطلب</h2>
            <p className="text-sm text-[color:var(--ink-muted)] mt-2">
              للاستفسار يرجى التواصل مع المطعم.
            </p>
          </div>
        ) : (
          <ol className="bg-white rounded-2xl border border-[color:var(--line)] p-5">
            {STEPS.map((s, i) => {
              const done = i <= currentIdx;
              const active = i === currentIdx;
              const Icon = s.icon;
              return (
                <li key={s.key} className="flex items-start gap-3 py-3">
                  <div
                    className={
                      "w-10 h-10 rounded-full grid place-items-center shrink-0 " +
                      (done
                        ? "bg-[color:var(--tomato)] text-white"
                        : "bg-[color:var(--cream)] text-[color:var(--ink-muted)]")
                    }
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 pt-1.5">
                    <div
                      className={
                        "font-bold " + (active ? "text-[color:var(--tomato)]" : "")
                      }
                    >
                      {s.label}
                      {active && (
                        <span className="mr-2 text-xs font-normal text-[color:var(--ink-muted)]">
                          — الحالة الحالية
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        <section className="bg-white rounded-2xl border border-[color:var(--line)] p-5 mt-4">
          <h3 className="font-serif text-xl mb-3">تفاصيل الطلب</h3>
          <div className="text-sm text-[color:var(--ink-muted)] mb-3">📍 {order.address}</div>
          <ul className="divide-y divide-[color:var(--line)] border-y border-[color:var(--line)]">
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
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs tracking-widest text-[color:var(--ink-muted)]">
              الإجمالي
            </span>
            <span className="font-serif text-2xl">{formatPrice(Number(order.total))}</span>
          </div>
        </section>

        <p className="text-center text-xs text-[color:var(--ink-muted)] mt-4">
          احفظ هذا الرابط لمتابعة طلبك — إنه خاص بك وحدك.
        </p>

        <div className="text-center mt-6">
          <Link
            to="/"
            className="text-sm text-[color:var(--ink-muted)] hover:text-[color:var(--tomato)]"
          >
            → طلب جديد
          </Link>
        </div>
      </main>
    </div>
  );
}
