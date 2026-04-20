import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

export const metadata: Metadata = {
  title: 'STARTGRUZ - Грузчики и переезды',
  description: 'Находите лучших грузчиков в вашем городе за пару кликов. Расчет цены онлайн.',
  manifest: '/manifest.json',
  icons: {
    icon: '/images/icon-192.png',
    apple: '/images/icon-192.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className="dark">
      <head>
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="STARTGRUZ" />
        <link rel="apple-touch-icon" href="/images/icon-192.png" />
      </head>
      <body className={`${inter.className} bg-slate-950 text-slate-50 antialiased`}>
        {children}
      </body>
    </html>
  );
}
