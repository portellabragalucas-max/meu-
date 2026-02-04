/**
 * Root Layout
 * Provides the main app structure with sidebar and responsive design
 */

import type { Metadata } from 'next';
import './globals.css';
import AuthProvider from '@/components/providers/AuthProvider';

export const metadata: Metadata = {
  title: 'Nexora - AI Study Optimization',
  description: 'Transform your learning with AI-powered study planning, smart scheduling, and gamified progress tracking.',
  keywords: ['study', 'learning', 'AI', 'productivity', 'education', 'planning'],
  authors: [{ name: 'Nexora Team' }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="font-body antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
