import { Link } from "react-router-dom";

export default function ProjectCard({ project, className = "" }) {
  return (
    <Link to={`/projects/${project.id}`} className={`group block min-h-0 ${className}`}>
      <div className="relative aspect-[4/3] h-full min-h-[200px] overflow-hidden rounded-2xl border border-secondary/60 bg-card lg:aspect-auto">
        {project.cover_image ? (
          <img
            src={project.cover_image}
            alt={project.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-secondary/40">
            <span className="font-display text-sm font-bold text-muted-foreground">{project.title}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5">
          <h3 className="font-display text-lg font-bold text-foreground">{project.title}</h3>
        </div>
      </div>
    </Link>
  );
}
