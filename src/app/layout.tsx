import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Scheduler - Multi-Venue Scheduling System',
  description:
    'A comprehensive scheduling system for multi-venue operations with role-based permissions and shift management.',
  openGraph: {
    title: 'Scheduler - Multi-Venue Scheduling System',
    description:
      'A comprehensive scheduling system for multi-venue operations with role-based permissions and shift management.',
    images: [
      {
        url: 'https://jschedules.com/mobile-preview.png',
        width: 1200,
        height: 630,
        alt: 'Multi-Venue Scheduling Made Simple',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Scheduler - Multi-Venue Scheduling System',
    description:
      'A comprehensive scheduling system for multi-venue operations with role-based permissions and shift management.',
    images: ['https://jschedules.com/mobile-preview.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
