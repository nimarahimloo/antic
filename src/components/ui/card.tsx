"use client";

import { cn } from "@/lib/utils";

const Card = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn(
        "rounded-2xl border border-secondary/60 bg-card shadow-sm",
        className
      )}
      {...props}
    />
  );
};

const CardHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn(
        "flex flex-col space-y-1.5 p-6",
        className
      )}
      {...props}
    />
  );
};

const CardTitle = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => {
  return (
    <h3
      className={cn(
        "font-display text-xl font-bold leading-none tracking-tight text-foreground",
        className
      )}
      {...props}
    />
  );
};

const CardDescription = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => {
  return (
    <p
      className={cn(
        "font-body text-sm text-muted-foreground",
        className
      )}
      {...props}
    />
  );
};

const CardContent = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div className={cn("p-6 pt-0", className)} {...props} />
  );
};

const CardFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn(
        "flex items-center p-6 pt-0",
        className
      )}
      {...props}
    />
  );
};

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };