/**
 * Temporary stub so backend boots. Full adminActions will be restored.
 */
export type AdminBlock =
  | { type: "text"; markdown: string }
  | { type: "link_buttons"; items: Array<{ label: string; href: string }> }
  | { type: "quick_replies"; items: Array<{ label: string; message: string }> }
  | {
      type: "model_cards";
      items: Array<{
        id: string;
        title: string;
        subtitle?: string;
        image?: string | null;
        href: string;
      }>;
    };

export type AdminActionResult = {
  text: string;
  blocks?: AdminBlock[];
  meta?: Record<string, unknown>;
};

export async function executeAdminCommand(
  _userText: string,
  _options?: { imageUrl?: string; path?: string; conversationId?: string }
): Promise<AdminActionResult | null> {
  return {
    text: "پنل دستوری ادمین موقتاً در دسترس نیست. از مسیرهای ادمین وب استفاده کنید.",
  };
}
