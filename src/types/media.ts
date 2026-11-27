export interface Media {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  storagePath: string;
  url: string;
  webpUrl?: string;
  originalSize?: number;
  originalMimeType?: string;
  sha256?: string;
  alt?: string | null;
  caption?: string | null;
  title?: string | null;
  uploadedById?: string | null;
  usageCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MediaListResponse {
  items: Media[];
  total: number;
  limit: number;
  offset: number;
}
