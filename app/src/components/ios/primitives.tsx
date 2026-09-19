// Small iOS-style building blocks shared by every screen.
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export function LargeTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="pt-safe px-4">
      <div className="flex items-end justify-between pt-12 pb-2">
        <div>
          <h1 className="text-[34px] leading-tight font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="text-[15px] text-secondary">{subtitle}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}

export function NavBar({ back, title, action }: { back: { href: string; label: string }; title?: string; action?: ReactNode }) {
  return (
    <header className="pt-safe sticky top-0 z-30 border-b border-separator bg-bar backdrop-blur-xl backdrop-saturate-150">
      <div className="relative flex h-11 items-center justify-between px-2">
        <Link href={back.href} className="flex items-center text-[17px] text-tint">
          <ChevronLeft size={28} strokeWidth={2.4} />
          {back.label}
        </Link>
        {title && <span className="absolute left-1/2 max-w-[55%] -translate-x-1/2 truncate text-[17px] font-semibold">{title}</span>}
        <div className="pr-2">{action}</div>
      </div>
    </header>
  );
}

/** Inset grouped section, like iOS Settings. */
export function Group({ header, footer, children }: { header?: string; footer?: string; children: ReactNode }) {
  return (
    <section className="px-4 py-3">
      {header && <h2 className="px-4 pb-1.5 text-[13px] text-secondary uppercase">{header}</h2>}
      <div className="divide-y divide-separator overflow-hidden rounded-xl bg-card">{children}</div>
      {footer && <p className="px-4 pt-1.5 text-[13px] text-secondary">{footer}</p>}
    </section>
  );
}

export function PrimaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="flex h-[50px] w-full items-center justify-center gap-2 rounded-[14px] bg-tint text-[17px] font-semibold text-white transition active:scale-[0.98] active:opacity-80 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function Pill({ tone, children }: { tone: "blue" | "green" | "red" | "gray" | "orange"; children: ReactNode }) {
  const tones = {
    blue: "bg-tint/15 text-tint",
    green: "bg-ios-green/15 text-ios-green",
    red: "bg-ios-red/15 text-ios-red",
    orange: "bg-ios-orange/15 text-ios-orange",
    gray: "bg-fill text-secondary",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[12px] font-semibold ${tones[tone]}`}>{children}</span>;
}
