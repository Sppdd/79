"use client";

import { Clapperboard, Palette, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Create", icon: Sparkles },
  { href: "/projects", label: "Reels", icon: Clapperboard },
  { href: "/brand", label: "Brand", icon: Palette },
];

export function TabBar() {
  const path = usePathname();
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-separator bg-bar backdrop-blur-xl backdrop-saturate-150">
      <ul className="mx-auto flex max-w-md">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href) || (href === "/projects" && path.startsWith("/project/"));
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[10px] font-medium ${active ? "text-tint" : "text-secondary"}`}
              >
                <Icon size={24} strokeWidth={active ? 2.2 : 1.8} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
