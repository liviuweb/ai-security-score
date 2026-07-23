import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

const STORAGE_KEY = 'ai-security-viewmode-v1'

export type ViewMode = 'normal' | 'specialist'

interface ViewModeContextValue {
  mode: ViewMode
  setMode: (mode: ViewMode) => void
}

const ViewModeContext = createContext<ViewModeContextValue | null>(null)

function loadStoredMode(): ViewMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw === 'normal' || raw === 'specialist' ? raw : 'normal'
  } catch {
    return 'normal'
  }
}

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ViewMode>(loadStoredMode)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode)
    } catch {
      // localStorage may be unavailable (private mode, quota exceeded) — mode still works in-memory for this session
    }
  }, [mode])

  const value = useMemo<ViewModeContextValue>(() => ({ mode, setMode }), [mode])

  return <ViewModeContext.Provider value={value}>{children}</ViewModeContext.Provider>
}

export function useViewMode(): ViewModeContextValue {
  const context = useContext(ViewModeContext)
  if (!context) {
    throw new Error('useViewMode must be used within a ViewModeProvider')
  }
  return context
}
