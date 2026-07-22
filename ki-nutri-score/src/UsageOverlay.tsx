import { useState } from 'react'
import { useUsage } from './UsageContext'
import { colors as scoreLetterColors } from './nutriScoreLabel'
import { useAudience } from './AudienceContext'
import { B2B_ACCENT, BUSINESS_USE_CASES, calculateFleet } from './businessData'
import { formatCo2 } from './formatCo2'

interface UsageOverlayProps {
  onClick: () => void
}

const RADIUS = 26
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const NEUTRAL_RING_COLOR = '#cbd5e1'

// Ampel-Farben für den Compliance-Anteil — dieselbe Farblogik wie im Flotten-Cockpit
// (Dashboard), damit Overlay und Dashboard konsistent wirken.
const COMPLIANCE_GOOD = '#166534'
const COMPLIANCE_WARN = '#f59e0b'
const COMPLIANCE_BAD = '#dc2626'

export function UsageOverlay({ onClick }: UsageOverlayProps) {
  const { today } = useUsage()
  const { isBusiness } = useAudience()
  const [visible, setVisible] = useState(true)

  if (!visible) return null

  const closeButton = (
    <button
      type="button"
      className="usage-overlay-close"
      onClick={(event) => {
        event.stopPropagation()
        setVisible(false)
      }}
      aria-label="Overlay für diese Sitzung ausblenden"
    >
      ×
    </button>
  )

  if (isBusiness) {
    const fleet = calculateFleet(BUSINESS_USE_CASES)
    const ratio = fleet.totalCount > 0 ? fleet.compliantCount / fleet.totalCount : 0
    const ringColor = ratio === 1 ? COMPLIANCE_GOOD : ratio >= 0.5 ? COMPLIANCE_WARN : COMPLIANCE_BAD
    const dashOffset = CIRCUMFERENCE * (1 - ratio)

    return (
      <div className="usage-overlay" style={{ borderColor: B2B_ACCENT }}>
        {closeButton}

        <button type="button" className="usage-overlay-body" onClick={onClick}>
          <span className="business-badge usage-overlay-business-tag" style={{ background: B2B_ACCENT }}>
            Business
          </span>
          <span className="usage-overlay-ring-wrap">
            <svg viewBox="0 0 64 64" className="usage-overlay-ring" aria-hidden="true">
              <circle cx="32" cy="32" r={RADIUS} className="usage-overlay-ring-track" />
              <circle
                cx="32"
                cy="32"
                r={RADIUS}
                className="usage-overlay-ring-fill"
                style={{ stroke: ringColor, strokeDasharray: CIRCUMFERENCE, strokeDashoffset: dashOffset }}
              />
            </svg>
            <span className="usage-overlay-letter usage-overlay-letter-business" style={{ color: ringColor }}>
              {Math.round(ratio * 100)}%
            </span>
          </span>
          <span className="usage-overlay-caption">
            {fleet.compliantCount}/{fleet.totalCount} konform
          </span>
        </button>
      </div>
    )
  }

  const hasUsage = today.events.length > 0
  const ringColor = hasUsage ? scoreLetterColors[today.letter] : NEUTRAL_RING_COLOR
  const dashOffset = CIRCUMFERENCE * (1 - (hasUsage ? today.volumeLoad : 0))

  return (
    <div className="usage-overlay">
      {closeButton}

      <button type="button" className="usage-overlay-body" onClick={onClick}>
        <span className="usage-overlay-ring-wrap">
          <svg viewBox="0 0 64 64" className="usage-overlay-ring" aria-hidden="true">
            <circle cx="32" cy="32" r={RADIUS} className="usage-overlay-ring-track" />
            <circle
              cx="32"
              cy="32"
              r={RADIUS}
              className="usage-overlay-ring-fill"
              style={{ stroke: ringColor, strokeDasharray: CIRCUMFERENCE, strokeDashoffset: dashOffset }}
            />
          </svg>
          <span className="usage-overlay-letter" style={{ color: ringColor }}>
            {hasUsage ? today.letter : 'A'}
          </span>
        </span>
        <span className="usage-overlay-caption">
          {hasUsage ? `${formatCo2(today.totalCo2Gram)} CO₂` : 'Noch keine Nutzung heute'}
        </span>
      </button>
    </div>
  )
}
