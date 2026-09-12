import type { Metadata } from 'next';
import Link from 'next/link';

import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { requireStaffPage } from '@/server/auth/session';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: { default: 'Admin', template: `%s | ${siteConfig.name} Admin` },
  // The admin area must never appear in an index, at any depth.
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Middleware rewrites non-staff away from /admin, but that is a convenience.
  // This runs on every request, and each admin service re-checks its own
  // permission before touching the database.
  const user = await requireStaffPage('/admin');

  return (
    <div className="flex min-h-dvh flex-col bg-surface-muted/30">
      <header className="border-b bg-surface">
        <div className="flex h-14 items-center gap-4 px-4 sm:px-6">
          <Link href="/admin" className="font-display text-xl">
            {siteConfig.name}
            <span className="ml-2 align-middle text-[0.625rem] uppercase tracking-widest text-muted-foreground">
              Admin
            </span>
          </Link>

          <p className="ml-auto truncate text-xs text-muted-foreground">
            {user.email} · {user.role}
          </p>
        </div>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        <aside className="border-b bg-surface p-4 lg:w-56 lg:shrink-0 lg:border-b-0 lg:border-r">
          <AdminSidebar />
        </aside>

        <main id="main" className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
