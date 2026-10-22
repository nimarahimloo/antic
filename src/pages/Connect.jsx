import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plug,
  Copy,
  Check,
  Terminal,
  MessageSquare,
  Sparkles,
  MousePointerClick,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

function StepItem({ n, children }) {
  return (
    <li className="flex gap-4">
      <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full border border-primary/50 font-display text-xs font-bold text-primary">
        {n}
      </span>
      <span className="font-body text-sm leading-7 text-foreground/85">{children}</span>
    </li>
  );
}

function ClientPanel({ steps, note }) {
  return (
    <div className="rounded-2xl border border-secondary/60 bg-card/50 p-6 lg:p-8">
      <ol className="space-y-5">
        {steps.map((s, i) => (
          <StepItem key={i} n={i + 1}>
            {s}
          </StepItem>
        ))}
      </ol>
      {note && (
        <p className="mt-6 flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 font-body text-xs leading-6 text-primary/90">
          <RefreshCw className="mt-0.5 h-4 w-4 flex-none" />
          <span>{note}</span>
        </p>
      )}
    </div>
  );
}

export default function Connect() {
  const [copied, setCopied] = useState(false);

  const serverUrl = useMemo(
    () => new URL("/api/mcp", window.location.origin).toString(),
    []
  );

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(serverUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="bg-background">
      {/* Hero */}
      <section className="border-b border-secondary/50 bg-card/40">
        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-10 lg:py-20">
          <span className="eyebrow mb-4 block">اتصال به دستیار هوش مصنوعی</span>
          <h1 className="font-display text-3xl font-bold text-foreground lg:text-5xl">
            اتصال <span className="text-gold-gradient">دستیار هوش مصنوعی</span> به پرده آنتیک
          </h1>
          <p className="mt-5 max-w-2xl font-body text-sm leading-7 text-muted-foreground">
            با اتصال سرور MCP این برنامه به دستیارهای هوش مصنوعی مانند Claude، ChatGPT و Cursor،
            می‌توانید داده‌های کاتالوگ، پروژه‌ها و مدل‌های پرده را مستقیماً در گفت‌وگوی خود جستجو و مشاهده کنید.
            کافی است آدرس سرور را در کلاینت مورد نظر وارد کنید.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 lg:px-10 lg:py-20">
        {/* URL card */}
        <div className="mb-12 rounded-2xl border border-secondary/60 bg-card/50 p-6 lg:p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/50 text-primary">
              <Plug className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold text-foreground">آدرس سرور MCP</h2>
              <p className="font-body text-xs text-muted-foreground">
                این آدرس را کپی کرده و در کلاینت هوش مصنوعی خود وارد کنید.
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <code className="flex-1 overflow-x-auto rounded-xl border border-secondary/70 bg-background px-4 py-3 font-mono text-xs text-primary" dir="ltr">
              {serverUrl}
            </code>
            <Button
              onClick={copyUrl}
              variant="outline"
              className="flex-none border-primary/50 text-primary hover:bg-primary/10 hover:text-primary"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" /> کپی شد
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> کپی آدرس
                </>
              )}
            </Button>
          </div>
          <p className="mt-4 flex items-start gap-2 font-body text-xs leading-6 text-muted-foreground">
            <Sparkles className="mt-0.5 h-4 w-4 flex-none text-primary" />
            <span>
              این سرور در حالت عمومی (فقط خواندنی) فعال است؛ نیازی به ورود ندارد.
              دستیار فقط می‌تواند داده‌های عمومی کاتالوگ و پروژه‌ها را بخواند.
            </span>
          </p>
        </div>

        {/* Client tabs */}
        <div className="mb-8">
          <h2 className="font-display text-2xl font-bold text-foreground">
            راهنمای اتصال برای هر کلاینت
          </h2>
          <p className="mt-2 font-body text-sm text-muted-foreground">
            یکی از کلاینت‌های زیر را انتخاب کنید و مراحل را دنبال کنید.
          </p>
        </div>

        <Tabs defaultValue="claude" className="w-full">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 rounded-2xl border border-secondary/60 bg-card/40 p-2">
            <TabsTrigger
              value="claude"
              className="rounded-xl px-4 py-2.5 font-display text-sm font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <MessageSquare className="h-4 w-4" /> Claude
            </TabsTrigger>
            <TabsTrigger
              value="chatgpt"
              className="rounded-xl px-4 py-2.5 font-display text-sm font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Sparkles className="h-4 w-4" /> ChatGPT
            </TabsTrigger>
            <TabsTrigger
              value="cursor"
              className="rounded-xl px-4 py-2.5 font-display text-sm font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <MousePointerClick className="h-4 w-4" /> Cursor
            </TabsTrigger>
            <TabsTrigger
              value="custom"
              className="rounded-xl px-4 py-2.5 font-display text-sm font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Terminal className="h-4 w-4" /> سفارشی
            </TabsTrigger>
          </TabsList>

          <TabsContent value="claude" className="mt-6">
            <ClientPanel
              steps={[
                <>در منوی پروفایل بالا را روی <strong>Settings</strong> کلیک کنید.</>,
                <>به بخش <strong>Connectors</strong> بروید و <strong>“Add custom connector”</strong> را انتخاب کنید.</>,
                <>یک نام دلخواه برای کانکتور وارد کنید (مثلاً «پرده آنتیک»).</>,
                <>آدرس سرور MCP را که کپی کردید در فیلد URL قرار دهید و <strong>Add</strong> را بزنید.</>,
              ]}
              note="پس از هر بار انتشار تغییرات در برنامه، کانکتور را در Claude بازنشانی کنید تا فهرست ابزارهای جدید بارگذاری شود."
            />
          </TabsContent>

          <TabsContent value="chatgpt" className="mt-6">
            <ClientPanel
              steps={[
                <>در ChatGPT به بخش <strong>Apps</strong> بروید و <strong>Developer mode</strong> را فعال کنید (هشدار ریسک را تأیید کنید).</>,
                <><strong>“Create app”</strong> را انتخاب کنید و نامی برای آن وارد کنید.</>,
                <>آدرس سرور MCP را در فیلد URL قرار دهید و <strong>Create</strong> را بزنید.</>,
                <>از داخل نوار composing چت، اپلیکیشن ساخته‌شده را فعال کنید و سپس درخواست خود را بنویسید.</>,
              ]}
              note="پس از هر بار انتشار تغییرات در برنامه، اپلیکیشن را در ChatGPT بازنشانی کنید تا فهرست ابزارهای جدید بارگذاری شود."
            />
          </TabsContent>

          <TabsContent value="cursor" className="mt-6">
            <ClientPanel
              steps={[
                <>به بخش <strong>Customize</strong> بروید و تب <strong>MCPs</strong> را باز کنید.</>,
                <><strong>“New MCP Server”</strong> را انتخاب کنید؛ این کار فایل <code className="text-primary" dir="ltr">mcp.json</code> را باز می‌کند.</>,
                <>یک ورودی جدید اضافه کنید که فیلد <code className="text-primary" dir="ltr">url</code> آن برابر آدرس سرور MCP شما باشد.</>,
                <>فایل را ذخیره کنید و کلاینت را روشن (toggle on) کنید.</>,
              ]}
              note="پس از هر بار انتشار تغییرات در برنامه، کلاینت را در Cursor بازنشانی کنید تا فهرست ابزارهای جدید بارگذاری شود."
            />
          </TabsContent>

          <TabsContent value="custom" className="mt-6">
            <ClientPanel
              steps={[
                <>آدرس سرور MCP را کپی کنید.</>,
                <>در کلاینت دلخواه خود، آن را به‌عنوان یک سرور <strong>streamable HTTP MCP</strong> اضافه کنید.</>,
                <>نام و آدرس سرور کافی است؛ تنظیمات پیشرفته نیاز نیست.</>,
                <>کلاینت را بازنشانی (reload) کنید تا فهرست ابزارها بارگذاری شود.</>,
              ]}
              note="پس از هر بار انتشار تغییرات در برنامه، کلاینت خود را بازنشانی کنید تا فهرست ابزارهای جدید بارگذاری شود."
            />
          </TabsContent>
        </Tabs>

        {/* Back link */}
        <div className="mt-14">
          <Link to="/" className="btn-ghost-gold">
            <ArrowLeft className="h-4 w-4" /> بازگشت به خانه
          </Link>
        </div>
      </section>
    </div>
  );
}