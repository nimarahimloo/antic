"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import ProjectDetailPage from "@/components/ProjectDetailPage";
import { ProjectDetailPageSkeleton } from "@/components/Skeletons";

export default function ProjectDetailPageWrapper() {
  const params = useParams();
  const id = params.id as string;
  return (
    <Suspense fallback={<ProjectDetailPageSkeleton />}>
      <ProjectDetailPage projectId={id} />
    </Suspense>
  );
}