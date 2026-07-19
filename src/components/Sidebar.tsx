import {
  Navigation,
  LayoutDashboard,
  Map as MapIcon,
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
  { icon: MapIcon, label: 'Map' },
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
 * the rest are visibly disabled (rather than clickable no-ops) until their
 * destination pages exist, so the UI never promises navigation it can't do.
 */
export default function Sidebar(): JSX.Element {
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
          // Not a real button: these destinations don't exist yet, so they're
          // rendered as inert placeholders rather than controls that look
          // clickable but perform no action for mouse, keyboard, or screen-
          // reader users alike.
          return (
            <div
              key={item.label}
              aria-hidden="true"
              title={`${item.label} — coming soon`}
              className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 border border-transparent cursor-not-allowed select-none"
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </div>
          );
        })}
      </nav>

      <button className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 transition-all border border-transparent">
        <HelpCircle className="h-5 w-5" />
        Help & Support
      </button>
    </aside>
  );
}
