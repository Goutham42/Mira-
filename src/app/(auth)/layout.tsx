import Link from 'next/link';

import { siteConfig } from '@/config/site';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Link href="/" className="font-display text-2xl tracking-tight">
            {siteConfig.name}
          </Link>
        </div>
      </header>

      <main id="main" className="flex flex-1 items-center justify-center px-4 py-14">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
