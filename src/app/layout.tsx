import type { Metadata, Viewport } from "next";
import { Providers } from "@/lib/providers";
import { vazirmatn } from "@/lib/fonts";
import "@/app/globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://antic-curtain.ir";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "پرده آنتیک | فروشگاه آنلاین پرده و آکسسوری",
    template: "%s | پرده آنتیک",
  },
  description: "پرده آنتیک - مرجع خرید پرده، رول، زبرا، رومن، پنل، شید، شناور و آکسسوری‌های پرده با کیفیت بالا و قیمت مناسب",
  keywords: ["پرده", "رول", "زبرا", "رومن", "پنل", "شید", "شناور", "آکسسوری پرده", "خرید آنلاین پرده"],
  authors: [{ name: "پرده آنتیک" }],
  creator: "پرده آنتیک",
  publisher: "پرده آنتیک",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "fa_IR",
    url: siteUrl,
    siteName: "پرده آنتیک",
    title: "پرده آنتیک | فروشگاه آنلاین پرده و آکسسوری",
    description: "مرجع خرید پرده، رول، زبرا، رومن، پنل، شید، شناور و آکسسوری‌های پرده",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "پرده آنتیک",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "پرده آنتیک",
    description: "مرجع خرید پرده و آکسسوری پرده",
    images: ["/og-image.jpg"],
  },
  verification: {
    google: "google-site-verification-code",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0B0B0B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl" className={`${vazirmatn.variable} scroll-smooth`} data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="bg-background text-foreground font-body antialiased min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}