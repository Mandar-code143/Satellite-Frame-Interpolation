import React from 'react';
import { Link, useLocation } from 'wouter';
import { Activity, Database, LayoutGrid, BarChart2, Satellite } from 'lucide-react';
import { useHealthCheck } from '@workspace/api-client-react';

export function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: health } = useHealthCheck({ query: { refetchInterval: 10000, queryKey: ['healthz'] } });

  const navItems = [
    { href: '/', label: 'Command Center', icon: Satellite },
    { href: '/inspect', label: 'Dataset Inspector', icon: Database },
    { href: '/workspace', label: 'Interpolation', icon: LayoutGrid },
    { href: '/results', label: 'Telemetry & Validation', icon: BarChart2 },
  ];

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col font-sans dark">
      {/* Header */}
      <header className="h-16 border-b border-white/10 bg-card/50 backdrop-blur-md flex items-center justify-between px-6 z-50 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/50 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
            <Satellite className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg leading-tight tracking-wider text-white">ISRO<span className="text-primary font-light"> // SAT-INTERP</span></h1>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {health ? (
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
              <span className={`h-2 w-2 rounded-full ${health.status === 'ok' ? 'bg-green-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse' : 'bg-red-500'}`} />
              SYS {health?.status?.toUpperCase() || "UNKNOWN"}
              <span className="opacity-50 mx-1">|</span>
              V{health.version}
            </div>
          ) : (
             <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
              <Activity className="h-3 w-3 animate-spin" />
              CONNECTING...
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-white/10 bg-card/30 backdrop-blur-sm hidden md:flex flex-col">
          <nav className="flex-1 py-6 px-3 space-y-2">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 group ${isActive ? 'bg-primary/10 text-primary border border-primary/20 shadow-[inset_0_0_20px_rgba(6,182,212,0.1)]' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}>
                  <item.icon className={`h-4 w-4 ${isActive ? 'text-primary' : 'group-hover:text-foreground'}`} />
                  <span className="font-display text-sm font-medium tracking-wide uppercase">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          
          <div className="p-4 border-t border-white/10 text-xs text-muted-foreground font-mono">
            <p>TERMINAL READY_</p>
            <p className="opacity-50 mt-1">Awaiting command input.</p>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background relative">
           {/* Grid Pattern Overlay */}
           <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgwek0zOSAzOWgtMzhWMWgzOHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+')] pointer-events-none opacity-50" />
           <div className="relative z-10 p-6 md:p-8 h-full">
            {children}
           </div>
        </main>
      </div>
    </div>
  );
}
