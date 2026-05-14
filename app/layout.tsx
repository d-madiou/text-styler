import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PwaRegistration } from "./pwa-registration";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Text Styler",
  description:
    "Convert normal text into stylish Unicode bold text for Instagram, Facebook, WhatsApp, and Twitter/X.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],

    apple: [
      {
        url: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },

  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Text Styler",
  },

  openGraph: {
    title: "Text Styler",
    description:
      "Generate stylish Unicode text that keeps formatting everywhere.",
    siteName: "Text Styler",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Text Styler",
    description:
      "Generate stylish Unicode text that keeps formatting everywhere.",
  },
};

export const viewport: Viewport = {
  themeColor: "#dc2626",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-black">
        <PwaRegistration />
        {children}
      </body>
    </html>
  );
}
