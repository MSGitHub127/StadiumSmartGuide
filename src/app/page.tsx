'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  MapPin,
  MessageCircle,
  Navigation,
  Thermometer,
  Users,
  ArrowRight,
  Clock,
  Cloud,
  Settings2,
  CircleDot,
  LayoutDashboard,
  Map as MapIcon,
  Ticket,
  Truck,
  Utensils,
  HeartPulse,
  Bell,
  User,
  Settings,
  HelpCircle,
  Briefcase,
  Droplets,
  PhoneCall,
  ShieldAlert,
  Home,
  Radio,
  ChevronDown,
} from 'lucide-react';
import LiveMap from '@/components/LiveMap';
import ChatConcierge from '@/components/ChatConcierge';
import QueueTracker from '@/components/QueueTracker';
import type { SensorRecord } from '@/utils/csvParser';

type MobileTab = 'map' | 'settings' | 'assistant';

const PLANNER_OPTIONS = [
  { value: 'ZONE-GATE-3', label: 'Gate 3 (Main Entrance)' },
  { value: 'ZONE-GATE-7', label: 'Gate 7 (North Entrance)' },
  { value: 'ZONE-CONCOURSE-N', label: 'Concourse N (Level 1)' },
  { value: 'ZONE-CONCOURSE-S', label: 'Concourse S (Level 1)' },
  { value: 'ZONE-ELEVATOR-A2', label: 'Elevator A2 (All Levels)' },
  { value: 'ZONE-CONCESSION-02', label: 'Concession 02 (Level 2)' },
  { value: 'AMN-RESTROOM-04', label: 'Restroom 04 (Concourse L1)' },
  { value: 'AMN-ELEVATOR-01', label: 'Elevator 01' },
];

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

export default function FanDashboard(): JSX.Element {
  const [origin, setOrigin] = useState('ZONE-GATE-3');
  const [destination, setDestination] = useState('AMN-RESTROOM-04');
  const [wheelchairRouting, setWheelchairRouting] = useState(false);
  const [audioAssistance, setAudioAssistance] = useState(false);
  const [activePath, setActivePath] = useState<string[]>([]);
  const [routing, setRouting] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>('map');
  const [sensors, setSensors] = useState<SensorRecord[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: 'alert' | 'prompt';
    message: string;
    inputValue: string;
    onConfirm?: (value: string) => void;
  }>({
    isOpen: false,
    type: 'alert',
    message: '',
    inputValue: '',
  });

  const showAlert = (msg: string) => {
    setModal({
      isOpen: true,
      type: 'alert',
      message: msg,
      inputValue: '',
    });
  };

  const showPrompt = (msg: string, onConfirm: (val: string) => void) => {
    setModal({
      isOpen: true,
      type: 'prompt',
      message: msg,
      inputValue: '',
      onConfirm,
    });
  };

  // Fetch sensors on load to compute dynamic ETA stats
  useEffect(() => {
    fetch('/api/crowd-analytics')
      .then((res) => res.json())
      .then((data) => setSensors(data.sensors ?? []))
      .catch(() => {});
  }, []);

  async function handleFindRoute(): Promise<void> {
    setRouting(true);
    setRouteError(null);
    try {
      const res = await fetch('/api/navigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originZoneId: origin,
          destinationAmenityId: destination,
          accessibilityRequired: wheelchairRouting,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Routing failed.');
      }
      const data = await res.json();
      const path: string[] = Array.isArray(data.path) ? data.path : [];
      setActivePath(path);

      if (
        audioAssistance &&
        path.length > 0 &&
        typeof window !== 'undefined' &&
        window.speechSynthesis
      ) {
        let totalSeconds = Math.max(path.length - 1, 0) * 120; // 2 minutes walking per segment (1.2 m/s avg walking speed)
        path.forEach((zoneId) => {
          const sensor = sensors.find((s) => s.zone_id === zoneId);
          if (sensor) totalSeconds += sensor.average_wait_seconds;
        });
        const minutes = Math.max(Math.round(totalSeconds / 60), 3);
        const distance = (path.length * 0.15).toFixed(1);
        const text = `Route calculated. Estimated travel time is ${minutes} minutes, total distance is ${distance} kilometers.`;
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      setRouteError(
        err instanceof Error ? err.message : 'Unable to compute route.'
      );
    } finally {
      setRouting(false);
    }
  }

  // Dynamic calculations for path stats
  const getRouteDetails = () => {
    if (!activePath || activePath.length === 0) return null;
    let totalSeconds = Math.max(activePath.length - 1, 0) * 120; // 2 minutes walking per segment
    activePath.forEach((zoneId) => {
      const sensor = sensors.find((s) => s.zone_id === zoneId);
      if (sensor) {
        totalSeconds += sensor.average_wait_seconds;
      }
    });
    const totalMinutes = Math.max(Math.round(totalSeconds / 60), 3);
    const distance = (activePath.length * 0.15).toFixed(1);
    return {
      eta: `${totalMinutes} min`,
      distance: `${distance} km`,
    };
  };

  const routeDetails = getRouteDetails();

  const LeftSidebar = (
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
          return (
            <button
              key={item.label}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                item.active
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_12px_rgba(6,182,212,0.1)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 border border-transparent'
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <button className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 transition-all border border-transparent">
        <HelpCircle className="h-5 w-5" />
        Help & Support
      </button>
    </aside>
  );

  const ControlSidebar = (
    <div className="glass-premium rounded-2xl p-5 space-y-5 h-full relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500 via-indigo-500 to-rose-500" />
      <div className="flex items-center gap-2 mt-0.5">
        <CircleDot className="h-5 w-5 text-cyan-400" aria-hidden="true" />
        <h2 className="font-display text-sm font-bold text-white uppercase tracking-widest">
          Trip Planner
        </h2>
      </div>

      <div className="relative space-y-0 text-slate-200">
        <div>
          <label
            htmlFor="origin"
            className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-widest"
          >
            From
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
            <select
              id="origin"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className="w-full rounded-xl bg-slate-800/60 border border-slate-700/50 pl-9 pr-10 py-3 text-sm text-white font-medium focus-visible:outline-none focus-visible:border-cyan-500/50 focus-visible:ring-1 focus-visible:ring-cyan-500/20 transition-colors appearance-none cursor-pointer"
            >
              {PLANNER_OPTIONS.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  className="bg-slate-900 text-white"
                >
                  {opt.label}
                </option>
              ))}
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <ChevronDown
                className="h-4 w-4 text-slate-500"
                aria-hidden="true"
              />
            </span>
          </div>
        </div>

        <div className="flex items-center justify-start pl-[18px] py-0.5">
          <div className="w-px h-6 border-l-2 border-dashed border-slate-600" />
        </div>

        <div>
          <label
            htmlFor="destination"
            className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-widest"
          >
            To
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2">
              <MapPin className="h-4 w-4 text-rose-400" aria-hidden="true" />
            </span>
            <select
              id="destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full rounded-xl bg-slate-800/60 border border-slate-700/50 pl-9 pr-10 py-3 text-sm text-white font-medium focus-visible:outline-none focus-visible:border-cyan-500/50 focus-visible:ring-1 focus-visible:ring-cyan-500/20 transition-colors appearance-none cursor-pointer"
            >
              {PLANNER_OPTIONS.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  className="bg-slate-900 text-white"
                >
                  {opt.label}
                </option>
              ))}
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <ChevronDown
                className="h-4 w-4 text-slate-500"
                aria-hidden="true"
              />
            </span>
          </div>
        </div>
      </div>

      {/* Accessibility Toggles */}
      <div className="space-y-3.5 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users
              className="h-4.5 w-4.5 text-emerald-400"
              aria-hidden="true"
            />
            <span className="text-xs font-semibold text-slate-300">
              Wheelchair Routing
            </span>
          </div>
          <button
            role="switch"
            aria-checked={wheelchairRouting}
            onClick={() => setWheelchairRouting(!wheelchairRouting)}
            className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-300 ${
              wheelchairRouting
                ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform duration-300 ${
                wheelchairRouting ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="h-4.5 w-4.5 text-cyan-400" aria-hidden="true" />
            <span className="text-xs font-semibold text-slate-300">
              Audio Assistance
            </span>
          </div>
          <button
            role="switch"
            aria-checked={audioAssistance}
            onClick={() => setAudioAssistance(!audioAssistance)}
            className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-300 ${
              audioAssistance
                ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform duration-300 ${
                audioAssistance ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      <button
        onClick={() => void handleFindRoute()}
        disabled={routing}
        className="w-full rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white py-3.5 text-sm font-bold uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-cyan-500/20 transition-all duration-300 active:scale-[0.98]"
      >
        {routing ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Computing…
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            FIND BEST ROUTE
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
      </button>
      <p className="text-[10px] text-slate-400 text-center -mt-2">
        Get fastest & most accessible route
      </p>

      {routeError && (
        <p role="alert" className="text-xs text-rose-400 px-1">
          {routeError}
        </p>
      )}

      {routeDetails && (
        <div className="glass-premium rounded-xl p-4 space-y-1 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500 to-blue-500" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              Estimated Time
            </div>
          </div>
          <p className="text-2xl font-bold text-white">
            {routeDetails.eta}{' '}
            <span className="text-sm font-normal text-slate-500">
              ({routeDetails.distance})
            </span>
          </p>
          <p className="text-[11px] text-slate-400">via Concourse Level 1</p>
          <p className="text-[11px] text-emerald-400 font-medium">
            Light foot traffic
          </p>
        </div>
      )}
    </div>
  );

  return (
    <main
      id="main-content"
      className="h-screen max-h-screen overflow-hidden flex flex-col bg-[#020617]"
    >
      {/* Header */}
      <header className="px-5 py-3 glass-panel border-x-0 border-t-0 flex items-center justify-between relative z-50">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.jpg"
            alt="Stadium SmartGuide Logo"
            width={40}
            height={40}
            className="rounded-xl shadow-lg shadow-cyan-500/20 object-cover"
          />
          <div>
            <h1 className="font-display text-lg font-bold text-white tracking-wide leading-none">
              Stadium SmartGuide
            </h1>
            <p className="text-xs text-slate-350 tracking-wide mt-1">
              FIFA World Cup 2026
            </p>
          </div>
        </div>

        {/* Global Safety Alert & Quick Actions Row */}
        <div className="hidden md:flex items-center gap-3">
          {/* Safety Alert Pill */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] animate-pulse">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Stay hydrated. Stations nearby.</span>
          </div>

          {/* Quick Actions (Mini Icon Row) */}
          <div className="flex items-center gap-1 bg-slate-900/60 border border-slate-700/30 rounded-xl p-1">
            {[
              {
                id: 'sos',
                icon: PhoneCall,
                label: 'Emergency Call',
                color: 'text-rose-450 hover:bg-rose-500/15 hover:text-rose-350',
                action: () =>
                  showAlert('SOS: Emergency services dispatched to Gate 3.'),
              },
              {
                id: 'report',
                icon: HelpCircle,
                label: 'Report Issue',
                color:
                  'text-amber-450 hover:bg-amber-500/15 hover:text-amber-350',
                action: () => {
                  showPrompt('What issue would you like to report?', (res) => {
                    showAlert('Thank you for reporting: ' + res);
                  });
                },
              },
              {
                id: 'lost',
                icon: Briefcase,
                label: 'Lost & Found',
                color:
                  'text-purple-450 hover:bg-purple-500/15 hover:text-purple-350',
                action: () => showAlert('Lost & Found catalog loaded.'),
              },
              {
                id: 'water',
                icon: Droplets,
                label: 'Hydration Points',
                color: 'text-cyan-400 hover:bg-cyan-500/15 hover:text-cyan-350',
                action: () => {
                  window.dispatchEvent(
                    new CustomEvent('highlight-amenity', {
                      detail: { type: 'Food & Drinks' },
                    })
                  );
                },
              },
              {
                id: 'prayer',
                icon: Home,
                label: 'Prayer Rooms',
                color:
                  'text-emerald-450 hover:bg-emerald-500/15 hover:text-emerald-350',
                action: () => {
                  window.dispatchEvent(
                    new CustomEvent('highlight-amenity', {
                      detail: { type: 'Info Desk' },
                    })
                  );
                },
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  title={item.label}
                  className={`p-1.5 rounded-lg border border-transparent transition-all flex items-center justify-center ${item.color}`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* LIVE pill */}
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-emerald-600/80 to-green-600/80 border border-emerald-500/40">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            <span className="text-[11px] font-bold text-white uppercase tracking-wider">
              Live
            </span>
            <span className="text-[10px] text-emerald-200 hidden lg:inline">
              Stadium Operational
            </span>
          </div>

          {/* Stat badges */}
          <div className="hidden md:flex glass-panel rounded-xl px-3.5 py-2 items-center gap-2">
            <Thermometer
              className="h-4 w-4 text-amber-400"
              aria-hidden="true"
            />
            <div>
              <p className="text-xs font-bold text-white leading-none">21°C</p>
              <p className="text-[9px] text-slate-400 leading-none mt-0.5">
                Clear Sky
              </p>
            </div>
          </div>
          <div className="hidden md:flex glass-panel rounded-xl px-3.5 py-2 items-center gap-2">
            <Cloud className="h-4 w-4 text-cyan-400" aria-hidden="true" />
            <div>
              <p className="text-xs font-bold text-white leading-none">
                Moderate
              </p>
              <p className="text-[9px] text-slate-400 leading-none mt-0.5">
                Crowd Level
              </p>
            </div>
          </div>
          <div className="hidden md:flex glass-panel rounded-xl px-3.5 py-2 items-center gap-2">
            <Users className="h-4 w-4 text-indigo-400" aria-hidden="true" />
            <div>
              <p className="text-xs font-bold text-white leading-none">127K</p>
              <p className="text-[9px] text-slate-400 leading-none mt-0.5">
                Fans Inside
              </p>
            </div>
          </div>

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              aria-label="Notifications"
              className="relative h-10 w-10 rounded-xl glass-panel border flex items-center justify-center text-slate-350 hover:text-white transition-all"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 text-[9px] font-bold text-white flex items-center justify-center border border-[#020617]">
                3
              </span>
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-64 bg-[#0f172a] border border-slate-800 rounded-xl p-3 shadow-2xl z-50 space-y-2 text-xs">
                <p className="font-bold text-white border-b border-slate-800 pb-1">
                  Safety & Live Alerts
                </p>
                <ul className="space-y-1.5 text-slate-300">
                  <li className="p-1 rounded bg-rose-500/10 border-l-2 border-rose-500 text-[10px]">
                    <span className="font-semibold text-rose-300">
                      Congestion Alert:
                    </span>{' '}
                    Zone Gate 3 is heavily congested. Use alternate paths.
                  </li>
                  <li className="p-1 rounded bg-emerald-500/10 border-l-2 border-emerald-500 text-[10px]">
                    <span className="font-semibold text-emerald-300">
                      Info:
                    </span>{' '}
                    Concourse Level 1 transit route is clear.
                  </li>
                  <li className="p-1 rounded bg-blue-500/10 border-l-2 border-blue-500 text-[10px]">
                    <span className="font-semibold text-blue-300">
                      Hydration:
                    </span>{' '}
                    12 water refilling points are fully active nearby.
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Dashboard Panels */}
      <div className="p-4 flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1 min-h-0">
          <div className="md:col-span-1 h-full min-h-0">{ControlSidebar}</div>
          <div className="md:col-span-2 h-full min-h-0">
            <LiveMap activePath={activePath} />
          </div>
          <div className="md:col-span-1 flex flex-col gap-4 h-full min-h-0">
            <div className="flex-1 min-h-0">
              <ChatConcierge />
            </div>
            <div className="flex-1 min-h-0">
              <QueueTracker />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav
        aria-label="Primary navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 glass-panel border-x-0 border-b-0 flex justify-around py-2.5 z-30"
      >
        {[
          { tab: 'settings' as MobileTab, icon: Settings2, label: 'Settings' },
          { tab: 'map' as MobileTab, icon: MapPin, label: 'Map' },
          {
            tab: 'assistant' as MobileTab,
            icon: MessageCircle,
            label: 'Assistant',
          },
        ].map(({ tab, icon: Icon, label }) => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            aria-current={mobileTab === tab ? 'page' : undefined}
            className={`flex flex-col items-center gap-1 px-5 py-1 text-xs rounded-lg transition-all duration-200 ${
              mobileTab === tab
                ? 'text-cyan-400 bg-cyan-500/10'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            {label}
          </button>
        ))}
      </nav>

      {/* Custom Premium In-App Modal Dialog */}
      {modal.isOpen && (
        <div className="fixed inset-0 bg-[#020617]/80 backdrop-blur-sm flex items-center justify-center z-[9999]">
          <div className="glass-premium rounded-2xl p-6 w-full max-w-md mx-4 relative border border-slate-700/50 shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-3">
              System Notification
            </h3>
            <p className="text-sm text-slate-350 leading-relaxed mb-5">
              {modal.message}
            </p>

            {modal.type === 'prompt' && (
              <input
                type="text"
                value={modal.inputValue}
                onChange={(e) =>
                  setModal((prev) => ({ ...prev, inputValue: e.target.value }))
                }
                placeholder="Type details here..."
                className="w-full rounded-xl bg-slate-800/60 border border-slate-700/50 px-4 py-3 text-sm text-white placeholder-slate-500 mb-5 focus-visible:outline-none focus-visible:border-cyan-500/50 focus-visible:ring-1 focus-visible:ring-cyan-500/20 transition-colors"
                autoFocus
              />
            )}

            <div className="flex items-center justify-end gap-3">
              {modal.type === 'prompt' && (
                <button
                  onClick={() =>
                    setModal((prev) => ({ ...prev, isOpen: false }))
                  }
                  className="px-4 py-2.5 rounded-xl border border-slate-700/60 text-slate-400 text-xs font-semibold hover:bg-slate-800 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={() => {
                  setModal((prev) => ({ ...prev, isOpen: false }));
                  if (modal.onConfirm) {
                    modal.onConfirm(modal.inputValue);
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold hover:shadow-lg hover:shadow-cyan-500/10 transition-all"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
