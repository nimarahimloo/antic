import { getToken } from "./token";

async function uploadFile(file: File, publicEndpoint: boolean) {
  const form = new FormData();
  form.append("file", file);
  const path = publicEndpoint ? "/upload/public" : "/upload";
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api";
  const res = await fetch(`${API_BASE}${path}`, { method: "POST", headers, body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Upload failed", { cause: { status: res.status, data } });
  return data;
}

export const integrationsApi = {
  Core: {
    async UploadPublicFile(opts: { file: File }) {
      const file = opts?.file;
      try {
        if (getToken()) return await uploadFile(file, false);
      } catch {
        /* fall through */
      }
      return uploadFile(file, true);
    },
  },
};
