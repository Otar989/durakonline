import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ErrorBoundary } from '../../ui/components/ErrorBoundary';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Durak Online",
  description: "Подкидной / переводной Дурак онлайн и офлайн с ботом и анимациями",
  manifest: '/manifest.json',
  themeColor: '#0b0f14'
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
  <meta name="theme-color" content="#0b0f14" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(()=>{});});}` }} />
      </body>
    </html>
  );
}
