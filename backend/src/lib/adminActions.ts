/**
 * Placeholder — restored automatically on `npm run dev` / `npm start`
 * via scripts/restore-adminActions.mjs from adminActions.b64.gz.txt
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
    text: "در حال آماده‌سازی پنل دستوری… یک‌بار npm run restore:admin یا ری‌استارت سرور را اجرا کنید.",
  };
}
