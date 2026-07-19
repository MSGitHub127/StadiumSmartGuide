import { create } from 'zustand';
import type { SensorRecord } from '@/utils/csvParser';

interface SensorState {
  sensors: SensorRecord[] | null;
  error: string | null;
  loading: boolean;
  fetchSensors: () => Promise<void>;
  startPolling: () => () => void;
}

let intervalId: NodeJS.Timeout | null = null;
let activeListeners = 0;

export const useSensorStore = create<SensorState>((set) => {
  const fetchSensors = async () => {
    set({ loading: true });
    try {
      const res = await fetch('/api/crowd-analytics');
      if (!res.ok) throw new Error();
      const data = await res.json();
      set({
        sensors: data.sensors as SensorRecord[],
        error: null,
        loading: false,
      });
    } catch {
      set({
        error: 'Live occupancy data is temporarily unavailable.',
        loading: false,
      });
    }
  };

  return {
    sensors: null,
    error: null,
    loading: false,
    fetchSensors,
    startPolling: () => {
      activeListeners++;
      if (!intervalId) {
        void fetchSensors();
        intervalId = setInterval(() => void fetchSensors(), 15000);
      }
      return () => {
        activeListeners--;
        if (activeListeners <= 0 && intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      };
    },
  };
});
