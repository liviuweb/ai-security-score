import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

// Schreibt beim ersten Laden der App genau einen Eintrag in die Supabase-Tabelle
// "visits". Das useRef-Flag verhindert einen doppelten Insert durch den
// Mount → Cleanup → Mount-Zyklus, den React StrictMode im Dev-Modus auslöst
// (der Ref bleibt über beide Zyklen hinweg an derselben Komponenteninstanz erhalten).
export function useTrackVisit(): void {
  const hasTracked = useRef(false)

  useEffect(() => {
    if (hasTracked.current) return
    hasTracked.current = true

    const trackVisit = async () => {
      try {
        const { error } = await supabase.from('visits').insert({ path: window.location.pathname })
        if (error) console.error('useTrackVisit: insert failed', error)
      } catch (error) {
        console.error('useTrackVisit: insert failed', error)
      }
    }

    trackVisit()
  }, [])
}
