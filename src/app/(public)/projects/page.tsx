import { Suspense } from "react";
import { getCurtainCategories } from "@/lib/server-data";
import ProjectsList from "@/components/ProjectsList";
import PageLoading from "@/components/PageLoading";
import ProjectsListClientWrapper from "./ProjectsListClientWrapper";

export default async function ProjectsPage() {
  let categories: Array<{ id: string; name: string; slug: string; image: string | null; description: string }> = [];
  
  try {
    categories = await getCurtainCategories();
  } catch {
    // During build, API might not be available - return empty array
    categories = [];
  }

  return (
    <Suspense fallback={<PageLoading />}>
      <ProjectsListClientWrapper categories={categories} />
    </Suspense>
  );
}