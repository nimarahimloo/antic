"use client";

import { useState, useEffect } from "react";
import { Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

interface PWAInstallButtonProps {
  className?: string;
  variant?: "default" | "outline" | "ghost";
  showLabel?: boolean;
}

export function PWAInstallButton({ 
  className, 
  variant = "default",
  showLabel = true 
}: PWAInstallButtonProps) {
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const isIOSStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    
    if (isStandalone || isIOSStandalone) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt || isLoading) return;
    
    setIsLoading(true);
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === "accepted") {
        setIsInstallable(false);
        setDeferredPrompt(null);
        setIsInstalled(true);
      }
    } catch (error) {
      console.error("[PWA] Install failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render if already installed or not installable
  if (isInstalled || !isInstallable) return null;

  const baseStyles = "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";
  
  const variants = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    ghost: "hover:bg-accent hover:text-accent-foreground",
  };

  return (
    <button
      type="button"
      onClick={handleInstall}
      disabled={isLoading}
      className={cn(baseStyles, variants[variant], className)}
      aria-label="نصب اپلیکیشن پرده آنتیک"
    >
      <Smartphone className="h-4 w-4" aria-hidden="true" />
      {showLabel && <span>نصب اپلیکیشن</span>}
      {isLoading && <span className="animate-spin">⏳</span>}
    </button>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}