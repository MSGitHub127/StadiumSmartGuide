import {
  Navigation,
  LayoutDashboard,
  Settings2,
  Ticket,
  Truck,
  Utensils,
  HeartPulse,
  Bell,
  User,
  Settings,
  HelpCircle,
} from 'lucide-react';

const SIDEBAR_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', active: true },
  { icon: Settings2, label: 'Services' },
  { icon: Ticket, label: 'Tickets' },
  { icon: Truck, label: 'Transport' },
  { icon: Utensils, label: 'Food & Drinks' },
  { icon: HeartPulse, label: 'Safety' },
  { icon: Bell, label: 'Notifications' },
  { icon: User, label: 'Profile' },
  { icon: Settings, label: 'Settings' },
];

/**
 * Desktop-only primary navigation. Only "Dashboard" is a live route today;
 * the rest are interactive buttons that notify the user they are coming soon.
 */
export default function Sidebar(): JSX.Element {
  const handleClick = (label: string) => {
    // General Coming Soon Alert
    window.dispatchEvent(
      new CustomEvent('show-system-alert', {
        detail: { message: `${label} module is coming soon!` },
      })
    );
  };

  return (
    <aside className="w-64 hidden lg:flex flex-col gap-6 p-5 border-r border-slate-800/40 bg-slate-950/20">
      <div className="flex items-center gap-3 px-1">
        <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 shadow-lg shadow-cyan-500/20">
          <Navigation className="h-5 w-5 text-white" aria-hidden="true" />
        </div>
        <div>
          <h1 className="font-display text-base font-bold text-white tracking-wide leading-none">
            Stadium
          </h1>
          <p className="text-[11px] text-slate-400 tracking-wide mt-0.5">
            SmartGuide
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {SIDEBAR_ITEMS.map((item) => {
          const Icon = item.icon;
          if (item.active) {
            return (
              <button
                key={item.label}
                aria-current="page"
                className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_12px_rgba(6,182,212,0.1)]"
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </button>
            );
          }
          return (
            <button
              key={item.label}
              onClick={() => handleClick(item.label)}
              title={`${item.label} — coming soon`}
              className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 transition-all border border-transparent cursor-pointer"
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <button
        onClick={() => handleClick('Help & Support')}
        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 transition-all border border-transparent cursor-pointer"
      >
        <HelpCircle className="h-5 w-5" />
        Help & Support
      </button>
    </aside>
  );
}
