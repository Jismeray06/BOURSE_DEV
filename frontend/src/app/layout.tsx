import type { Metadata, Viewport } from "next";
import { Dancing_Script, Playfair_Display } from "next/font/google";
import "./globals.css";
import { PlatformThemeProvider } from "../components/PlatformThemeProvider";
import { TopLoadingBar } from "../components/TopLoadingBar";

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-heading",
});

const dancingScript = Dancing_Script({
  subsets: ["latin"],
  variable: "--font-script",
});

export const metadata: Metadata = {
  title: "Université de Mahajanga — Demande de bourse nationale",
  description: "Plateforme de dématérialisation des demandes de bourse nationale de l'Université de Mahajanga.",
  icons: {
    icon: [
      { url: "/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
    apple: "/icon-192.svg",
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
    <html lang="fr" className={`h-full antialiased ${playfairDisplay.variable} ${dancingScript.variable}`}>
      <body className="min-h-full flex flex-col">
        <TopLoadingBar />
        <PlatformThemeProvider>{children}</PlatformThemeProvider>
      </body>
    </html>
  );
}
