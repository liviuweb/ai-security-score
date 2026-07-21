import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { aggregateDay, groupByDay, toDateKey } from './dailyScore';
import type { DailyAggregate, UsageEvent } from './usageTypes';

const STORAGE_KEY = 'ki-nutri-usage-v1';

interface UsageContextValue {
  events: UsageEvent[];
  addEvent: (event: Omit<UsageEvent, 'id' | 'timestamp'>) => void;
  clearUsage: () => void;
  seedDemoData: () => void;
  today: DailyAggregate;
  days: DailyAggregate[];
}

const UsageContext = createContext<UsageContextValue | null>(null);

function loadStoredEvents(): UsageEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Realistic same-day sample spanning all four tools, mixing well- and poorly-matched model choices.
const DEMO_EVENTS: Omit<UsageEvent, 'id' | 'timestamp'>[] = [
  { source: 'chatgpt', taskType: 'trivial', modelSize: 'gross', tokens: 400, effortWh: 1.05, co2Gram: 0.42, costEuro: 0.03, appropriateness: 0.12 },
  { source: 'copilot', taskType: 'code', modelSize: 'mittel', tokens: 1800, effortWh: 0.78, co2Gram: 0.31, costEuro: 0.02, appropriateness: 0.72 },
  { source: 'gemini', taskType: 'fakten', modelSize: 'klein', tokens: 600, effortWh: 0.13, co2Gram: 0.05, costEuro: 0.001, appropriateness: 0.88 },
  { source: 'claude', taskType: 'analyse', modelSize: 'gross', tokens: 6000, effortWh: 3.38, co2Gram: 1.35, costEuro: 0.24, appropriateness: 0.91 },
  { source: 'chatgpt', taskType: 'kreativ', modelSize: 'gross', tokens: 2200, effortWh: 1.45, co2Gram: 0.58, costEuro: 0.05, appropriateness: 0.45 },
  { source: 'gemini', taskType: 'generierung', modelSize: 'gross', tokens: 9000, effortWh: 4.75, co2Gram: 1.9, costEuro: 0.4, appropriateness: 0.65 },
  { source: 'copilot', taskType: 'trivial', modelSize: 'mittel', tokens: 350, effortWh: 0.38, co2Gram: 0.15, costEuro: 0.004, appropriateness: 0.2 },
  { source: 'claude', taskType: 'code', modelSize: 'gross', tokens: 3200, effortWh: 1.75, co2Gram: 0.7, costEuro: 0.15, appropriateness: 0.8 },
];

export function UsageProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<UsageEvent[]>(loadStoredEvents);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch {
      // localStorage may be unavailable (private mode, quota exceeded) — usage tracking still works in-memory for this session
    }
  }, [events]);

  const addEvent = useCallback((event: Omit<UsageEvent, 'id' | 'timestamp'>) => {
    const fullEvent: UsageEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    setEvents((prev) => [fullEvent, ...prev]);
  }, []);

  const clearUsage = useCallback(() => {
    setEvents([]);
  }, []);

  const seedDemoData = useCallback(() => {
    DEMO_EVENTS.forEach(addEvent);
  }, [addEvent]);

  const days = useMemo(() => groupByDay(events), [events]);

  const [todayKey] = useState<string>(() => toDateKey(Date.now()));

  const today = useMemo(() => {
    return days.find((day) => day.dateKey === todayKey) ?? aggregateDay([]);
  }, [days, todayKey]);

  const value = useMemo<UsageContextValue>(
    () => ({ events, addEvent, clearUsage, seedDemoData, today, days }),
    [events, addEvent, clearUsage, seedDemoData, today, days],
  );

  return <UsageContext.Provider value={value}>{children}</UsageContext.Provider>;
}

// This context file intentionally colocates the provider and its hook;
// react-refresh falls back to a full reload here instead of preserving state.
// eslint-disable-next-line react-refresh/only-export-components
export function useUsage(): UsageContextValue {
  const context = useContext(UsageContext);
  if (!context) {
    throw new Error('useUsage must be used within a UsageProvider');
  }
  return context;
}
