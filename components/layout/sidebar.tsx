'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  Warehouse,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/utils';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Reservations', href: '/reservations', icon: ClipboardList },
];

function NavContent({ 
  pathname, 
  setMobileOpen 
}: { 
  pathname: string; 
  setMobileOpen: (o: boolean) => void 
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Warehouse className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight">StockReserve</h1>
          <p className="text-[11px] text-sidebar-muted-foreground">Inventory Platform</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-sidebar-border">
        <p className="text-[11px] text-sidebar-muted-foreground">
          Enterprise Inventory v1.0
        </p>
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-sidebar border-r border-sidebar-border z-40">
        <NavContent pathname={pathname} setMobileOpen={setMobileOpen} />
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden sticky top-0 z-50 flex items-center gap-3 bg-sidebar border-b border-sidebar-border px-4 py-3">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded-md hover:bg-sidebar-accent"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Warehouse className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold">StockReserve</span>
        </div>
      </div>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-40 bg-black/50"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border"
            >
              <NavContent pathname={pathname} setMobileOpen={setMobileOpen} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
