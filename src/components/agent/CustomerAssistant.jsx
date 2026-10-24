import FloatingBot from "@/components/agent/FloatingBot";

const STARTERS = [
  "نشیمن روشن و دلباز",
  "اتاق خواب تاریک بلک‌اوت",
  "تفاوت شید و زبرا چیست؟",
  "چه دسته‌هایی دارید؟",
  "قیمت پرده چطور حساب می‌شود؟",
  "نمونه اجرای مشابه نشان بده",
];

export default function CustomerAssistant() {
  return (
    <FloatingBot
      mode="customer"
      agentName="design_consultant"
      storageKey="antic_bot_customer_v4"
      title="دستیار طراحی آنتیک"
      subtitle="هر سوالی بپرس — مثل یک مشاور واقعی"
      starters={STARTERS}
      accentClass="bg-primary text-primary-foreground"
    />
  );
}
