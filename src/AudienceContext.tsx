import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const STORAGE_KEY = 'ki-nutri-audience-v1';

export type Audience = 'privat' | 'unternehmen';

interface AudienceContextValue {
  audience: Audience;
  setAudience: (audience: Audience) => void;
  isBusiness: boolean;
}

const AudienceContext = createContext<AudienceContextValue | null>(null);

function loadStoredAudience(): Audience {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === 'privat' || raw === 'unternehmen' ? raw : 'privat';
  } catch {
    return 'privat';
  }
}

export function AudienceProvider({ children }: { children: ReactNode }) {
  const [audience, setAudience] = useState<Audience>(loadStoredAudience);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, audience);
    } catch {
      // localStorage may be unavailable (private mode, quota exceeded) — audience still works in-memory for this session
    }
  }, [audience]);

  const value = useMemo<AudienceContextValue>(
    () => ({ audience, setAudience, isBusiness: audience === 'unternehmen' }),
    [audience],
  );

  return <AudienceContext.Provider value={value}>{children}</AudienceContext.Provider>;
}

// This context file intentionally colocates the provider and its hook;
// react-refresh falls back to a full reload here instead of preserving state.
// eslint-disable-next-line react-refresh/only-export-components
export function useAudience(): AudienceContextValue {
  const context = useContext(AudienceContext);
  if (!context) {
    throw new Error('useAudience must be used within an AudienceProvider');
  }
  return context;
}
