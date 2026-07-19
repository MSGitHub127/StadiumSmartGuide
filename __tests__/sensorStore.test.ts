import { useSensorStore } from '../src/store/sensorStore';
import type { SensorRecord } from '../src/utils/csvParser';

const MOCK_SENSORS: SensorRecord[] = [
  {
    timestamp: '2026-07-19T14:00:00Z',
    zone_id: 'ZONE-GATE-3',
    current_occupancy_count: 50,
    max_safe_capacity: 100,
    average_wait_seconds: 120,
    occupancy_ratio: 0.5,
    congestion_band: 'amber',
  },
  {
    timestamp: '2026-07-19T14:00:00Z',
    zone_id: 'ZONE-CONCOURSE-S',
    current_occupancy_count: 20,
    max_safe_capacity: 100,
    average_wait_seconds: 45,
    occupancy_ratio: 0.2,
    congestion_band: 'green',
  },
];

describe('sensorStore', () => {
  beforeEach(() => {
    // Reset Zustand store state between tests
    useSensorStore.setState({
      sensors: null,
      error: null,
      loading: false,
    });
    jest.restoreAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // --- fetchSensors success ---
  test('fetchSensors populates store.sensors on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sensors: MOCK_SENSORS }),
    });

    await useSensorStore.getState().fetchSensors();

    const state = useSensorStore.getState();
    expect(state.sensors).toEqual(MOCK_SENSORS);
    expect(state.error).toBeNull();
    expect(state.loading).toBe(false);
  });

  test('fetchSensors sets loading=true while fetching', async () => {
    let resolveFetch: (value: unknown) => void;
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });

    global.fetch = jest.fn().mockReturnValue(fetchPromise);

    const fetchPromiseStarted = useSensorStore.getState().fetchSensors();

    // While the fetch is in-flight, loading should be true
    expect(useSensorStore.getState().loading).toBe(true);

    // Resolve the fetch
    resolveFetch!({
      ok: true,
      json: () => Promise.resolve({ sensors: MOCK_SENSORS }),
    });

    await fetchPromiseStarted;
    expect(useSensorStore.getState().loading).toBe(false);
  });

  // --- fetchSensors error ---
  test('fetchSensors sets store.error on network failure', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    await useSensorStore.getState().fetchSensors();

    const state = useSensorStore.getState();
    expect(state.error).toBe('Live occupancy data is temporarily unavailable.');
    expect(state.loading).toBe(false);
    // sensors should remain null since we never had a successful fetch
    expect(state.sensors).toBeNull();
  });

  test('fetchSensors sets store.error on non-ok response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    await useSensorStore.getState().fetchSensors();

    const state = useSensorStore.getState();
    expect(state.error).toBe('Live occupancy data is temporarily unavailable.');
    expect(state.loading).toBe(false);
  });

  // --- startPolling ---
  test('startPolling calls fetchSensors immediately', async () => {
    jest.useFakeTimers();

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sensors: MOCK_SENSORS }),
    });

    const cleanup = useSensorStore.getState().startPolling();

    // fetch should have been called immediately
    expect(global.fetch).toHaveBeenCalledTimes(1);

    cleanup();
  });

  test('startPolling creates interval that re-fetches after 15s', async () => {
    jest.useFakeTimers();

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sensors: MOCK_SENSORS }),
    });

    const cleanup = useSensorStore.getState().startPolling();

    // Initial call
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Advance by 15 seconds
    jest.advanceTimersByTime(15000);
    expect(global.fetch).toHaveBeenCalledTimes(2);

    // Advance another 15 seconds
    jest.advanceTimersByTime(15000);
    expect(global.fetch).toHaveBeenCalledTimes(3);

    cleanup();
  });

  test('startPolling cleanup function clears interval', () => {
    jest.useFakeTimers();

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sensors: MOCK_SENSORS }),
    });

    const cleanup = useSensorStore.getState().startPolling();

    // Initial call
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Clean up
    cleanup();

    // After cleanup, advancing timers should NOT trigger more fetches
    jest.advanceTimersByTime(30000);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('startPolling returns a function', () => {
    jest.useFakeTimers();

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sensors: [] }),
    });

    const cleanup = useSensorStore.getState().startPolling();
    expect(typeof cleanup).toBe('function');
    cleanup();
  });
});
