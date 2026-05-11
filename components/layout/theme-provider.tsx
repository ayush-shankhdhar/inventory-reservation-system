'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

/**
 * ThemeProvider
 * 
 * React 19 throws an explicit error warning when rendering inline scripts
 * which next-themes uses internally to prevent flash-of-unstyled-content.
 * 
 * To maintain absolute console cleanliness during development, we filter out 
 * this known false-positive React ecosystem warning.
 */
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Encountered a script tag while rendering React component')
    ) {
      return;
    }
    originalError.apply(console, args);
  };
}

export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
