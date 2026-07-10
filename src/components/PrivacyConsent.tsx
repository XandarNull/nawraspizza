import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldCheck, Bell, Cookie } from "lucide-react";
import { pushSupported, subscribeToPush } from "@/lib/push-client";

const CONSENT_KEY = "nawras_privacy_consent_v1";

export function hasPrivacyConsent(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(CONSENT_KEY) === "accepted";
  } catch {
    return true;
  }
}

export default function PrivacyConsent() {
  const [open, setOpen] = useState(false);
  const [enablePush, setEnablePush] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!hasPrivacyConsent()) setOpen(true);
  }, []);

  if (!open) return null;

  const accept = async () => {
    setBusy(true);
    try {
      localStorage.setItem(CONSENT_KEY, "accepted");
      localStorage.setItem(CONSENT_KEY + "_at", new Date().toISOString());
    } catch {
      /* ignore */
    }
    if (enablePush && pushSupported()) {
      // Fire and forget — permission prompt handles UX.
      subscribeToPush().catch(() => {});
    }
    setBusy(false);
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-title"
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
    >
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-6 sm:p-7">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[color:var(--tomato)]/10 grid place-items-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-[color:var(--tomato)]" />
            </div>
            <div>
              <h2 id="privacy-title" className="font-serif text-2xl text-[color:var(--ink)]">
                خصوصيتك تهمّنا
              </h2>
              <p className="text-sm text-[color:var(--ink-muted)] mt-1">
                قبل أن تبدأ، اطّلع على كيفية استخدامنا لبياناتك.
              </p>
            </div>
          </div>

          <ul className="mt-5 space-y-3 text-sm text-[color:var(--ink)]">
            <li className="flex items-start gap-2">
              <span className="text-[color:var(--tomato)] font-bold">•</span>
              <span>
                نستخدم بياناتك (الاسم، الهاتف، العنوان، الموقع الاختياري) <strong>فقط
                لتنفيذ طلبك وتوصيله</strong>.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Cookie className="w-4 h-4 mt-0.5 text-[color:var(--tomato)] shrink-0" />
              <span>
                نستخدم تخزيناً محلياً ضرورياً فقط (لعناوينك وتتبّع طلبك). لا كوكيز إعلانات
                ولا تتبّع من طرف ثالث.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Bell className="w-4 h-4 mt-0.5 text-[color:var(--tomato)] shrink-0" />
              <span>
                يمكنك تفعيل الإشعارات لمتابعة حالة طلبك والعروض. اختياري تماماً — يمكنك
                إيقافها لاحقاً من إعدادات جهازك.
              </span>
            </li>
          </ul>

          <label className="mt-5 flex items-center gap-3 p-3 rounded-2xl border border-[color:var(--line)] cursor-pointer hover:bg-[color:var(--cream)]">
            <input
              type="checkbox"
              checked={enablePush}
              onChange={(e) => setEnablePush(e.target.checked)}
              className="w-5 h-5 accent-[color:var(--tomato)]"
            />
            <div className="flex-1">
              <div className="font-bold text-sm">تفعيل الإشعارات</div>
              <div className="text-xs text-[color:var(--ink-muted)]">
                لتصلك تحديثات الطلب والعروض الجديدة
              </div>
            </div>
          </label>

          <p className="text-xs text-[color:var(--ink-muted)] mt-4 leading-relaxed">
            بالمتابعة أنت توافق على{" "}
            <Link
              to="/privacy"
              className="text-[color:var(--tomato)] font-bold underline"
            >
              سياسة الخصوصية
            </Link>
            .
          </p>

          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={accept}
              disabled={busy}
              className="w-full px-5 py-3.5 rounded-full bg-[color:var(--tomato)] text-white text-base font-bold shadow-lg hover:bg-[color:var(--tomato-dark)] disabled:opacity-60 transition-all"
            >
              أوافق ومتابعة
            </button>
            <Link
              to="/privacy"
              className="w-full text-center px-5 py-2.5 rounded-full text-sm text-[color:var(--ink-muted)] hover:text-[color:var(--tomato)]"
            >
              قراءة سياسة الخصوصية كاملة
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
