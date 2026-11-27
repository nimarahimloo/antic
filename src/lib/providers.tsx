"use client";

import { ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import { useSmoothScroll } from "@/hooks/useSmoothScroll";
import { PWARegistration } from "@/components/PWARegistration";
import { WebMCPRegistration } from "@/components/WebMCPRegistration";

function AuthInitializer({ children }: { children: ReactNode }) {
  const { isLoadingAuth, isLoadingPublicSettings } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}

function SmoothScrollProvider({ children }: { children: ReactNode }) {
  useSmoothScroll();
  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <SmoothScrollProvider>
        <AuthInitializer>{children}</AuthInitializer>
        <PWARegistration />
        <WebMCPRegistration />
        <Toaster />
      </SmoothScrollProvider>
    </AuthProvider>
  );
}
