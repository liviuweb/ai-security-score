import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const STORAGE_KEY = 'ki-nutri-viewmode-v1';

export type ViewMode = 'einfach' | 'erweitert';

interface ViewModeContextValue {
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;
  isSimple: boolean;
}

const ViewModeContext = createContext<ViewModeContextValue | null>(null);

function loadStoredMode(): ViewMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === 'einfach' || raw === 'erweitert' ? raw : 'einfach';
  } catch {
    return 'einfach';
  }
}

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ViewMode>(loadStoredMode);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // localStorage may be unavailable (private mode, quota exceeded) — mode still works in-memory for this session
    }
  }, [mode]);

  const value = useMemo<ViewModeContextValue>(
    () => ({ mode, setMode, isSimple: mode === 'einfach' }),
    [mode],
  );

  return <ViewModeContext.Provider value={value}>{children}</ViewModeContext.Provider>;
}

// This context file intentionally colocates the provider and its hook;
// react-refresh falls back to a full reload here instead of preserving state.
// eslint-disable-next-line react-refresh/only-export-components
export function useViewMode(): ViewModeContextValue {
  const context = useContext(ViewModeContext);
  if (!context) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return context;
}
