"use client";

import { ReactNode } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import BottomTabBar from "@/components/BottomTabBar";
import CustomerAssistant from "@/components/agent/CustomerAssistant";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <Footer />
      <CartDrawer />
      <BottomTabBar />
      <CustomerAssistant />
    </div>
  );
}