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
  <link rel="preload" href="/table-texture.svg" as="image" />
  <link rel="preload" href="/globe.svg" as="image" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <a href="#main-content" className="skip-link">Перейти к основному содержимому</a>
        <script dangerouslySetInnerHTML={{ __html: `(()=>{try{var t=localStorage.getItem('durak_theme_mode')||'system';var m=t==='system'? (matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):t;document.documentElement.dataset.theme=m;}catch{}})();` }} />
  <script dangerouslySetInnerHTML={{ __html: `if(window.requestIdleCallback){requestIdleCallback(()=>{['card','defend','take','bito','win','ambient','illegal','translate'].forEach(n=>{var l=document.createElement('link');l.rel='prefetch';l.as='audio';l.href='/sounds/'+n+'.mp3';document.head.appendChild(l);});});}` }} />
  <script dangerouslySetInnerHTML={{ __html: `(()=>{function log(m,v){(window.__durak_perf_logs||(window.__durak_perf_logs=[])).push({m,v,t:Date.now()}); if(console&&console.info) console.info('[perf]',m,v);} if('PerformanceObserver'in window){try{const vitals=['largest-contentful-paint','layout-shift','first-input'];const po=new PerformanceObserver(list=>{list.getEntries().forEach(e=>{if(e.entryType==='largest-contentful-paint') log('LCP',Math.round(e.startTime)); if(e.entryType==='layout-shift'&&!e.hadRecentInput&&e.value>0) log('CLS+',e.value.toFixed(4)); if(e.entryType==='first-input') log('FID',Math.round(e.processingStart-e.startTime));});});po.observe({type:'largest-contentful-paint', buffered:true});po.observe({type:'layout-shift', buffered:true});po.observe({type:'first-input', buffered:true});}catch{}}})();` }} />
        <ErrorBoundary>
          <SettingsProvider>
            <main id="main-content" tabIndex={-1}>{children}</main>
          </SettingsProvider>
        </ErrorBoundary>
  <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>{setTimeout(()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}),1500);});}` }} />
  <script dangerouslySetInnerHTML={{ __html: `window.__durak_perf_marks=[];performance.mark('app_hydration_start');document.addEventListener('DOMContentLoaded',()=>performance.mark('dom_content_loaded'));` }} />
      </body>
    </html>
  );
}
