'use client';

import { Clock, Users } from 'lucide-react';
import type { SensorRecord } from '@/utils/csvParser';
import { useSensorPolling } from '@/hooks/useSensorPolling';

const BAND_DOT: Record<SensorRecord['congestion_band'], string> = {
  green: 'bg-emerald-400',
  amber: 'bg-amber-400',
  red: 'bg-rose-500',
};

const BAND_TIME_COLOR: Record<SensorRecord['congestion_band'], string> = {
  green: 'text-emerald-400',
  amber: 'text-amber-400',
  red: 'text-rose-400',
};

export default function QueueTracker(): JSX.Element {
  const { sensors, error } = useSensorPolling();

  return (
    <section
      aria-label="Amenity queue wait times"
      className="glass-premium rounded-2xl p-5 relative overflow-hidden h-full flex flex-col"
    >
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
      {/* Header */}
      <div className="mb-3 mt-0.5">
        <h2 className="font-display text-sm font-bold text-white uppercase tracking-widest">
          Live Queue Tracker
        </h2>
        <p className="text-xs text-slate-350 mt-0.5">Real-time wait times</p>
      </div>

      {error && (
        <p role="alert" className="text-xs text-amber-400 mb-3 px-1">
          {error}
        </p>
      )}

      {!sensors && !error && (
        <ul
          className="space-y-2 flex-1 min-h-0 overflow-y-auto"
          aria-label="Loading queue data"
        >
          {[1, 2, 3].map((i) => (
            <li
              key={i}
              className="animate-pulse h-10 rounded-lg bg-slate-800/40"
            />
          ))}
        </ul>
      )}

      {sensors && (
        <ul className="space-y-2 flex-1 min-h-0 overflow-y-auto pr-1">
          {sensors.map((s) => {
            const waitMin = Math.round(s.average_wait_seconds / 60);
            const zoneName = s.zone_id.replace('ZONE-', '').replace(/-/g, ' ');

            return (
              <li
                key={s.zone_id}
                className="py-2 px-2.5 rounded-xl hover:bg-slate-800/30 transition-all border border-transparent hover:border-slate-800/60"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${BAND_DOT[s.congestion_band]} shadow-[0_0_8px_currentColor]`}
                      style={{
                        color:
                          s.congestion_band === 'green'
                            ? '#34d399'
                            : s.congestion_band === 'amber'
                              ? '#fbbf24'
                              : '#f43f5e',
                      }}
                    />
                    <div>
                      <p className="text-xs font-semibold text-slate-200">
                        {zoneName}
                      </p>
                      <p className="text-[10px] text-slate-500">Concourse L1</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold ${BAND_TIME_COLOR[s.congestion_band]}`}
                    >
                      {waitMin} min
                    </span>
                    <Users
                      className={`h-3 w-3 ${BAND_TIME_COLOR[s.congestion_band]}`}
                      aria-hidden="true"
                    />
                  </div>
                </div>
                {/* Visual horizontal congestion bar */}
                <div className="w-full h-1 bg-slate-800/80 rounded-full mt-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${
                      s.congestion_band === 'green'
                        ? 'from-emerald-500 to-teal-450 animate-pulse'
                        : s.congestion_band === 'amber'
                          ? 'from-amber-500 to-orange-450'
                          : 'from-rose-500 to-red-500'
                    }`}
                    style={{
                      width:
                        s.congestion_band === 'green'
                          ? '25%'
                          : s.congestion_band === 'amber'
                            ? '60%'
                            : '90%',
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
