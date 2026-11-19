"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ProjectsList from "@/components/ProjectsList";
import PageLoading from "@/components/PageLoading";

function ProjectsContent() {
  const searchParams = useSearchParams();
  const category = searchParams.get("category") || undefined;
  const subcategory = searchParams.get("subcategory") || undefined;
  return <ProjectsList category={category} subcategory={subcategory} />;
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ProjectsContent />
    </Suspense>
  );
}
