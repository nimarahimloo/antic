"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import { useSmoothScroll } from "@/hooks/useSmoothScroll";
import { PWARegistration } from "@/components/PWARegistration";
import { WebMCPRegistration } from "@/components/WebMCPRegistration";

function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function AuthInitializer({ children }: { children: ReactNode }) {
  const { isLoadingAuth, isLoadingPublicSettings, authError, checkAppState } = useAuth();

  useEffect(() => {
    checkAppState();
  }, [checkAppState]);

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
    <QueryProvider>
      <AuthProvider>
        <CartProvider>
          <SmoothScrollProvider>
            <AuthInitializer>{children}</AuthInitializer>
            <PWARegistration />
            <WebMCPRegistration />
            <Toaster />
          </SmoothScrollProvider>
        </CartProvider>
      </AuthProvider>
    </QueryProvider>
  );
}