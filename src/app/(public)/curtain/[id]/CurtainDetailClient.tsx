"use client";

import { useState, useEffect } from "react";

interface CurtainModel {
  id?: string;
  code?: string;
  name?: string;
  image?: string;
  install_image?: string;
  color?: string;
  color_code?: string;
  fabric?: string;
  texture?: string;
  material?: string;
  category_slug?: string;
  description?: string;
}

interface CurtainDetailClientProps {
  model: CurtainModel;
  relatedProjects: Array<{ id: string; title: string; cover_image?: string }>;
}

export default function CurtainDetailClient({ model, relatedProjects }: CurtainDetailClientProps) {
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projects, setProjects] = useState(relatedProjects);

  // Refresh projects from server periodically or on interaction
  useEffect(() => {
    if (!model?.category_slug) {
      setProjectsLoading(false);
      return;
    }
    // Initial load already done server-side, just mark as loaded
    setProjectsLoading(false);
  }, [model?.category_slug, relatedProjects]);

  return (
    <div className="space-y-6">
      {/* Additional client-side interactions could go here */}
      {/* For example: image zoom, color swatches, etc. */}
      
      {/* Project cards are already rendered server-side */}
      {projectsLoading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="aspect-[4/3] animate-pulse rounded-xl bg-secondary/30" />
          ))}
        </div>
      )}
    </div>
  );
}