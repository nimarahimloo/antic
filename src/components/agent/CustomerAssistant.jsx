import FloatingBot from "@/components/agent/FloatingBot";

const STARTERS = [
  "نشیمن روشن و دلباز",
  "اتاق خواب تاریک بلک‌اوت",
  "تفاوت شید و زبرا چیست؟",
  "چه دسته‌هایی دارید؟",
  "قیمت پرده چطور حساب می‌شود؟",
  "مراحل از انتخاب تا نصب چیست؟",
  "نمونه اجرای مشابه نشان بده",
  "چطور از پرده مراقبت کنم؟",
];

export default function CustomerAssistant() {
  return (
    <FloatingBot
      mode="customer"
      agentName="design_consultant"
      storageKey="antic_bot_customer_v7"
      title="دستیار آنتیک"
      subtitle="آنلاین · آماده پاسخ"
      starters={STARTERS}
      accentClass="bg-primary text-primary-foreground"
    />
  );
}
