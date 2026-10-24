import FloatingBot from "@/components/agent/FloatingBot";

const STARTERS = [
  "نشیمن روشن و دلباز",
  "اتاق خواب تاریک بلک‌اوت",
  "پذیرایی کلاسیک لوکس",
  "زبرا برای دفتر",
];

export default function CustomerAssistant() {
  return (
    <FloatingBot
      mode="customer"
      agentName="design_consultant"
      storageKey="antic_bot_customer_v3"
      title="دستیار طراحی آنتیک"
      subtitle="مثل یک مشاور دوستانه کنارته"
      starters={STARTERS}
      accentClass="bg-primary text-primary-foreground"
    />
  );
}
