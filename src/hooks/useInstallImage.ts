"use client";

import { useEffect, useState } from "react";
import { api } from "@/api/client";

interface Fabric {
  id?: string;
  install_status?: "approved" | "rejected" | "pending" | string;
  install_image?: string;
  image?: string;
}

const cache: Record<string, string> = {};
const pending: Record<string, Promise<string>> = {};

// Returns the AI-generated real installation image for a model; generates it once on first view.
export function useInstallImage(fabric: Fabric | undefined | null) {
  const id = fabric?.id;
  const approved = fabric?.install_status === "approved" ? fabric.install_image || "" : "";
  const [url, setUrl] = useState(approved || (id ? cache[id] || "" : ""));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) {
      setUrl(approved || "");
      return;
    }
    const known = approved || cache[id];
    setUrl(known || "");
    // rejected images stay hidden; only unreviewed models trigger generation + review
    if (known || cache[id] === "" || fabric?.install_status === "rejected" || !fabric?.image) return;
    let alive = true;
    setLoading(true);
    pending[id] ||= api.functions
      .invoke("generateInstallImage", { model_id: id })
      .then((r) => {
        const data = (r as { data?: { install_image?: string } } | null)?.data;
        const generated = data?.install_image || "";
        cache[id] = generated;
        return generated;
      });
    pending[id].then((u) => alive && setUrl(u)).finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id, approved, fabric?.install_status, fabric?.image]);

  return { url, loading };
}
