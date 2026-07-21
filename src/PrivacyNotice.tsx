import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export function PrivacyNotice() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  return (
    <>
      <button type="button" className="sidebar-privacy-link" onClick={() => setIsOpen(true)}>
        Datenschutz
      </button>

      {isOpen &&
        createPortal(
          // Als Portal direkt unter document.body gerendert — nicht innerhalb der
          // .sidebar, deren color:#fff (für die dunkle Navigation gedacht) sonst
          // per CSS-Vererbung auch hier landen würde (position:fixed ändert nur das
          // Layout, nicht den Vererbungspfad im DOM-Baum).
          <div className="privacy-backdrop" onClick={() => setIsOpen(false)}>
            <div
              className="privacy-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="privacy-modal-title"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="privacy-modal-close"
                onClick={() => setIsOpen(false)}
                aria-label="Datenschutzhinweis schließen"
              >
                ×
              </button>

              <h3 id="privacy-modal-title">Datenschutzhinweis</h3>

              <p>
                Diese Anwendung ist ein Studienprojekt der TH Köln (Interactive Media Products) und dient dem
                Sammeln von Feedback zu einem Prototyp.
              </p>

              <p className="privacy-modal-subheading">Was wir speichern:</p>
              <ul>
                <li>Anonyme Zählung von Seitenaufrufen (kein IP-Speicher, keine Cookies, keine Nutzerprofile).</li>
                <li>Freiwilliges Feedback (Bewertung und optionaler Text), das du selbst absendest.</li>
              </ul>

              <p>
                <strong>Wo:</strong> Die Daten werden bei Supabase (Server-Standort EU) gespeichert.
              </p>

              <p>
                Wir erheben bewusst keine personenbezogenen Daten. Bitte gib im Feedback keine Namen,
                Kontaktdaten oder sonstige persönliche Informationen an.
              </p>

              <p>
                <strong>Bei Fragen:</strong>{' '}
                <span className="privacy-contact-placeholder">[Platzhalter für eure Kontakt-Mail]</span>
              </p>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
