import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "سياسة الخصوصية — مطعم بيتزا نورس" },
      {
        name: "description",
        content:
          "سياسة الخصوصية لتطبيق وموقع نورس بيتزا: البيانات التي نجمعها، وكيف نستخدمها، وحقوقك.",
      },
      { property: "og:title", content: "سياسة الخصوصية — نورس بيتزا" },
      {
        property: "og:description",
        content: "شرح واضح للبيانات التي يجمعها تطبيق نورس بيتزا وطرق استخدامها.",
      },
      { property: "og:url", content: "https://nawraspizza.lovable.app/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://nawraspizza.lovable.app/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[color:var(--cream)] text-[color:var(--ink)]">
      <main className="max-w-2xl mx-auto px-5 py-10">
        <Link to="/" className="text-sm text-[color:var(--tomato)] hover:underline">
          → العودة للرئيسية
        </Link>
        <h1 className="font-serif text-4xl mt-4">سياسة الخصوصية</h1>
        <p className="text-sm text-[color:var(--ink-muted)] mt-2">
          آخر تحديث: 10 يوليو 2026
        </p>

        <section className="mt-8 space-y-3 leading-relaxed">
          <h2 className="font-bold text-xl">من نحن</h2>
          <p>
            مطعم <strong>نورس بيتزا</strong> يقدّم خدمة توصيل البيتزا. هذه السياسة تشرح
            البيانات التي نجمعها عند استخدامك لتطبيقنا أو موقعنا، وكيف نستخدمها، ومع من نشاركها.
          </p>
        </section>

        <section className="mt-6 space-y-3 leading-relaxed">
          <h2 className="font-bold text-xl">البيانات التي نجمعها</h2>
          <ul className="list-disc pr-6 space-y-2">
            <li>
              <strong>معلومات الطلب:</strong> الاسم، رقم الهاتف، عنوان التوصيل، الملاحظات،
              محتوى الطلب. نجمعها فقط لتنفيذ طلبك.
            </li>
            <li>
              <strong>الموقع الجغرافي (اختياري):</strong> عند مشاركتك موقعك من خلال زر
              «شارك موقعي» نستخدم إحداثيات GPS لتحديد نقطة التوصيل بدقة. لا نتتبّع موقعك في
              الخلفية ولا نجمعه بدون طلب صريح منك.
            </li>
            <li>
              <strong>إشعارات الدفع (اختياري):</strong> إذا فعّلت الإشعارات، نحفظ رمز
              الاشتراك الفني الخاص بجهازك (Push Subscription) لإرسال إشعارات العروض وحالة
              الطلب. يمكنك إيقافها من إعدادات المتصفح/النظام في أي وقت.
            </li>
            <li>
              <strong>بيانات فنية بسيطة:</strong> نوع الجهاز/المتصفح (User Agent) عند تسجيل
              الاشتراك بالإشعارات فقط، لأغراض التوافق.
            </li>
          </ul>
          <p className="text-sm text-[color:var(--ink-muted)]">
            لا نجمع بريدك الإلكتروني، ولا كلمة مرور، ولا معلومات دفع (الدفع نقداً عند الاستلام)،
            ولا نستخدم أدوات تحليل أو إعلانات من طرف ثالث.
          </p>
        </section>

        <section className="mt-6 space-y-3 leading-relaxed">
          <h2 className="font-bold text-xl">ملفات تعريف الارتباط والتخزين المحلي</h2>
          <p>
            نستخدم فقط ملفات وتخزين محلي <strong>ضرورية لتشغيل التطبيق</strong>:
          </p>
          <ul className="list-disc pr-6 space-y-2">
            <li>حفظ عناوينك السابقة على جهازك لتسهيل الطلب.</li>
            <li>حفظ رقم تتبّع طلبك الأخير حتى تعود لصفحة المتابعة بسهولة.</li>
            <li>ملف كوكي جلسة إداري (للمطبخ فقط) لا يظهر لعملائنا.</li>
          </ul>
          <p>
            لا نستخدم كوكيز تتبّع أو كوكيز إعلانية من طرف ثالث.
          </p>
        </section>

        <section className="mt-6 space-y-3 leading-relaxed">
          <h2 className="font-bold text-xl">كيف نستخدم بياناتك</h2>
          <ul className="list-disc pr-6 space-y-2">
            <li>تحضير طلبك وتوصيله إلى العنوان الصحيح.</li>
            <li>التواصل معك هاتفياً في حال وجود استفسار بخصوص الطلب.</li>
            <li>إرسال إشعارات حالة الطلب أو العروض (فقط إذا وافقت).</li>
          </ul>
          <p>لا نبيع بياناتك، ولا نشاركها لأغراض تسويقية مع أي طرف ثالث.</p>
        </section>

        <section className="mt-6 space-y-3 leading-relaxed">
          <h2 className="font-bold text-xl">مع من نشارك البيانات</h2>
          <ul className="list-disc pr-6 space-y-2">
            <li>
              <strong>موظفو التوصيل لدينا</strong> — يرون الاسم، الهاتف، والعنوان لتوصيل الطلب.
            </li>
            <li>
              <strong>مزوّد الاستضافة وقاعدة البيانات</strong> (Vercel و Supabase) — لحفظ
              الطلبات بشكل آمن.
            </li>
            <li>
              <strong>خدمات الإشعارات</strong> (Google/Apple/Mozilla push services) — لتوصيل
              إشعارات الدفع للجهاز فقط.
            </li>
          </ul>
        </section>

        <section className="mt-6 space-y-3 leading-relaxed">
          <h2 className="font-bold text-xl">الاحتفاظ بالبيانات</h2>
          <p>
            نحتفظ ببيانات الطلب لأغراض المحاسبة وخدمة العملاء لفترة محدودة. يمكنك في أي وقت
            التواصل معنا لطلب حذف بياناتك.
          </p>
        </section>

        <section className="mt-6 space-y-3 leading-relaxed">
          <h2 className="font-bold text-xl">حقوقك</h2>
          <ul className="list-disc pr-6 space-y-2">
            <li>طلب معرفة البيانات المخزّنة عنك.</li>
            <li>طلب تصحيحها أو حذفها.</li>
            <li>سحب موافقتك على الإشعارات أو الموقع في أي وقت من إعدادات جهازك.</li>
          </ul>
        </section>

        <section className="mt-6 space-y-3 leading-relaxed">
          <h2 className="font-bold text-xl">الأطفال</h2>
          <p>الخدمة موجّهة للبالغين لتقديم طلبات الطعام، ولا نستهدف الأطفال دون 13 عاماً.</p>
        </section>

        <section className="mt-6 space-y-3 leading-relaxed">
          <h2 className="font-bold text-xl">التواصل</h2>
          <p>
            لأي استفسار بشأن الخصوصية أو حذف بياناتك، تواصل معنا عبر رقم المطعم الظاهر في
            الصفحة الرئيسية.
          </p>
        </section>

        <div className="mt-10">
          <Link
            to="/"
            className="inline-flex px-5 py-3 rounded-full bg-[color:var(--tomato)] text-white font-bold"
          >
            العودة إلى الرئيسية
          </Link>
        </div>
      </main>
    </div>
  );
}
