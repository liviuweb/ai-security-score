import { useEffect, useState } from 'react'

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error'

const STARS = [1, 2, 3, 4, 5]

export function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<SubmitStatus>('idle')

  const openModal = () => {
    setIsOpen(true)
  }

  const closeModal = () => {
    setIsOpen(false)
    setRating(0)
    setHoveredRating(0)
    setMessage('')
    setStatus('idle')
  }

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeModal()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  useEffect(() => {
    if (status !== 'success') return
    const timeout = setTimeout(() => closeModal(), 1800)
    return () => clearTimeout(timeout)
  }, [status])

  const handleSubmit = async () => {
    if (rating === 0 || status === 'submitting') return
    setStatus('submitting')

    try {
      const mailtoLink = `mailto:ai.security.score@example.com?subject=Feedback%20AI-Security-Score&body=${encodeURIComponent(`Bewertung: ${rating}/5\n\n${message.trim()}`)}`
      window.location.href = mailtoLink
      setStatus('success')
    } catch (error) {
      console.error('FeedbackWidget: mailto failed', error)
      setStatus('error')
    }
  }

  return (
    <>
      <button
        type="button"
        className="feedback-fab"
        onClick={openModal}
        aria-haspopup="dialog"
        aria-label="Feedback geben"
      >
        <span className="feedback-fab-icon" aria-hidden="true">💬</span>
        Feedback
      </button>

      {isOpen && (
        <div className="feedback-backdrop" onClick={closeModal}>
          <div
            className="feedback-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="feedback-modal-close"
              onClick={closeModal}
              aria-label="Feedback-Formular schließen"
            >
              ×
            </button>

            {status === 'success' ? (
              <div className="feedback-success">
                <span className="feedback-success-icon" aria-hidden="true">✓</span>
                <p>Danke für dein Feedback!</p>
              </div>
            ) : (
              <>
                <h3 id="feedback-modal-title">Wie gefällt dir der AI Security Score?</h3>
                <p className="feedback-modal-sub">Deine Rückmeldung hilft uns, das Tool zu verbessern.</p>

                <div className="feedback-stars" role="radiogroup" aria-label="Bewertung von 1 bis 5 Sternen">
                  {STARS.map((star) => {
                    const filled = star <= (hoveredRating || rating)
                    return (
                      <button
                        key={star}
                        type="button"
                        className={`feedback-star-btn ${filled ? 'filled' : ''}`}
                        role="radio"
                        aria-checked={rating === star}
                        aria-label={`${star} von 5 Sternen`}
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoveredRating(star)}
                        onMouseLeave={() => setHoveredRating(0)}
                      >
                        {filled ? '★' : '☆'}
                      </button>
                    )
                  })}
                </div>

                <label className="feedback-message-label">
                  <span>Kommentar (optional)</span>
                  <textarea
                    className="feedback-textarea"
                    rows={4}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Was können wir besser machen?"
                  />
                </label>

                {status === 'error' && (
                  <p className="feedback-error">
                    Beim Absenden ist etwas schiefgelaufen. Bitte versuche es noch einmal.
                  </p>
                )}

                <p className="feedback-privacy-hint">
                  Bitte keine personenbezogenen Daten eingeben. Dein Feedback wird anonym gespeichert.
                </p>

                <button
                  type="button"
                  className="feedback-submit-btn"
                  onClick={handleSubmit}
                  disabled={rating === 0 || status === 'submitting'}
                >
                  {status === 'submitting' ? 'Wird gesendet…' : 'Absenden'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
