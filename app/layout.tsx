import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/layout/sidebar';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { Toaster } from 'sonner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'StockReserve — Multi-Warehouse Inventory Platform',
  description:
    'Enterprise-grade inventory reservation system with concurrency-safe stock management across multiple warehouses.',
  keywords: ['inventory', 'reservation', 'warehouse', 'ecommerce', 'stock management'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 lg:pl-64">
              <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto">
                {children}
              </div>
            </main>
          </div>
          <Toaster
            position="bottom-right"
            toastOptions={{
              className: 'border border-border bg-card text-card-foreground',
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
