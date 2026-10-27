import type { Metadata, Viewport } from "next";
import { Figtree, Shrikhand } from "next/font/google";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-body",
  subsets: ["latin"],
});

// Sign-painter display face — reserved for the wordmark, big numbers, and
// headlines so it stays special.
const shrikhand = Shrikhand({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Charla — Practice Spanish with Sofía",
  description: "Voice-based Spanish conversation practice with an AI tutor.",
  appleWebApp: {
    capable: true,
    title: "Charla",
    statusBarStyle: "black-translucent",
  },
  other: {
    // Next only emits the modern unprefixed `mobile-web-app-capable` tag
    // for `appleWebApp.capable` — add the Apple-prefixed one explicitly too,
    // since iOS Safari's home-screen full-screen behavior has historically
    // depended on this exact tag.
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff5f2" },
    { media: "(prefers-color-scheme: dark)", color: "#150c2b" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${figtree.variable} ${shrikhand.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
