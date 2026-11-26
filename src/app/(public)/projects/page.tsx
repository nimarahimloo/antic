import { Suspense } from "react";
import { getCurtainCategories } from "@/lib/server-data";
import { ProjectsPageSkeleton } from "@/components/Skeletons";
import ProjectsListClientWrapper from "./ProjectsListClientWrapper";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  let categories: Array<{ id: string; name: string; slug: string; image: string | null; description: string }> = [];
  
  try {
    categories = await getCurtainCategories();
  } catch {
    // During build, API might not be available - return empty array
    categories = [];
  }

  return (
    <Suspense fallback={<ProjectsPageSkeleton />}>
      <ProjectsListClientWrapper categories={categories} />
    </Suspense>
  );
}