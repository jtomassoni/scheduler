import { ReactNode, MouseEvent } from 'react';

interface PremiumLayoutProps {
  children: ReactNode;
  className?: string;
}

export function PremiumLayout({
  children,
  className = '',
}: PremiumLayoutProps) {
  return (
    <div
      className={`min-h-screen relative overflow-hidden bg-background dark:bg-[#0a0a0a] ${className}`}
    >
      {/* Animated background gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -right-40 w-96 h-96 bg-purple-500/10 dark:bg-purple-500/10 rounded-full blur-3xl opacity-30 dark:opacity-50"></div>
        <div className="absolute bottom-1/4 -left-40 w-96 h-96 bg-blue-500/10 dark:bg-blue-500/10 rounded-full blur-3xl opacity-30 dark:opacity-50"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/5 dark:bg-cyan-500/5 rounded-full blur-3xl opacity-20 dark:opacity-30"></div>
      </div>

      {/* Subtle grid pattern */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(0,0,0,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,.02)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30 pointer-events-none"></div>

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

interface PremiumCardProps {
  children: ReactNode;
  className?: string;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
  onMouseEnter?: (e: MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (e: MouseEvent<HTMLDivElement>) => void;
}

export function PremiumCard({
  children,
  className = '',
  onClick,
  onMouseEnter,
  onMouseLeave,
}: PremiumCardProps) {
  return (
    <div
      className={`relative ${className}`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Glow effect behind card */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-cyan-600/20 rounded-xl blur opacity-30 dark:opacity-50 group-hover:opacity-50 dark:group-hover:opacity-70 transition duration-1000 pointer-events-none"></div>

      <div
        className="relative bg-muted/80 dark:bg-gray-900/60 backdrop-blur-xl border border-border dark:border-gray-800/50 rounded-xl shadow-2xl h-full flex flex-col"
        style={{ zIndex: 1 }}
      >
        {children}
      </div>
    </div>
  );
}
