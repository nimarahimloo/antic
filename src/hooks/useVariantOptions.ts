"use client";

// Headless data layer for product option/variant/modifier picking.
// Normalises raw Wix product options + modifiers into flat, render-agnostic structures so you
// can build whatever UI you want (pills, radios, dropdowns, swatches) without touching the
// data-edge-case logic (visible filtering, color detection, modifier key resolution).
//
// Usage:
//   const { optionGroups, modifierGroups } = useVariantOptions(
//     options, modifiers, selectedOptions, modifierValues
//   );
//   // then map over optionGroups/modifierGroups to render your own controls and call
//   // selectOption(optionId, choiceId) / setModifier(key, value) from useProductDetail.

import { useMemo } from "react";

interface OptionChoice {
  choiceId: string;
  name: string;
  colorCode?: string | null;
  choiceType?: string;
  visible?: boolean;
  inStock?: boolean;
}

interface ProductOption {
  id: string;
  name: string;
  optionRenderType?: string;
  choicesSettings?: { choices?: OptionChoice[] };
}

interface ProductModifier {
  key: string;
  name: string;
  mandatory?: boolean;
  modifierRenderType?: string;
  freeTextSettings?: { key: string };
  choicesSettings?: { choices?: Array<{ key: string; name: string }> };
}

interface OptionGroup {
  id: string;
  name: string;
  isColor: boolean;
  choices: Array<{
    choiceId: string;
    name: string;
    colorCode: string | null;
    isColorSwatch: boolean;
    inStock: boolean;
    selected: boolean;
  }>;
}

interface ModifierGroup {
  key: string;
  name: string;
  mandatory: boolean;
  type: "text" | "choices";
  value?: string;
  choices?: Array<{ key: string; name: string; selected: boolean }>;
}

export function useVariantOptions(
  options: ProductOption[],
  modifiers: ProductModifier[],
  selectedOptions: Record<string, string>,
  modifierValues: Record<string, string>
) {
  const optionGroups = useMemo<OptionGroup[]>(() =>
    (options || []).map((option) => {
      const rawChoices = option.choicesSettings?.choices || [];
      // `visible: false` = a choice the merchant retired — filter it so buyers can't select it.
      const choices = rawChoices
        .filter((c) => c.visible !== false)
        .map((c) => ({
          choiceId: c.choiceId,
          name: c.name,
          colorCode: c.colorCode || null,
          // true when this choice should render as a colour swatch (circle) rather than a pill.
          isColorSwatch: !!(
            (option.optionRenderType === "COLOR_CHOICES" ||
              option.optionRenderType === "SWATCH_CHOICES" ||
              c.choiceType === "ONE_COLOR") &&
            c.colorCode
          ),
          inStock: c.inStock !== false,
          selected: selectedOptions[option.id] === c.choiceId,
        }));
      return {
        id: option.id,
        name: option.name,
        // true if ANY choice in this group is a colour swatch — lets you branch on group type.
        isColor: choices.some((c) => c.isColorSwatch),
        choices,
      };
    }),
    [options, selectedOptions]
  );

  const modifierGroups = useMemo<ModifierGroup[]>(() =>
    (modifiers || []).map((m) => {
      const isText = m.modifierRenderType === "FREE_TEXT";
      const key = (isText ? m.freeTextSettings?.key : m.key) || m.key;
      if (isText) {
        return {
          key,
          name: m.name,
          mandatory: !!m.mandatory,
          type: "text",
          value: modifierValues[key] || "",
        };
      }
      return {
        key,
        name: m.name,
        mandatory: !!m.mandatory,
        type: "choices",
        choices: (m.choicesSettings?.choices || []).map((c) => ({
          key: c.key,
          name: c.name,
          selected: modifierValues[key] === c.key,
        })),
      };
    }),
    [modifiers, modifierValues]
  );

  return { optionGroups, modifierGroups };
}