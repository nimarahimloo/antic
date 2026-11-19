"use client";

/** اسپینر مشترک برای loading states و Suspense fallbackها */
export default function PageLoading({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-background min-h-screen flex items-center justify-center ${className}`}>
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
}
