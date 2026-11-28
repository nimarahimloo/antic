"use client";

import CatalogCard from "@/components/catalog/CatalogCard";

interface ModelGridProps {
  gridItems: Record<string, unknown>[];
  selectedModel: Record<string, unknown> | null;
  handleModelClick: (item: Record<string, unknown>) => void;
}

export function ModelGrid({ gridItems, selectedModel, handleModelClick }: ModelGridProps) {
  const items = gridItems as Array<Record<string, unknown>>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map((item, _index) => {
        const itemId = String(item.id);
        const modelProps = {
          id: itemId,
          code: String(item.code),
          name: String(item.name),
          install_image: item.install_image as string | undefined,
          image: item.image as string | undefined,
          color_code: item.color_code as string | undefined,
          fabric: item.fabric as string | undefined,
          color: item.color as string | undefined,
        };
        return (
          <CatalogCard
            key={itemId}
            model={modelProps}
            active={selectedModel?.id === itemId}
            onClick={() => handleModelClick(item)}
          />
        );
      })}
    </div>
  );
}