"use client";

import { useSearchParams } from "next/navigation";
import ProjectsList from "@/components/ProjectsList";

interface ProjectsListClientWrapperProps {
  categories: Array<{ id: string; name: string; slug: string; image: string | null; description: string }>;
}

export default function ProjectsListClientWrapper({ categories }: ProjectsListClientWrapperProps) {
  const searchParams = useSearchParams();
  const category = searchParams.get("category") || undefined;
  const subcategory = searchParams.get("subcategory") || undefined;

  return <ProjectsList categories={categories} />;
}