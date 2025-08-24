import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ErrorBoundary } from '../../ui/components/ErrorBoundary';
import { SettingsProvider } from '../../ui/context/SettingsContext';

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
  manifest: '/manifest.json'
};

export const viewport: Viewport = {
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
  {/* Google Fonts preconnects (удаляют ESLint warning) */}
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Preload fonts */}
        <link
          rel="preload"
          href="https://fonts.gstatic.com/s/geist/v1/Geist-Variable.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="https://fonts.gstatic.com/s/geistmono/v1/GeistMono-Variable.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <a href="#main-content" className="skip-link">Перейти к основному содержимому</a>
        <script dangerouslySetInnerHTML={{ __html: `(()=>{try{var t=localStorage.getItem('durak_theme_mode')||'system';var m=t==='system'? (matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):t;document.documentElement.dataset.theme=m;}catch{}})();` }} />
        <ErrorBoundary>
          <SettingsProvider>
            <main id="main-content" tabIndex={-1}>{children}</main>
          </SettingsProvider>
        </ErrorBoundary>
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(()=>{});});}` }} />
      </body>
    </html>
  );
}
