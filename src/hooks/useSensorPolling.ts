import { useEffect } from 'react';
import { useSensorStore } from '@/store/sensorStore';

export function useSensorPolling() {
  const sensors = useSensorStore((state) => state.sensors);
  const error = useSensorStore((state) => state.error);
  const loading = useSensorStore((state) => state.loading);
  const startPolling = useSensorStore((state) => state.startPolling);

  useEffect(() => {
    const stop = startPolling();
    return () => stop();
  }, [startPolling]);

  return { sensors, error, loading };
}
