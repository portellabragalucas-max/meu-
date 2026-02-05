/**
 * Root Layout
 * Provides the main app structure with sidebar and responsive design
 */

import type { Metadata, Viewport } from 'next';
import './globals.css';
import AuthProvider from '@/components/providers/AuthProvider';
import PWARegister from '@/components/PWARegister';

export const metadata: Metadata = {
  title: 'Nexora - AI Study Optimization',
  description: 'Transform your learning with AI-powered study planning, smart scheduling, and gamified progress tracking.',
  keywords: ['study', 'learning', 'AI', 'productivity', 'education', 'planning'],
  authors: [{ name: 'Nexora Team' }],
  themeColor: '#05080F',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
          {children}
          <PWARegister />
        </AuthProvider>
      </body>
    </html>
  );
}
