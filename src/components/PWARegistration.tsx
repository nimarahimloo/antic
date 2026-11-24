"use client";

import { useEffect, useState } from "react";

export function PWARegistration() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Skip Service Worker registration in development mode
    // next-pwa with disable: true should prevent SW generation, but we add extra guard
    if (process.env.NODE_ENV === "development") {
      console.log("[PWA] Skipping SW registration in development mode");
    } else if ("serviceWorker" in navigator) {
      const registerSW = async () => {
        // First check if sw.js exists to avoid 404 errors
        try {
          const check = await fetch("/sw.js", { method: "HEAD", cache: "no-cache" });
          if (!check.ok) {
            console.log("[PWA] sw.js not found, skipping registration");
            return;
          }
        } catch {
          console.log("[PWA] Failed to check sw.js, skipping registration");
          return;
        }

        try {
          const registration = await navigator.serviceWorker.register("/sw.js", {
            scope: "/",
          });
          
          console.log("[PWA] Service Worker registered:", registration.scope);
          
          // Check for updates periodically
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000); // Every hour
          
          // Listen for controller change (new SW activated)
          let refreshing = false;
          navigator.serviceWorker.addEventListener("controllerchange", () => {
            if (refreshing) return;
            refreshing = true;
            window.location.reload();
          });
        } catch (error) {
          console.error("[PWA] Service Worker registration failed:", error);
        }
      };
      
      registerSW();
    }

    // Handle install prompt
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
      console.log("[PWA] App installed");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return false;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      console.log("[PWA] User accepted install");
      setIsInstallable(false);
      setDeferredPrompt(null);
      return true;
    } else {
      console.log("[PWA] User dismissed install");
      return false;
    }
  };

  // Return null - this component doesn't render anything visible
  // It handles registration in the background
  return null;
}

// Type for beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}