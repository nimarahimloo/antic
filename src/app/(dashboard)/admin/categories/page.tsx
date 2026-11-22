"use client";

import { Card } from "@/components/ui/card";

export default function AdminCategoriesPage() {
  return (
    <div className="bg-background">
      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-10 lg:py-12">
        <h1 className="font-display text-2xl font-bold text-foreground mb-6">دسته‌بندی‌ها</h1>
        <Card className="p-6">
          <p className="text-muted-foreground">بخش دسته‌بندی‌ها در حال توسعه است.</p>
        </Card>
      </div>
    </div>
  );
}