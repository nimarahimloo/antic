/**
 * Strict type definitions for the Antic curtain catalogue domain.
 * These replace ad-hoc `unknown` / `any` usage across the frontend.
 */

export interface CurtainCategory {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  description: string;
  order: number;
  mechanism: string | null;
  subcategories: Array<{ name: string; slug: string }>;
  inCatalog: boolean;
  backgroundImage: string | null;
  backgroundGradient: string | null;
}

export interface CurtainModel {
  id: string;
  code: string;
  name: string;
  install_image?: string;
  image?: string;
  color_code?: string;
  fabric?: string;
  color?: string;
  category_slug: string;
  subcategory?: string;
  description?: string;
  mechanism?: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description?: string;
  price: number;
  formattedPrice: string;
  image?: string;
  images?: string[];
  categoryId?: string;
  inventory?: { availabilityStatus: string };
  variants?: ProductVariant[];
  [key: string]: unknown;
}

export interface ProductVariant {
  id: string;
  name: string;
  price: number;
  formattedPrice: string;
  attributes?: Record<string, string>;
  [key: string]: unknown;
}

export interface CartLineItem {
  id: string;
  quantityInfo: { confirmedQuantity: number };
  source: { catalogReference: { catalogItemId: string; options?: { variantId?: string } } };
  name: { original: string };
  pricing: {
    unitPrice: { amount: string; convertedAmount: string };
    totalPrice: { amount: string; convertedAmount: string };
    unitFormatted: string;
  };
  attributes: {
    image?: { url: string; altText: string };
    descriptionLines: string[];
    modifierChoices?: Record<string, unknown>;
    customTextFields?: Record<string, unknown>;
  };
  status: string;
}

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

export interface ShopCategory {
  id: string;
  slug: string;
  name: string;
  visible?: boolean;
  description?: string;
  image?: string;
  parentId?: string;
  children?: ShopCategory[];
  [key: string]: unknown;
}
