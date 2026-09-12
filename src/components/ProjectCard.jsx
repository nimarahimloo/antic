import { Link } from "react-router-dom";

export default function ProjectCard({ project }) {
  return (
    <Link to={`/projects/${project.id}`} className="group">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-secondary/60 bg-card">
        {project.cover_image && (
          <img
            src={project.cover_image}
            alt={project.title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5">
          <span className="eyebrow mb-1 block">{project.space_type}</span>
          <h3 className="font-display text-lg font-bold text-foreground">{project.title}</h3>
          {project.location && (
            <p className="mt-1 font-body text-xs text-muted-foreground">{project.location}</p>
          )}
        </div>
      </div>
    </Link>
  );
}