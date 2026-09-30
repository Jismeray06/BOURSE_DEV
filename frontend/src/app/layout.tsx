import type { Metadata, Viewport } from "next";
import { Playfair_Display } from "next/font/google";
import "./globals.css";
import { PlatformThemeProvider } from "../components/PlatformThemeProvider";
import ServiceWorkerRegistration from "../components/ServiceWorkerRegistration";

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: "Université de Mahajanga — Portail d'inscription",
  description: "Plateforme numérique d'inscription académique.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
    apple: "/icon-192.svg",
  },
  appleWebApp: {
    capable: true,
    title: "Université de Mahajanga",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b3b60",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`h-full antialiased ${playfairDisplay.variable}`}>
      <body className="min-h-full flex flex-col">
        <ServiceWorkerRegistration />
        <PlatformThemeProvider>{children}</PlatformThemeProvider>
      </body>
    </html>
  );
}
