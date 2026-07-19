'use client';

import { useEffect, useState } from 'react';
import { MapIcon, Plus, Minus, Crosshair } from 'lucide-react';
import type { SensorRecord } from '@/utils/csvParser';
import { useSensorPolling } from '@/hooks/useSensorPolling';

interface LiveMapProps {
  activePath?: string[];
}

const ZONE_BLOCKS: {
  zoneId: string;
  cx: number;
  cy: number;
  label: string;
  sublabel: string;
}[] = [
  {
    zoneId: 'ZONE-GATE-3',
    cx: 350,
    cy: 435,
    label: 'Gate 3',
    sublabel: 'Main Entrance',
  },
  {
    zoneId: 'ZONE-GATE-7',
    cx: 350,
    cy: 45,
    label: 'Gate 7',
    sublabel: 'North Entrance',
  },
  {
    zoneId: 'ZONE-CONCOURSE-N',
    cx: 580,
    cy: 160,
    label: 'Concourse N',
    sublabel: 'Level 1',
  },
  {
    zoneId: 'ZONE-CONCOURSE-S',
    cx: 120,
    cy: 320,
    label: 'Concourse S',
    sublabel: 'Level 1',
  },
  {
    zoneId: 'ZONE-ELEVATOR-A2',
    cx: 130,
    cy: 140,
    label: 'Elevator A2',
    sublabel: 'All Levels',
  },
  {
    zoneId: 'ZONE-CONCESSION-02',
    cx: 575,
    cy: 330,
    label: 'Concession 02',
    sublabel: 'Level 2',
  },
];

const BAND_COLORS: Record<
  SensorRecord['congestion_band'],
  { dot: string; glow: string; text: string }
> = {
  green: { dot: '#22d3ee', glow: 'rgba(34,211,238,0.4)', text: '#67e8f9' },
  amber: { dot: '#fbbf24', glow: 'rgba(251,191,36,0.4)', text: '#fcd34d' },
  red: { dot: '#f43f5e', glow: 'rgba(244,63,94,0.4)', text: '#fda4af' },
};

const SEGMENT_PATHS: Record<string, { x: number; y: number }[]> = {
  // Gate 3 <-> Concourse N (Right side)
  'ZONE-GATE-3_ZONE-CONCOURSE-N': [
    { x: 350, y: 435 },
    { x: 500, y: 350 },
    { x: 580, y: 160 },
  ],
  'ZONE-CONCOURSE-N_ZONE-GATE-3': [
    { x: 580, y: 160 },
    { x: 500, y: 350 },
    { x: 350, y: 435 },
  ],

  // Gate 3 <-> Concourse S (Left side)
  'ZONE-GATE-3_ZONE-CONCOURSE-S': [
    { x: 350, y: 435 },
    { x: 200, y: 380 },
    { x: 120, y: 320 },
  ],
  'ZONE-CONCOURSE-S_ZONE-GATE-3': [
    { x: 120, y: 320 },
    { x: 200, y: 380 },
    { x: 350, y: 435 },
  ],

  // Concourse N <-> Concourse S (Bottom loop)
  'ZONE-CONCOURSE-N_ZONE-CONCOURSE-S': [
    { x: 580, y: 160 },
    { x: 520, y: 320 },
    { x: 350, y: 410 },
    { x: 180, y: 320 },
    { x: 120, y: 320 },
  ],
  'ZONE-CONCOURSE-S_ZONE-CONCOURSE-N': [
    { x: 120, y: 320 },
    { x: 180, y: 320 },
    { x: 350, y: 410 },
    { x: 520, y: 320 },
    { x: 580, y: 160 },
  ],

  // Gate 7 <-> Concourse S (Top-Left side)
  'ZONE-GATE-7_ZONE-CONCOURSE-S': [
    { x: 350, y: 45 },
    { x: 200, y: 100 },
    { x: 120, y: 320 },
  ],
  'ZONE-CONCOURSE-S_ZONE-GATE-7': [
    { x: 120, y: 320 },
    { x: 200, y: 100 },
    { x: 350, y: 45 },
  ],

  // Gate 7 <-> Concourse N (Top-Right side)
  'ZONE-GATE-7_ZONE-CONCOURSE-N': [
    { x: 350, y: 45 },
    { x: 500, y: 100 },
    { x: 580, y: 160 },
  ],
  'ZONE-CONCOURSE-N_ZONE-GATE-7': [
    { x: 580, y: 160 },
    { x: 500, y: 100 },
    { x: 350, y: 45 },
  ],

  // Concourse N <-> Concession-02 (Right down)
  'ZONE-CONCOURSE-N_ZONE-CONCESSION-02': [
    { x: 580, y: 160 },
    { x: 600, y: 250 },
    { x: 575, y: 330 },
  ],
  'ZONE-CONCESSION-02_ZONE-CONCOURSE-N': [
    { x: 575, y: 330 },
    { x: 600, y: 250 },
    { x: 580, y: 160 },
  ],

  // Concourse S <-> Concession-02 (Bottom concourse traversal)
  'ZONE-CONCOURSE-S_ZONE-CONCESSION-02': [
    { x: 120, y: 320 },
    { x: 350, y: 415 },
    { x: 575, y: 330 },
  ],
  'ZONE-CONCESSION-02_ZONE-CONCOURSE-S': [
    { x: 575, y: 330 },
    { x: 350, y: 415 },
    { x: 120, y: 320 },
  ],

  // Gate 3 <-> Gate 7 (Outer perimeter loop around left side)
  'ZONE-GATE-3_ZONE-GATE-7': [
    { x: 350, y: 435 },
    { x: 150, y: 350 },
    { x: 100, y: 240 },
    { x: 150, y: 130 },
    { x: 350, y: 45 },
  ],
  'ZONE-GATE-7_ZONE-GATE-3': [
    { x: 350, y: 45 },
    { x: 150, y: 130 },
    { x: 100, y: 240 },
    { x: 150, y: 350 },
    { x: 350, y: 435 },
  ],
  // Elevator A2 <-> Gate 7
  'ZONE-ELEVATOR-A2_ZONE-GATE-7': [
    { x: 130, y: 140 },
    { x: 200, y: 100 },
    { x: 350, y: 45 },
  ],
  'ZONE-GATE-7_ZONE-ELEVATOR-A2': [
    { x: 350, y: 45 },
    { x: 200, y: 100 },
    { x: 130, y: 140 },
  ],

  // Elevator A2 <-> Concourse S
  'ZONE-ELEVATOR-A2_ZONE-CONCOURSE-S': [
    { x: 130, y: 140 },
    { x: 120, y: 220 },
    { x: 120, y: 320 },
  ],
  'ZONE-CONCOURSE-S_ZONE-ELEVATOR-A2': [
    { x: 120, y: 320 },
    { x: 120, y: 220 },
    { x: 130, y: 140 },
  ],

  // Gate 3 <-> Concession 02
  'ZONE-GATE-3_ZONE-CONCESSION-02': [
    { x: 350, y: 435 },
    { x: 500, y: 400 },
    { x: 575, y: 330 },
  ],
  'ZONE-CONCESSION-02_ZONE-GATE-3': [
    { x: 575, y: 330 },
    { x: 500, y: 400 },
    { x: 350, y: 435 },
  ],
};

const LEGEND_ITEMS = [
  { color: '#22d3ee', label: 'Restrooms' },
  { color: '#f59e0b', label: 'Food & Drinks' },
  { color: '#ef4444', label: 'First Aid' },
  { color: '#3b82f6', label: 'Info Desk' },
  { color: '#a78bfa', label: 'Accessible' },
  { color: '#6ee7b7', label: 'Escalator' },
];

/* Simulated physical locations of amenities in the stadium coordinate space */
const AMENITY_LOCATIONS: Record<string, { x: number; y: number }[]> = {
  Restrooms: [
    { x: 260, y: 110 },
    { x: 440, y: 110 },
    { x: 350, y: 90 },
  ],
  'Food & Drinks': [
    { x: 190, y: 310 },
    { x: 510, y: 310 },
    { x: 350, y: 390 },
  ],
  'First Aid': [
    { x: 110, y: 220 },
    { x: 590, y: 220 },
  ],
  'Info Desk': [{ x: 350, y: 460 }],
  Accessible: [
    { x: 130, y: 140 },
    { x: 570, y: 140 },
  ],
  Escalator: [
    { x: 180, y: 80 },
    { x: 520, y: 80 },
    { x: 180, y: 400 },
    { x: 520, y: 400 },
  ],
};

function AmenityCallout({
  x,
  y,
  title,
  sub,
}: {
  x: number;
  y: number;
  title: string;
  sub: string;
}): JSX.Element {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width="135"
        height="38"
        rx="8"
        fill="rgba(15,23,42,0.95)"
        stroke="rgba(6,182,212,0.5)"
        strokeWidth="1"
      />
      <circle
        cx={x + 14}
        cy={y + 13}
        r="3"
        fill="#f43f5e"
        filter="url(#dotGlow)"
      />
      <text
        x={x + 22}
        y={y + 17}
        fill="white"
        fontSize="11"
        fontWeight="700"
        fontFamily="var(--font-inter), sans-serif"
      >
        {title}
      </text>
      <text
        x={x + 14}
        y={y + 29}
        fill="#cbd5e1"
        fontSize="9"
        fontWeight="500"
        fontFamily="var(--font-inter), sans-serif"
      >
        {sub}
      </text>
    </g>
  );
}

export default function LiveMap({
  activePath = [],
}: LiveMapProps): JSX.Element {
  const { sensors, error } = useSensorPolling();

  // Interactive view states matching user controls
  const [zoom, setZoom] = useState(1);
  const [activeLevel, setActiveLevel] = useState('L1');
  const [highlightedAmenity, setHighlightedAmenity] = useState<string | null>(
    null
  );

  // Listen for amenity highlight events from outer Quick Actions
  useEffect(() => {
    function handleHighlight(e: Event) {
      const type = (e as CustomEvent).detail?.type ?? null;
      setHighlightedAmenity(type);
    }
    window.addEventListener('highlight-amenity', handleHighlight);
    return () =>
      window.removeEventListener('highlight-amenity', handleHighlight);
  }, []);

  const sensorFor = (zoneId: string): SensorRecord | undefined =>
    sensors?.find((s) => s.zone_id === zoneId);

  // Determine if a zone should be active based on current level filter
  const isZoneOnLevel = (zoneId: string): boolean => {
    if (zoneId === 'ZONE-ELEVATOR-A2') return true; // Elevator serves all floors
    if (activeLevel === 'G') return zoneId.includes('GATE');
    if (activeLevel === 'L1') return zoneId.includes('CONCOURSE');
    if (activeLevel === 'L2') return zoneId.includes('CONCESSION');
    return false; // L3 upper deck has no zones in this demo set
  };

  const getViewBox = (): string => {
    if (zoom === 3) return '180 120 340 240';
    if (zoom === 2) return '90 60 520 360';
    return '0 35 700 435';
  };

  const getPolylinePoints = (): string => {
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < activePath.length - 1; i++) {
      const fromZone = activePath[i];
      const toZone = activePath[i + 1];
      if (!fromZone || !toZone) continue;

      const key = `${fromZone}_${toZone}`;
      const pathPoints = SEGMENT_PATHS[key];

      if (pathPoints) {
        pathPoints.forEach((pt) => {
          const lastPt = points[points.length - 1];
          if (!lastPt || lastPt.x !== pt.x || lastPt.y !== pt.y) {
            points.push(pt);
          }
        });
      } else {
        const z1 = ZONE_BLOCKS.find((b) => b.zoneId === fromZone);
        const z2 = ZONE_BLOCKS.find((b) => b.zoneId === toZone);
        if (z1 && z2) {
          points.push({ x: z1.cx, y: z1.cy });
          points.push({ x: z2.cx, y: z2.cy });
        }
      }
    }
    return points.map((p) => `${p.x},${p.y}`).join(' ');
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z + 1, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 1, 1));
  const handleLocateReset = () => {
    setZoom(1);
    setActiveLevel('L1');
    setHighlightedAmenity(null);
  };

  return (
    <section
      aria-label="Live stadium map with real-time congestion overlay"
      className="glass-premium rounded-2xl p-5 h-full flex flex-col relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500" />
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-display text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
            <MapIcon className="h-4 w-4 text-cyan-400" aria-hidden="true" />
            Digital Twin Live Map
          </h2>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
            <p className="text-[10px] text-slate-400">
              Real-time stadium status & navigation
            </p>
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-xs text-amber-400 mb-3 px-1">
          {error}
        </p>
      )}

      {!sensors && !error && (
        <div
          className="animate-pulse rounded-xl bg-slate-800/40 h-72 w-full flex-1"
          role="status"
          aria-label="Loading live map data"
        />
      )}

      {sensors && (
        <div className="flex-1 flex flex-col relative">
          {/* Level indicators — left side */}
          <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-1.5">
            {['L3', 'L2', 'L1', 'G'].map((level) => (
              <button
                key={level}
                aria-label={`Level ${level}`}
                aria-pressed={level === activeLevel}
                onClick={() => setActiveLevel(level)}
                className={`w-8 h-7 rounded-lg text-[10px] font-bold border transition-all ${
                  level === activeLevel
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                    : 'bg-slate-800/60 border-slate-700/40 text-slate-400 hover:text-slate-300 hover:border-slate-600'
                }`}
              >
                {level}
              </button>
            ))}
          </div>

          {/* Zoom controls — right side */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-1.5">
            <button
              aria-label="Zoom in"
              onClick={handleZoomIn}
              className="w-8 h-8 rounded-lg bg-slate-800/60 border border-slate-700/40 text-slate-400 hover:text-white hover:border-slate-600 flex items-center justify-center transition-all"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              aria-label="Zoom out"
              onClick={handleZoomOut}
              className="w-8 h-8 rounded-lg bg-slate-800/60 border border-slate-700/40 text-slate-400 hover:text-white hover:border-slate-600 flex items-center justify-center transition-all"
            >
              <Minus className="h-4 w-4" />
            </button>
          </div>

          {/* Locate button — bottom right */}
          <div className="absolute right-2 bottom-14 z-10">
            <button
              aria-label="Find my location"
              onClick={handleLocateReset}
              className="w-8 h-8 rounded-lg bg-slate-800/60 border border-slate-700/40 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40 flex items-center justify-center transition-all"
            >
              <Crosshair className="h-4 w-4" />
            </button>
          </div>

          <svg
            viewBox={getViewBox()}
            role="img"
            aria-label="Stadium block layout with congestion heatmap"
            className="w-full h-full min-h-0 transition-all duration-500 ease-in-out"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur
                  in="SourceGraphic"
                  stdDeviation="4"
                  result="blur"
                />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter
                id="dotGlow"
                x="-100%"
                y="-100%"
                width="300%"
                height="300%"
              >
                <feGaussianBlur
                  in="SourceGraphic"
                  stdDeviation="3"
                  result="blur"
                />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="bigGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur
                  in="SourceGraphic"
                  stdDeviation="8"
                  result="blur"
                />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient
                id="pitchGrad"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#064e3b" />
                <stop offset="100%" stopColor="#065f46" />
              </linearGradient>
              <linearGradient id="laserGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ec4899" />
                <stop offset="50%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
              <radialGradient id="stadiumCenter" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(6,182,212,0.05)" />
                <stop offset="100%" stopColor="rgba(6,182,212,0)" />
              </radialGradient>
            </defs>

            {/* Stadium concentric ovals (seating tiers) */}
            <ellipse
              cx="350"
              cy="240"
              rx="320"
              ry="210"
              fill="none"
              stroke="rgba(6,182,212,0.06)"
              strokeWidth="1.5"
            />
            <ellipse
              cx="350"
              cy="240"
              rx="290"
              ry="190"
              fill="none"
              stroke="rgba(6,182,212,0.08)"
              strokeWidth="1"
              strokeDasharray="4 3"
            />
            <ellipse
              cx="350"
              cy="240"
              rx="255"
              ry="168"
              fill="none"
              stroke="rgba(6,182,212,0.10)"
              strokeWidth="1"
              strokeDasharray="3 2"
            />
            <ellipse
              cx="350"
              cy="240"
              rx="220"
              ry="145"
              fill="none"
              stroke="rgba(6,182,212,0.14)"
              strokeWidth="1.2"
            />
            <ellipse
              cx="350"
              cy="240"
              rx="185"
              ry="120"
              fill="url(#stadiumCenter)"
              stroke="rgba(6,182,212,0.18)"
              strokeWidth="1"
            />

            {/* Seating section dividers */}
            {Array.from({ length: 16 }).map((_, i) => {
              const angle = ((i * 360) / 16) * (Math.PI / 180);
              const x1 = 350 + 185 * Math.cos(angle);
              const y1 = 240 + 120 * Math.sin(angle);
              const x2 = 350 + 290 * Math.cos(angle);
              const y2 = 240 + 190 * Math.sin(angle);
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="rgba(6,182,212,0.05)"
                  strokeWidth="0.5"
                />
              );
            })}

            {/* Soccer pitch */}
            <g>
              <rect
                x="245"
                y="175"
                width="210"
                height="130"
                rx="4"
                fill="url(#pitchGrad)"
                opacity="0.6"
              />
              <rect
                x="245"
                y="175"
                width="210"
                height="130"
                rx="4"
                fill="none"
                stroke="rgba(255,255,255,0.25)"
                strokeWidth="0.8"
              />
              <line
                x1="350"
                y1="175"
                x2="350"
                y2="305"
                stroke="rgba(255,255,255,0.25)"
                strokeWidth="0.7"
              />
              <circle
                cx="350"
                cy="240"
                r="22"
                fill="none"
                stroke="rgba(255,255,255,0.25)"
                strokeWidth="0.7"
              />
              <circle cx="350" cy="240" r="1.5" fill="rgba(255,255,255,0.35)" />
              <rect
                x="245"
                y="205"
                width="38"
                height="70"
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="0.7"
                rx="1"
              />
              <rect
                x="245"
                y="218"
                width="16"
                height="44"
                fill="none"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="0.7"
                rx="1"
              />
              <rect
                x="417"
                y="205"
                width="38"
                height="70"
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="0.7"
                rx="1"
              />
              <rect
                x="439"
                y="218"
                width="16"
                height="44"
                fill="none"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="0.7"
                rx="1"
              />
              <path
                d="M 283 218 Q 296 240 283 262"
                fill="none"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="0.7"
              />
              <path
                d="M 417 218 Q 404 240 417 262"
                fill="none"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="0.7"
              />
            </g>

            {/* Static pathway arcs */}
            <path
              d="M 350 435 Q 180 380 120 320"
              fill="none"
              stroke="rgba(6,182,212,0.12)"
              strokeWidth="1"
              strokeDasharray="6 4"
            />
            <path
              d="M 120 320 Q 80 240 130 140"
              fill="none"
              stroke="rgba(6,182,212,0.12)"
              strokeWidth="1"
              strokeDasharray="6 4"
            />
            <path
              d="M 130 140 Q 200 60 350 45"
              fill="none"
              stroke="rgba(6,182,212,0.12)"
              strokeWidth="1"
              strokeDasharray="6 4"
            />
            <path
              d="M 350 45 Q 500 60 580 160"
              fill="none"
              stroke="rgba(6,182,212,0.12)"
              strokeWidth="1"
              strokeDasharray="6 4"
            />
            <path
              d="M 580 160 Q 620 240 575 330"
              fill="none"
              stroke="rgba(6,182,212,0.12)"
              strokeWidth="1"
              strokeDasharray="6 4"
            />
            <path
              d="M 575 330 Q 520 380 350 435"
              fill="none"
              stroke="rgba(6,182,212,0.12)"
              strokeWidth="1"
              strokeDasharray="6 4"
            />

            {/* Zone markers */}
            {ZONE_BLOCKS.map((zone) => {
              const sensor = sensorFor(zone.zoneId);
              const band = sensor?.congestion_band ?? 'green';
              const colors = BAND_COLORS[band];
              const pct = sensor ? Math.round(sensor.occupancy_ratio * 100) : 0;
              const active = isZoneOnLevel(zone.zoneId);

              return (
                <g
                  key={zone.zoneId}
                  opacity={active ? 1.0 : 0.2}
                  className="transition-opacity duration-300"
                >
                  <circle
                    cx={zone.cx}
                    cy={zone.cy}
                    r="18"
                    fill="none"
                    stroke={colors.glow}
                    strokeWidth="1"
                    filter="url(#dotGlow)"
                  />
                  <circle
                    cx={zone.cx}
                    cy={zone.cy}
                    r="8"
                    fill={colors.dot}
                    opacity="0.3"
                  />
                  <circle
                    cx={zone.cx}
                    cy={zone.cy}
                    r="4"
                    fill={colors.dot}
                    filter="url(#dotGlow)"
                  />

                  <rect
                    x={zone.cx + 14}
                    y={zone.cy - 18}
                    width={Math.max(zone.label.length * 7.5, 80)}
                    height="38"
                    rx="6"
                    fill="rgba(15,23,42,0.92)"
                    stroke="rgba(255,255,255,0.12)"
                    strokeWidth="1"
                  />
                  <text
                    x={zone.cx + 22}
                    y={zone.cy - 4}
                    fill="white"
                    fontSize="10.5"
                    fontWeight="700"
                    fontFamily="var(--font-inter), sans-serif"
                  >
                    {zone.label}
                  </text>
                  <text
                    x={zone.cx + 22}
                    y={zone.cy + 10}
                    fill={colors.text}
                    fontSize="9.5"
                    fontWeight="700"
                    fontFamily="var(--font-inter), sans-serif"
                  >
                    {zone.sublabel} · {pct}%
                  </text>
                </g>
              );
            })}

            {/* Dynamic Highlighted Amenities */}
            {highlightedAmenity && AMENITY_LOCATIONS[highlightedAmenity] && (
              <g>
                {AMENITY_LOCATIONS[highlightedAmenity].map((loc, idx) => {
                  const color =
                    LEGEND_ITEMS.find((i) => i.label === highlightedAmenity)
                      ?.color ?? '#22d3ee';
                  return (
                    <g key={idx}>
                      {/* Multi-layered smooth SVG ripple rings */}
                      <circle
                        cx={loc.x}
                        cy={loc.y}
                        r="5"
                        fill="none"
                        stroke={color}
                        strokeWidth="1.5"
                        opacity="0"
                      >
                        <animate
                          attributeName="r"
                          values="5;28"
                          dur="2s"
                          begin="0s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="opacity"
                          values="0.8;0"
                          dur="2s"
                          begin="0s"
                          repeatCount="indefinite"
                        />
                      </circle>
                      <circle
                        cx={loc.x}
                        cy={loc.y}
                        r="5"
                        fill="none"
                        stroke={color}
                        strokeWidth="1.5"
                        opacity="0"
                      >
                        <animate
                          attributeName="r"
                          values="5;28"
                          dur="2s"
                          begin="0.66s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="opacity"
                          values="0.8;0"
                          dur="2s"
                          begin="0.66s"
                          repeatCount="indefinite"
                        />
                      </circle>
                      <circle
                        cx={loc.x}
                        cy={loc.y}
                        r="5"
                        fill="none"
                        stroke={color}
                        strokeWidth="1.5"
                        opacity="0"
                      >
                        <animate
                          attributeName="r"
                          values="5;28"
                          dur="2s"
                          begin="1.33s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="opacity"
                          values="0.8;0"
                          dur="2s"
                          begin="1.33s"
                          repeatCount="indefinite"
                        />
                      </circle>
                      {/* Center Dot */}
                      <circle
                        cx={loc.x}
                        cy={loc.y}
                        r="5.5"
                        fill={color}
                        filter="url(#dotGlow)"
                      />
                      {/* Text callout with respective color font */}
                      <text
                        x={loc.x}
                        y={loc.y - 12}
                        textAnchor="middle"
                        fill={color}
                        fontSize="8.5"
                        fontWeight="700"
                        fontFamily="var(--font-inter), sans-serif"
                      >
                        {highlightedAmenity}
                      </text>
                    </g>
                  );
                })}
              </g>
            )}

            {/* Amenity callout popups */}
            <AmenityCallout
              x={470}
              y={100}
              title="Restroom 04"
              sub="Concourse L1"
            />

            {/* "You are here" marker — Gate 3 */}
            <g>
              <circle
                cx="350"
                cy="435"
                r="12"
                fill="rgba(6,182,212,0.15)"
                stroke="rgba(6,182,212,0.5)"
                strokeWidth="1.5"
                filter="url(#bigGlow)"
              />
              <circle cx="350" cy="435" r="5" fill="#22d3ee" />
              <rect
                x="290"
                y="448"
                width="120"
                height="24"
                rx="6"
                fill="rgba(15,23,42,0.92)"
                stroke="rgba(6,182,212,0.4)"
                strokeWidth="1"
              />
              <text
                x="310"
                y="464"
                fill="white"
                fontSize="9"
                fontWeight="700"
                fontFamily="var(--font-inter), sans-serif"
              >
                You are here
              </text>
              <text
                x="390"
                y="464"
                fill="#67e8f9"
                fontSize="9"
                fontFamily="var(--font-inter), sans-serif"
              >
                Gate 3
              </text>
            </g>

            {/* Active route laser line */}
            {activePath.length > 1 && (
              <polyline
                points={getPolylinePoints()}
                fill="none"
                stroke="url(#laserGrad)"
                strokeWidth={3}
                strokeDasharray="12 6"
                strokeLinecap="round"
                filter="url(#glow)"
                className="animate-dash"
              />
            )}
          </svg>

          {/* Amenity legend */}
          <div className="flex items-center justify-center gap-4 flex-wrap pt-3 border-t border-slate-800/40 mt-2">
            {LEGEND_ITEMS.map((item) => (
              <button
                key={item.label}
                aria-label={`Highlight ${item.label}`}
                onClick={() =>
                  setHighlightedAmenity(
                    highlightedAmenity === item.label ? null : item.label
                  )
                }
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all ${
                  highlightedAmenity === item.label
                    ? 'bg-cyan-500/10 border-cyan-500/30'
                    : 'border-transparent hover:bg-slate-800/30'
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[10px] text-slate-400 font-medium">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
