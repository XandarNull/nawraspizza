import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  detectPlatform,
  isStandaloneDisplay,
  subscribeInstallPrompt,
  triggerInstallPrompt,
  type Platform,
} from "@/lib/pwa-register";
import { Download, Check, Share, PlusSquare, MoreVertical } from "lucide-react";

export const Route = createFileRoute("/install")({
  head: () => ({
    meta: [
      { title: "تثبيت تطبيق نورس بيتزا" },
      {
        name: "description",
        content: "ثبّت تطبيق نورس بيتزا على جهازك للطلب بضغطة واحدة.",
      },
      { property: "og:title", content: "ثبّت تطبيق نورس بيتزا" },
      {
        property: "og:description",
        content: "تطبيق مطعم نورس بيتزا — تثبيت سريع على أندرويد وآيفون.",
      },
      { property: "og:url", content: "https://nawraspizza.lovable.app/install" },
    ],
    links: [{ rel: "canonical", href: "https://nawraspizza.lovable.app/install" }],
  }),
  component: InstallPage,
});

function InstallPage() {
  const [promptReady, setPromptReady] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<Platform>("unknown");

  useEffect(() => {
    setPlatform(detectPlatform());
    setInstalled(isStandaloneDisplay());
    const unsub = subscribeInstallPrompt(setPromptReady);
    return unsub;
  }, []);

  const install = async () => {
    const outcome = await triggerInstallPrompt();
    if (outcome === "accepted") {
      setInstalled(true);
      toast.success("تم تثبيت التطبيق بنجاح!");
    } else if (outcome === "dismissed") {
      toast("تم إلغاء التثبيت");
    } else if (outcome === "unavailable") {
      if (platform === "ios") {
        toast(
          "على آيفون، اضغط زر المشاركة ثم «إضافة إلى الشاشة الرئيسية»",
          { duration: 6000 },
        );
      } else {
        toast(
          "افتح قائمة المتصفح واختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية»",
          { duration: 6000 },
        );
      }
    }
  };

  return (
    <div className="min-h-screen bg-[color:var(--cream)] text-[color:var(--ink)]">
      <Toaster />
      <main className="max-w-md mx-auto px-4 sm:px-6 py-10">
        <div className="text-center">
          <img
            src="/nawras-icon-512.png"
            alt="شعار نورس بيتزا"
            width={128}
            height={128}
            className="w-32 h-32 rounded-3xl mx-auto shadow-xl ring-4 ring-white"
          />
          <h1 className="font-serif text-4xl mt-6">Nawras Pizza</h1>
          <p className="text-[color:var(--ink-muted)] mt-2">
            ثبّت التطبيق على جهازك واطلب بيتزا نورس بضغطة واحدة — بدون فتح المتصفح
            في كل مرة.
          </p>
        </div>

        <div className="mt-8">
          {installed ? (
            <div className="bg-white rounded-2xl border border-[color:var(--line)] p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-green-100 text-green-700 grid place-items-center mx-auto">
                <Check className="w-7 h-7" />
              </div>
              <div className="font-bold mt-3">التطبيق مثبّت على جهازك</div>
              <p className="text-sm text-[color:var(--ink-muted)] mt-1">
                يمكنك فتحه من الشاشة الرئيسية.
              </p>
              <Link
                to="/"
                className="mt-5 inline-flex px-5 py-3 rounded-full bg-[color:var(--tomato)] text-white font-bold hover:bg-[color:var(--tomato-dark)]"
              >
                افتح التطبيق
              </Link>
            </div>
          ) : (
            <button
              type="button"
              onClick={install}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-[color:var(--tomato)] text-white text-lg font-bold shadow-lg hover:bg-[color:var(--tomato-dark)] active:scale-[0.99] transition-all"
            >
              <Download className="w-6 h-6" />
              <span>ثبّت التطبيق الآن</span>
            </button>
          )}

          {!installed && platform === "ios" && (
            <div className="mt-5 bg-white rounded-2xl border border-[color:var(--line)] p-5 text-sm">
              <div className="font-bold mb-2">للتثبيت على آيفون:</div>
              <ol className="space-y-2 text-[color:var(--ink-muted)]">
                <li className="flex items-center gap-2">
                  <span className="text-[color:var(--ink)]">١.</span>
                  اضغط زر المشاركة
                  <Share className="w-4 h-4 inline text-[color:var(--tomato)]" />
                  في شريط سفاري.
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[color:var(--ink)]">٢.</span>
                  اختر «إضافة إلى الشاشة الرئيسية»
                  <PlusSquare className="w-4 h-4 inline text-[color:var(--tomato)]" />
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[color:var(--ink)]">٣.</span>
                  اضغط «إضافة» لإكمال التثبيت.
                </li>
              </ol>
            </div>
          )}

          {!installed && platform !== "ios" && !promptReady && (
            <p className="mt-4 text-center text-xs text-[color:var(--ink-muted)] leading-relaxed">
              إذا لم يظهر مربّع التثبيت، افتح قائمة المتصفح
              <MoreVertical className="w-3.5 h-3.5 inline mx-1" />
              واختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».
            </p>
          )}
        </div>

        <div className="mt-8 text-center">
          <Link
            to="/"
            className="text-sm text-[color:var(--ink-muted)] hover:text-[color:var(--tomato)]"
          >
            → متابعة بدون تثبيت
          </Link>
        </div>
      </main>
    </div>
  );
}
