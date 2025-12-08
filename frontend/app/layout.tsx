import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LoadingProvider } from "@/contexts/LoadingContext";
import SplashScreen from "@/components/loading/SplashScreen";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SECORA - AI-Powered Security Scanner",
  description: "Next-generation vulnerability scanner powered by advanced AI. Detect, analyze, and remediate security threats in real-time.",
  keywords: ["security", "vulnerability scanner", "AI", "cybersecurity", "penetration testing"],
  authors: [{ name: "SECORA Security" }],
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
  openGraph: {
    title: "SECORA - AI-Powered Security Scanner",
    description: "Next-generation vulnerability scanner powered by advanced AI",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico?v=2" sizes="any" />
        <link rel="shortcut icon" href="/favicon.ico?v=2" />
        <link rel="apple-touch-icon" href="/favicon.ico?v=2" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950`}
      >
        <LoadingProvider>
          <SplashScreen />
          {children}
        </LoadingProvider>
      </body>
    </html>
  );
}
