"use client";

import { ReactNode } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import BottomTabBar from "@/components/BottomTabBar";
import CustomerAssistant from "@/components/agent/CustomerAssistant";

// Feature flag: Cart functionality is disabled, only contact via phone is available
const CART_ENABLED = false;

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background overflow-x-hidden">
      <Header />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <Footer />
      {CART_ENABLED && <CartDrawer />}
      <BottomTabBar />
      <CustomerAssistant />
    </div>
  );
}