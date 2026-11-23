"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

const FALLBACK_IMAGE_URL = "/images/placeholder.svg";


interface ImageProps {
  src?: string;
  alt?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
  quality?: number;
  placeholder?: "blur" | "empty";
  blurDataURL?: string;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: () => void;
  onError?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
  loading?: "lazy" | "eager";
  objectFit?: "cover" | "contain" | "fill" | "none" | "scale-down";
  objectPosition?: string;
}

/**
 * Next.js 16 Image Component Wrapper
 * Provides optimized images with proper sizing, lazy loading, and fallbacks.
 * 
 * Usage:
 * - For fixed dimensions: <Image src="..." width={400} height={300} />
 * - For fill container: <Image src="..." fill className="object-cover" />
 * - For responsive: <Image src="..." width={800} height={600} sizes="(max-width: 768px) 100vw, 50vw" />
 */
export function OptimizedImage({
  src,
  alt = "",
  fill = false,
  width,
  height,
  sizes,
  priority = false,
  quality = 85,
  placeholder = "blur",
  blurDataURL,
  className,
  style,
  onLoad,
  onError,
  loading,
  objectFit = "cover",
  objectPosition = "center",
  ...props
}: ImageProps) {
  // When priority is true, loading must be "eager" (not "lazy")
  const effectiveLoading = priority ? "eager" : (loading ?? "lazy");
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Generate blur data URL if not provided
  const blurUrl = blurDataURL || `data:image/svg+xml;base64,${btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">
      <rect fill="#e5e5e5" width="10" height="10"/>
    </svg>
  `)}`;

  const handleError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    setHasError(true);
    onError?.(event);
  };

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  // If error, show fallback
  if (hasError) {
    return (
      <Image
        src={FALLBACK_IMAGE_URL}
        alt={alt}
        fill={fill}
        width={fill && !width ? undefined : width}
        height={fill && !height ? undefined : height}
        sizes={sizes || (fill ? "100vw" : undefined)}
        priority={priority}
        quality={quality}
        placeholder={placeholder}
        blurDataURL={blurUrl}
        unoptimized={fill && (width === undefined || height === undefined)}
        className={cn("object-cover", className)}
        style={style}
        loading={effectiveLoading}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
    );
  }

  return (
    <Image
      src={src || FALLBACK_IMAGE_URL}
      alt={alt}
      fill={fill}
      width={fill && !width ? undefined : width}
      height={fill && !height ? undefined : height}
      sizes={sizes || (fill ? "100vw" : undefined)}
      priority={priority}
      quality={quality}
      placeholder={placeholder}
      blurDataURL={blurUrl}
      unoptimized={fill && (width === undefined || height === undefined)}
      className={cn(
        "transition-opacity duration-300",
        isLoading && "opacity-0",
        !isLoading && "opacity-100",
        className
      )}
      style={{
        objectFit,
        objectPosition,
        ...style,
      }}
      loading={effectiveLoading}
      onLoad={handleLoad}
      onError={handleError}
      {...props}
    />
  );
}

/**
 * Convenience wrapper for common use cases
 */
export function ProductImage({
  src,
  alt,
  priority = false,
  className,
  ...props
}: Omit<ImageProps, "fill" | "width" | "height" | "sizes"> & {
  priority?: boolean;
  className?: string;
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={400}
      height={300}
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      priority={priority}
      className={cn("rounded-xl", className)}
      {...props}
    />
  );
}

export function HeroImage({
  src,
  alt,
  priority = true,
  className,
  ...props
}: Omit<ImageProps, "fill" | "width" | "height" | "sizes"> & {
  priority?: boolean;
  className?: string;
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      fill
      priority={priority}
      className={cn("object-cover", className)}
      sizes="100vw"
      {...props}
    />
  );
}

export function ThumbnailImage({
  src,
  alt,
  size = 64,
  className,
  ...props
}: Omit<ImageProps, "fill" | "width" | "height" | "sizes"> & {
  size?: number;
  className?: string;
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      sizes={`${size}px`}
      className={cn("rounded-lg object-cover", className)}
      {...props}
    />
  );
}

export function AvatarImage({
  src,
  alt,
  size = 40,
  className,
  ...props
}: Omit<ImageProps, "fill" | "width" | "height" | "sizes"> & {
  size?: number;
  className?: string;
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      sizes={`${size}px`}
      className={cn("rounded-full object-cover ring-2 ring-primary/20", className)}
      {...props}
    />
  );
}


export { OptimizedImage as Image };