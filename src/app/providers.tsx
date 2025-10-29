'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@/lib/theme-provider';
import { ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <ThemeProvider defaultTheme="system">{children}</ThemeProvider>
    </SessionProvider>
  );
}

