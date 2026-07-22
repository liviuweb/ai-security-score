import { useState, type FormEvent } from 'react'
import { supabase } from './lib/supabase'

// Erwartete Form der RPC-Antwort von get_admin_stats — ein einzelnes (J)SON-Objekt
// mit den Kennzahlen plus der Feedback-Liste. Falls die Funktion stattdessen eine
// SETOF-Zeile mit genau einem Datensatz liefert, kommt data als Array mit einem
// Element zurück — das wird unten defensiv behandelt.
interface FeedbackEntry {
  created_at: string
  rating: number
  message: string | null
  page: string
}

interface AdminStats {
  total_visits: number
  total_feedback: number
  avg_rating: number
  feedback: FeedbackEntry[]
}

const ADMIN_PASSWORD: string | undefined = import.meta.env.VITE_ADMIN_PASSWORD

export function AdminTab() {
  const [unlocked, setUnlocked] = useState(false)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState(false)

  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadStats = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const { data, error } = await supabase.rpc('get_admin_stats')
      if (error) throw error
      const result = (Array.isArray(data) ? data[0] : data) as AdminStats
      setStats(result)
    } catch (error) {
      console.error('AdminTab: failed to load stats', error)
      setLoadError('Daten konnten nicht geladen werden. Bitte versuche es erneut.')
    } finally {
      setLoading(false)
    }
  }

  const handleUnlock = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD) {
      setAuthError(true)
      return
    }
    setAuthError(false)
    setUnlocked(true)
    loadStats()
  }

  if (!unlocked) {
    return (
      <section className="panel admin-gate">
        <div className="panel-heading">
          <h2>Admin</h2>
          <p>Geschützter Bereich — bitte Passwort eingeben.</p>
        </div>
        <form className="admin-gate-form" onSubmit={handleUnlock}>
          <label>
            <span>Passwort</span>
            <input
              type="password"
              className="admin-gate-input"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setAuthError(false)
              }}
              autoFocus
            />
          </label>
          <button type="submit" className="admin-gate-btn">
            Freischalten
          </button>
          {authError && <p className="admin-gate-error">Falsches Passwort.</p>}
        </form>
      </section>
    )
  }

  const sortedFeedback = stats
    ? [...stats.feedback].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    : []

  return (
    <div className="admin-shell">
      <section className="panel">
        <div className="panel-heading">
          <h2>Admin-Übersicht</h2>
          <p>Besuche und Feedback aus Supabase.</p>
        </div>

        {loading && <p className="admin-loading">Lädt…</p>}

        {loadError && (
          <div className="admin-load-error">
            <p>{loadError}</p>
            <button type="button" className="inline-link" onClick={loadStats}>
              Erneut versuchen
            </button>
          </div>
        )}

        {stats && !loading && (
          <div className="metric-grid admin-metric-grid">
            <article className="metric-card">
              <p className="metric-label">Besuche gesamt</p>
              <h3>{stats.total_visits.toLocaleString('de-DE')}</h3>
            </article>
            <article className="metric-card">
              <p className="metric-label">Feedback gesamt</p>
              <h3>{stats.total_feedback.toLocaleString('de-DE')}</h3>
            </article>
            <article className="metric-card">
              <p className="metric-label">Ø Bewertung</p>
              <h3>{stats.avg_rating.toFixed(1)} / 5</h3>
            </article>
          </div>
        )}
      </section>

      {stats && !loading && (
        <section className="panel">
          <div className="panel-heading">
            <h2>Feedback-Einträge</h2>
            <p>{sortedFeedback.length} Einträge, neueste zuerst.</p>
          </div>
          <div className="table-wrap">
            <table className="analysis-table">
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Rating</th>
                  <th>Nachricht</th>
                  <th>Seite</th>
                </tr>
              </thead>
              <tbody>
                {sortedFeedback.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="analysis-table-empty">
                      Noch kein Feedback vorhanden.
                    </td>
                  </tr>
                ) : (
                  sortedFeedback.map((entry, index) => (
                    <tr key={`${entry.created_at}-${index}`}>
                      <td>{new Date(entry.created_at).toLocaleDateString('de-DE')}</td>
                      <td>
                        <span className="admin-rating-stars">
                          {'★'.repeat(entry.rating)}
                          {'☆'.repeat(Math.max(0, 5 - entry.rating))}
                        </span>
                      </td>
                      <td>{entry.message ?? '—'}</td>
                      <td>{entry.page}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
