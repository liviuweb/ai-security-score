import { useMemo, useState } from 'react'
import type { UseCase } from '../types'
import { useViewMode } from '../ViewModeContext'
import { berechneExposure, type Ampel, type ExposureErgebnis, type ExposureStufe } from '../exposure'
import { berechneAiAct, type AiActErgebnis, type AiActKlasse } from '../aiact'
import { securityScenarios, type SecurityScenario } from '../securityScenarios'
import bannerBibliothek from '../assets/banner-bibliothek.jpg'

type TabKey = 'start' | 'usecase' | 'exposure' | 'compliance' | 'bibliothek' | 'methodik'

interface BibliothekTabProps {
  onLoad: (uc: UseCase) => void
  onNavigate?: (tab: TabKey) => void
}

interface Auswertung {
  szenario: SecurityScenario
  exposure: ExposureErgebnis
  aiAct: AiActErgebnis
}

const AMPEL_LABEL: Record<Ampel, string> = { gruen: 'Grün', gelb: 'Gelb', rot: 'Rot' }

const KLASSE_LABEL: Record<AiActKlasse, string> = {
  verboten: 'Verboten',
  hochrisiko: 'Hochrisiko',
  transparenzpflicht: 'Transparenzpflicht',
  minimal: 'Minimal',
  grenzfall: 'Grenzfall',
}

const EXPOSURE_STUFEN: ExposureStufe[] = ['A', 'B', 'C', 'D', 'E', 'KRITISCH']
const AIACT_KLASSEN: AiActKlasse[] = ['verboten', 'hochrisiko', 'grenzfall', 'transparenzpflicht', 'minimal']

const BEWERBUNGS_PAAR_IDS = ['bewerbung-autonom', 'bewerbung-vorschlag']

export function BibliothekTab({ onLoad, onNavigate }: BibliothekTabProps) {
  const { mode } = useViewMode()
  const [filterStufe, setFilterStufe] = useState<ExposureStufe | 'alle'>('alle')
  const [filterKlasse, setFilterKlasse] = useState<AiActKlasse | 'alle'>('alle')

  const auswertungen = useMemo<Auswertung[]>(
    () =>
      securityScenarios.map((szenario) => ({
        szenario,
        exposure: berechneExposure(szenario.useCase),
        aiAct: berechneAiAct(szenario.useCase),
      })),
    [],
  )

  const sichtbar = useMemo(() => {
    if (mode !== 'specialist') return auswertungen
    return auswertungen.filter(({ exposure, aiAct }) => {
      if (filterStufe !== 'alle' && exposure.stufe !== filterStufe) return false
      if (filterKlasse !== 'alle' && aiAct.primaerklasse !== filterKlasse) return false
      return true
    })
  }, [auswertungen, mode, filterStufe, filterKlasse])

  const handleUebernehmen = (uc: UseCase) => {
    onLoad(uc)
    onNavigate?.('usecase')
  }

  const bewerbungsPaar = sichtbar.filter((eintrag) => BEWERBUNGS_PAAR_IDS.includes(eintrag.szenario.id))
  const uebrige = sichtbar.filter((eintrag) => !BEWERBUNGS_PAAR_IDS.includes(eintrag.szenario.id))

  return (
    <div className="bibliothek-shell">
      {mode === 'normal' && <img src={bannerBibliothek} alt="" className="tab-banner" loading="lazy" />}
      <section className="panel">
        <div className="panel-heading">
          <h2>Bibliothek</h2>
          <p>Acht durchgerechnete Beispielfälle — zum Nachvollziehen der Bewertungslogik und als Ausgangspunkt für eigene Use-Cases.</p>
        </div>

        {mode === 'specialist' && (
          <div className="bibliothek-filterleiste">
            <label className="field-card">
              <span>Exposure-Stufe</span>
              <select value={filterStufe} onChange={(event) => setFilterStufe(event.target.value as ExposureStufe | 'alle')}>
                <option value="alle">Alle</option>
                {EXPOSURE_STUFEN.map((stufe) => (
                  <option key={stufe} value={stufe}>
                    {stufe}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-card">
              <span>AI-Act-Klasse</span>
              <select value={filterKlasse} onChange={(event) => setFilterKlasse(event.target.value as AiActKlasse | 'alle')}>
                <option value="alle">Alle</option>
                {AIACT_KLASSEN.map((klasse) => (
                  <option key={klasse} value={klasse}>
                    {KLASSE_LABEL[klasse]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </section>

      {bewerbungsPaar.length > 0 && (
        <section className="panel bibliothek-paar-panel">
          <div className="panel-heading">
            <h2>Zwei Bewerbungsfälle im Vergleich</h2>
            <p>
              Diese beiden Szenarien unterscheiden sich in genau einem Feld — <code>autonomie</code> — und landen
              trotzdem in unterschiedlichen AI-Act-Klassen. Genau das ist der Kern dieser Bibliothek.
            </p>
          </div>
          <div className="bibliothek-paar-grid">
            {bewerbungsPaar.map((eintrag) => (
              <ScenarioCard key={eintrag.szenario.id} eintrag={eintrag} mode={mode} onUebernehmen={handleUebernehmen} />
            ))}
          </div>
        </section>
      )}

      {uebrige.length > 0 ? (
        <div className="bibliothek-grid">
          {uebrige.map((eintrag) => (
            <ScenarioCard key={eintrag.szenario.id} eintrag={eintrag} mode={mode} onUebernehmen={handleUebernehmen} />
          ))}
        </div>
      ) : (
        bewerbungsPaar.length === 0 && (
          <section className="panel">
            <p className="helper-note">Kein Szenario erfüllt die aktuellen Filter.</p>
          </section>
        )
      )}
    </div>
  )
}

function ScenarioCard({
  eintrag,
  mode,
  onUebernehmen,
}: {
  eintrag: Auswertung
  mode: 'normal' | 'specialist'
  onUebernehmen: (uc: UseCase) => void
}) {
  const [lehrpunktOpen, setLehrpunktOpen] = useState(false)
  const { szenario, exposure, aiAct } = eintrag

  return (
    <article className="panel bibliothek-card">
      <h3>{szenario.titel}</h3>
      <p>{szenario.kurzbeschreibung[mode]}</p>

      <div className="bibliothek-badges">
        <span className={`bibliothek-badge bibliothek-badge-${exposure.ampel}`}>
          {mode === 'specialist' ? `Exposure ${exposure.stufe}` : AMPEL_LABEL[exposure.ampel]}
        </span>
        <span className={`compliance-klasse-badge compliance-klasse-${aiAct.primaerklasse}`}>
          {KLASSE_LABEL[aiAct.primaerklasse]}
        </span>
      </div>

      <div className="bibliothek-card-actions">
        <button type="button" className="demo-card-good" onClick={() => onUebernehmen(szenario.useCase)}>
          Übernehmen
        </button>
        <button
          type="button"
          className="inline-link"
          onClick={() => setLehrpunktOpen((v) => !v)}
          aria-expanded={lehrpunktOpen}
        >
          Lehrpunkt {lehrpunktOpen ? '↑' : '↓'}
        </button>
      </div>

      {lehrpunktOpen && <p className="bibliothek-lehrpunkt">{szenario.lehrpunkt[mode]}</p>}
    </article>
  )
}
