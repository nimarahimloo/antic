import FloatingBot from "@/components/agent/FloatingBot";

const STARTERS = [
  "برای نشیمن مدرن چی پیشنهاد می‌کنی؟",
  "اتاق خواب بلک‌اوت می‌خوام",
  "سلیقه‌م کلاسیکه",
  "زبرا دارید؟",
];

export default function CustomerAssistant() {
  return (
    <FloatingBot
      mode="customer"
      agentName="design_consultant"
      storageKey="antic_bot_customer"
      title="دستیار طراحی آنتیک"
      subtitle="انتخاب پرده و دکور با سلیقه تو"
      starters={STARTERS}
      accentClass="bg-primary text-primary-foreground"
    />
  );
}
