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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  const serverUrl = useMemo(() => new URL("/api/mcp", window.location.origin).toString(), []);

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
      <section className="border-b border-secondary/50 bg-card/40">
        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-10 lg:py-20">
          <span className="eyebrow mb-4 block">اتصال فنی</span>
          <h1 className="font-display text-3xl font-bold text-foreground lg:text-5xl">
            اتصال سرور MCP به کلاینت‌های پشتیبان
          </h1>
          <p className="mt-5 max-w-2xl font-body text-sm leading-7 text-muted-foreground">
            با افزودن آدرس سرور MCP این سایت به کلاینت‌هایی مانند Claude، ChatGPT یا Cursor می‌توانید
            داده‌های عمومی کاتالوگ و نمونه‌کارها را در همان محیط جستجو کنید.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 lg:px-10 lg:py-20">
        <div className="mb-12 rounded-2xl border border-secondary/60 bg-card/50 p-6 lg:p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/50 text-primary">
              <Plug className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold text-foreground">آدرس سرور MCP</h2>
              <p className="font-body text-xs text-muted-foreground">این آدرس را در کلاینت مورد نظر وارد کنید.</p>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <code
              className="flex-1 overflow-x-auto rounded-xl border border-secondary/70 bg-background px-4 py-3 font-mono text-xs text-primary"
              dir="ltr"
            >
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
            <span>دسترسی عمومی و فقط‌خواندنی است؛ ورود لازم نیست.</span>
          </p>
        </div>

        <div className="mb-8">
          <h2 className="font-display text-2xl font-bold text-foreground">راهنمای اتصال</h2>
          <p className="mt-2 font-body text-sm text-muted-foreground">
            کلاینت مورد نظر را انتخاب کنید و مراحل را دنبال کنید.
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
                <>در Settings به بخش <strong>Connectors</strong> بروید.</>,
                <><strong>Add custom connector</strong> را انتخاب کنید.</>,
                <>نام دلخواه و آدرس سرور MCP را وارد کنید.</>,
                <><strong>Add</strong> را بزنید.</>,
              ]}
              note="پس از به‌روزرسانی سایت، کانکتور را یک‌بار بازنشانی کنید."
            />
          </TabsContent>

          <TabsContent value="chatgpt" className="mt-6">
            <ClientPanel
              steps={[
                <>Developer mode را در Apps فعال کنید.</>,
                <>Create app را بزنید و نام وارد کنید.</>,
                <>آدرس سرور MCP را در URL بگذارید.</>,
                <>اپ را در چت فعال کنید.</>,
              ]}
              note="پس از به‌روزرسانی سایت، اپ را بازنشانی کنید."
            />
          </TabsContent>

          <TabsContent value="cursor" className="mt-6">
            <ClientPanel
              steps={[
                <>به Customize و تب MCPs بروید.</>,
                <>New MCP Server را انتخاب کنید.</>,
                <>آدرس سرور را در فیلد url قرار دهید و ذخیره کنید.</>,
                <>کلاینت را روشن کنید.</>,
              ]}
              note="پس از به‌روزرسانی سایت، MCP را یک‌بار reload کنید."
            />
          </TabsContent>

          <TabsContent value="custom" className="mt-6">
            <ClientPanel
              steps={[
                <>آدرس سرور را کپی کنید.</>,
                <>به‌عنوان streamable HTTP MCP اضافه کنید.</>,
                <>کلاینت را reload کنید.</>,
              ]}
              note="پس از به‌روزرسانی سایت، کلاینت را بازنشانی کنید."
            />
          </TabsContent>
        </Tabs>

        <div className="mt-14">
          <Link to="/" className="btn-ghost-gold">
            <ArrowLeft className="h-4 w-4" /> بازگشت به خانه
          </Link>
        </div>
      </section>
    </div>
  );
}
