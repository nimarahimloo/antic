"use client";

import { useState, useRef, useEffect, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { useSize } from "@/hooks/useSize";
import {
  parseMediaUrl,
  IMAGE_LOAD_MODE,
  nextImageLoadMode,
  getOriginalImageUrl,
  type LoadMode,
} from "./image-helpers";

const FALLBACK_IMAGE_URL = "/images/placeholder.svg";

const DEFAULT_TRANSFORM_WIDTH = 1200;

interface ImageProps {
  src?: string;
  fittingType?: "fill" | "fit";
  originWidth?: number;
  originHeight?: number;
  focalPointX?: number;
  focalPointY?: number;
  quality?: number;
  onLoad?: () => void;
  onError?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
}

const ImageWrapper = forwardRef<HTMLSpanElement, { aspectRatio?: string; className?: string; style?: React.CSSProperties; children: React.ReactNode }>(({ aspectRatio, className, style, children }, ref) => (
  <span ref={ref} className={cn("inline-block relative", className)} style={{ aspectRatio, ...style }}>
    {children}
  </span>
));

const ResponsiveImage = ({
  parsed,
  fittingType,
  focalPoint,
  quality,
  className,
  style,
  aspectRatio,
  onLoad,
}: {
  parsed: { baseUrl: string } | null;
  fittingType: "fill" | "fit";
  focalPoint?: { x: number; y: number };
  quality?: number;
  className?: string;
  style?: React.CSSProperties;
  aspectRatio?: string;
  onLoad?: () => void;
}) => {
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const size = useSize(wrapperRef);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [parsed?.baseUrl]);

  const crop = fittingType !== "fit";
  const options = size && {
    width: size.width || DEFAULT_TRANSFORM_WIDTH,
    height: size.height ? size.height : undefined,
    crop,
    focalPoint: crop ? focalPoint : undefined,
    quality,
  };

  if (!options || !parsed) {
    return null;
  }

  // For local images, we just use the original URL
  const imageUrl = parsed.baseUrl;

  return (
    <ImageWrapper ref={wrapperRef} aspectRatio={aspectRatio} className={className} style={style}>
      {options && !loaded && (
        <img
          src={imageUrl}
          alt=""
          aria-hidden="true"
          className="w-full h-full inset-0 absolute"
          style={{
            objectFit: fittingType === "fit" ? "contain" : "cover",
            filter: "blur(10px)",
            transform: "scale(1.1)",
          }}
        />
      )}
      {options && (
        <img
          ref={imgRef}
          src={imageUrl}
          alt=""
          loading="lazy"
          className={cn(
            "w-full h-full inset-0 absolute",
            fittingType === "fit" ? "object-contain" : "object-cover"
          )}
          onLoad={(e) => {
            setLoaded(true);
            onLoad?.();
          }}
        />
      )}
    </ImageWrapper>
  );
};

const Image = ({
  src,
  fittingType = "fill",
  originWidth,
  originHeight,
  focalPointX,
  focalPointY,
  quality = 90,
  onError,
  ...props
}: ImageProps) => {
  const parsedSource = src && src !== FALLBACK_IMAGE_URL ? parseMediaUrl(src) : null;
  const initialMode: LoadMode = parsedSource ? IMAGE_LOAD_MODE.OPTIMIZED : IMAGE_LOAD_MODE.ORIGINAL;
  const [loadState, setLoadState] = useState<{ src: string; mode: LoadMode }>({ src: src || "", mode: initialMode });
  const mode: LoadMode = loadState.src === src ? loadState.mode : initialMode;
  const modeForComparison = mode;

  useEffect(() => {
    setLoadState({ src: src || "", mode: initialMode });
  }, [src, initialMode]);

  const handleError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    if (modeForComparison === IMAGE_LOAD_MODE.FALLBACK) return;
    const nextMode = nextImageLoadMode(modeForComparison);
    setLoadState({ src: src || "", mode: nextMode });
    if (nextMode === IMAGE_LOAD_MODE.FALLBACK) onError?.(event);
  };

  const imageProps = {
    ...props,
    onError: handleError,
  };

  if (!src) {
    return <img src={FALLBACK_IMAGE_URL} {...imageProps} data-empty-image alt={props.alt || ""} />;
  }

  const parsed = modeForComparison === IMAGE_LOAD_MODE.OPTIMIZED ? parsedSource : null;

  if (!parsed) {
    const isErrorMode = modeForComparison === IMAGE_LOAD_MODE.FALLBACK;
    const imageSrc = isErrorMode ? FALLBACK_IMAGE_URL : getOriginalImageUrl(src || "");
    return <img src={imageSrc} {...imageProps} data-error-image={isErrorMode || undefined} alt={props.alt || ""} />;
  }

  const focalPoint =
    typeof focalPointX === "number" && typeof focalPointY === "number"
      ? { x: focalPointX, y: focalPointY }
      : undefined;

  const aspectRatio =
    originWidth && originHeight ? `${originWidth} / ${originHeight}` : undefined;

  return (
    <ResponsiveImage
      parsed={parsed}
      fittingType={fittingType}
      focalPoint={focalPoint}
      quality={quality}
      aspectRatio={aspectRatio}
      {...imageProps}
    />
  );
};

export { Image };