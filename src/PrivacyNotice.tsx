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
                Diese Anwendung verarbeitet alle Eingaben ausschließlich im Browser. Es werden keine Inhalte an einen Server übertragen oder gespeichert.
              </p>

              <p className="privacy-modal-subheading">Was passiert mit Ihren Eingaben:</p>
              <ul>
                <li>Use-Case- und Risikoangaben bleiben nur im aktuellen Browser-Tab bzw. in der lokalen Browsersitzung erhalten.</li>
                <li>Es gibt keine Server- oder Datenbankpersistenz für die Inhalte dieses Tools.</li>
                <li>Die einzige Ausnahme ist ein optionaler Feedback-Button, der Sie per E-Mail kontaktiert, wenn Sie selbst einen Link öffnen.</li>
              </ul>

              <p>
                Bitte geben Sie keine personenbezogenen Daten oder vertraulichen Informationen ein, die nicht bewusst im Browser verarbeitet werden sollen.
              </p>

              <p>
                <strong>Bei Fragen:</strong>{' '}
                <a className="privacy-contact-link" href="mailto:ai.security.score@example.com">
                  ai.security.score@example.com
                </a>
              </p>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
