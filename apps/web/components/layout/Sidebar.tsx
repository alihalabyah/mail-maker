'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LayoutTemplate, Puzzle, Key, Globe, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const navItems = [
  { href: '/templates', label: 'Templates', icon: LayoutTemplate },
  { href: '/components', label: 'Components', icon: Puzzle },
  { href: '/domains', label: 'Domains', icon: Globe },
  { href: '/settings/api-keys', label: 'API Keys', icon: Key },
];

export function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <aside
      className="flex flex-col w-56 min-h-screen shrink-0"
      style={{ backgroundColor: '#2E2F32' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="w-7 h-8 shrink-0 relative">
          <Image
            src="/qashio.svg"
            alt="Qashio"
            fill
            className="invert"
          />
        </div>
        <div className="leading-tight">
          <span className="block text-white text-sm font-semibold tracking-wide">
            Mail Maker
          </span>
          <span className="block text-xs" style={{ color: '#7d7e8b' }}>
            by Qashio
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'text-white'
                  : 'text-[#d1d2d7] hover:text-white',
              )}
              style={
                active
                  ? { backgroundColor: '#A7885A' }
                  : undefined
              }
              onMouseEnter={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = '#3a3b3f';
              }}
              onMouseLeave={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = '';
              }}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium transition-colors text-[#7d7e8b] hover:text-white"
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#3a3b3f'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = ''; }}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
