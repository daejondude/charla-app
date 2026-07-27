import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Baloo_2 } from "next/font/google";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const baloo = Baloo_2({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
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
    { media: "(prefers-color-scheme: light)", color: "#fff7ee" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1310" },
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
      className={`${geistSans.variable} ${geistMono.variable} ${baloo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
