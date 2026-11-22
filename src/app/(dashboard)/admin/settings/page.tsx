"use client";

import { Card } from "@/components/ui/card";

export default function AdminSettingsPage() {
  return (
    <div className="bg-background">
      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-10 lg:py-12">
        <h1 className="font-display text-2xl font-bold text-foreground mb-6">تنظیمات</h1>
        <Card className="p-6">
          <p className="text-muted-foreground">بخش تنظیمات در حال توسعه است.</p>
        </Card>
      </div>
    </div>
  );
}