import { useMemo, useState } from 'react'
import type { UseCase } from '../types'
import { useViewMode } from '../ViewModeContext'
import {
  AIACT_FRISTEN,
  AIACT_FRISTEN_HINWEIS,
  AIACT_VERORDNUNG,
  berechneAiAct,
  type AiActErgebnis,
  type AiActKlasse,
  type Rolle,
} from '../aiact'

interface ComplianceTabProps {
  useCase: UseCase
  onChange: (value: UseCase) => void
}

const KLASSE_LABEL: Record<AiActKlasse, string> = {
  verboten: 'Verboten',
  hochrisiko: 'Hochrisiko',
  transparenzpflicht: 'Transparenzpflicht',
  minimal: 'Minimal',
  grenzfall: 'Grenzfall',
}

const KLASSE_TEXT_NORMAL: Record<Exclude<AiActKlasse, 'grenzfall'>, { titel: string; erklaerung: string }> = {
  verboten: {
    titel: 'Nicht zulässig',
    erklaerung:
      'Dieser Anwendungsfall fällt unter eine verbotene Praxis nach dem AI Act. Er darf in dieser Form nicht eingesetzt werden.',
  },
  hochrisiko: {
    titel: 'Hochrisiko-System',
    erklaerung:
      'Dieser Anwendungsfall gilt als Hochrisiko-System. Vor dem Einsatz und während des Betriebs gelten zusätzliche Pflichten — u. a. menschliche Aufsicht, Protokollierung und Informationspflichten gegenüber Betroffenen.',
  },
  transparenzpflicht: {
    titel: 'Transparenzpflichtig',
    erklaerung:
      'Dieser Anwendungsfall unterliegt einer Transparenzpflicht. Betroffene müssen erkennen können, dass sie es mit einer KI zu tun haben bzw. dass Inhalte KI-generiert sind.',
  },
  minimal: {
    titel: 'Minimales Risiko',
    erklaerung:
      'Für diesen Anwendungsfall bestehen keine spezifischen Pflichten über die allgemeine Anforderung an KI-Kompetenz hinaus.',
  },
}

const GLOSSAR: Array<{ begriff: string; erklaerung: string }> = [
  {
    begriff: 'Betreiber',
    erklaerung:
      'Wer ein KI-System in eigener Verantwortung verwendet. Das ist bei RTL in aller Regel der Fall, da meist zugekaufte Modelle eingesetzt werden.',
  },
  {
    begriff: 'Anbieter',
    erklaerung: 'Wer ein KI-System entwickelt oder unter eigenem Namen in Verkehr bringt bzw. substanziell anpasst.',
  },
  {
    begriff: 'Konformitätsbewertung',
    erklaerung: 'Das Verfahren, mit dem ein Anbieter vor Markteinführung nachweist, dass ein Hochrisiko-System die Anforderungen des AI Act erfüllt.',
  },
]

const MONATE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]

function formatDatum(iso: string): string {
  const [jahr, monat, tag] = iso.split('-').map(Number)
  return `${tag}. ${MONATE[monat - 1]} ${jahr}`
}

export function ComplianceTab({ useCase, onChange }: ComplianceTabProps) {
  const { mode } = useViewMode()
  const [rolle, setRolle] = useState<Rolle>('betreiber')
  const aktiveRolle = mode === 'specialist' ? rolle : 'betreiber'
  const ergebnis = useMemo(() => berechneAiAct(useCase, aktiveRolle), [useCase, aktiveRolle])

  const toggleKontrolle = (id: string) => {
    const kontrollen = useCase.kontrollen.includes(id)
      ? useCase.kontrollen.filter((eintrag) => eintrag !== id)
      : [...useCase.kontrollen, id]
    onChange({ ...useCase, kontrollen })
  }

  const istZutreffendBestaetigt = (id: string) => useCase.kontrollen.includes(`${id}:zutreffend`)

  return (
    <div className="compliance-shell">
      {mode === 'specialist' ? (
        <SpecialistAnsicht
          ergebnis={ergebnis}
          rolle={rolle}
          onRolleChange={setRolle}
          onToggleKontrolle={toggleKontrolle}
          istZutreffendBestaetigt={istZutreffendBestaetigt}
        />
      ) : (
        <NormalAnsicht ergebnis={ergebnis} onToggleKontrolle={toggleKontrolle} />
      )}
      <Disclaimer ausfuehrlich={mode === 'specialist'} />
    </div>
  )
}

function NormalAnsicht({
  ergebnis,
  onToggleKontrolle,
}: {
  ergebnis: AiActErgebnis
  onToggleKontrolle: (id: string) => void
}) {
  const [glossarOpen, setGlossarOpen] = useState(false)
  const istGrenzfall = ergebnis.primaerklasse === 'grenzfall'
  const klasseText = !istGrenzfall ? KLASSE_TEXT_NORMAL[ergebnis.primaerklasse as Exclude<AiActKlasse, 'grenzfall'>] : null

  const handlungsPflichten = ergebnis.pflichten.filter((p) => !p.bedingt).slice(0, 5)
  const fortschritt = ergebnis.erfuellungsgrad
  const artikelListe = Array.from(new Set(ergebnis.begruendungen.map((b) => b.artikel)))

  return (
    <>
      <section className={`panel compliance-klasse-panel compliance-klasse-${ergebnis.primaerklasse}`}>
        {istGrenzfall ? (
          <>
            <h2>Unklar — juristisch prüfen</h2>
            <p>Dieser Anwendungsfall lässt sich anhand der Angaben nicht eindeutig einordnen. Das hängt von Details ab, die eine rechtliche Prüfung braucht.</p>
            {ergebnis.unschaerfe.map((u) => (
              <p key={u.grund} className="compliance-unschaerfe-hinweis">
                {u.grund} — {u.empfehlung}
              </p>
            ))}
          </>
        ) : (
          <>
            <h2>{klasseText?.titel}</h2>
            <p>{klasseText?.erklaerung}</p>
            {ergebnis.unschaerfe.length > 0 && (
              <p className="compliance-teilweise-unklar">
                Teilweise unklar: {ergebnis.unschaerfe.map((u) => u.grund).join('; ')}.
              </p>
            )}
          </>
        )}
        {artikelListe.length > 0 && <p className="compliance-artikel-zusatz">{artikelListe.join(' · ')}</p>}
      </section>

      {ergebnis.primaerklasse !== 'verboten' && (
        <section className="panel">
          <div className="panel-heading">
            <h2>Was zu tun ist</h2>
            {fortschritt !== null && <p>{Math.round(fortschritt * 100)} % erledigt</p>}
          </div>
          {fortschritt !== null && (
            <div className="compliance-fortschritt-bar" aria-label={`Fortschritt ${Math.round(fortschritt * 100)}%`}>
              <div className="compliance-fortschritt-fill" style={{ width: `${Math.round(fortschritt * 100)}%` }} />
            </div>
          )}
          {handlungsPflichten.length === 0 ? (
            <p className="helper-note">Keine weiteren Pflichten über die KI-Kompetenz hinaus.</p>
          ) : (
            <ul className="compliance-checkliste">
              {handlungsPflichten.map((p) => (
                <li key={p.id}>
                  <label className="choice-option">
                    <input type="checkbox" checked={p.erfuellt} onChange={() => onToggleKontrolle(p.id)} />
                    <span>{p.titel.normal}</span>
                  </label>
                  <p className="compliance-pflicht-beschreibung">{p.beschreibung.normal}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="panel compliance-glossar">
        <button type="button" className="inline-link" onClick={() => setGlossarOpen((v) => !v)} aria-expanded={glossarOpen}>
          Begriffe erklärt {glossarOpen ? '↑' : '↓'}
        </button>
        {glossarOpen && (
          <dl>
            {GLOSSAR.map((eintrag) => (
              <div key={eintrag.begriff} className="compliance-glossar-eintrag">
                <dt>{eintrag.begriff}</dt>
                <dd>{eintrag.erklaerung}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>
    </>
  )
}

function SpecialistAnsicht({
  ergebnis,
  rolle,
  onRolleChange,
  onToggleKontrolle,
  istZutreffendBestaetigt,
}: {
  ergebnis: AiActErgebnis
  rolle: Rolle
  onRolleChange: (rolle: Rolle) => void
  onToggleKontrolle: (id: string) => void
  istZutreffendBestaetigt: (id: string) => boolean
}) {
  return (
    <>
      <section className="panel">
        <div className="panel-heading">
          <h2>Klassifikation</h2>
        </div>
        <span className={`compliance-klasse-badge compliance-klasse-${ergebnis.primaerklasse}`}>
          {KLASSE_LABEL[ergebnis.primaerklasse]}
        </span>
        {ergebnis.zusatzklassen.length > 0 && (
          <p className="compliance-zusatzklassen">Zusatzklassen: {ergebnis.zusatzklassen.map((k) => KLASSE_LABEL[k]).join(', ')}</p>
        )}
        <ul className="compliance-begruendungen">
          {ergebnis.begruendungen.map((b, index) => (
            <li key={`${b.klasse}-${b.artikel}-${index}`}>
              <span className={`compliance-begruendung-klasse compliance-klasse-${b.klasse}`}>{KLASSE_LABEL[b.klasse]}</span>
              <strong>{b.artikel}</strong> — {b.text}
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Rollenwahl</h2>
          <p>
            RTL ist in den allermeisten Fällen Betreiber, nicht Anbieter. Relevant wird die Anbieter-Perspektive, sobald
            ein Modell substanziell angepasst oder unter eigenem Namen ausgerollt wird.
          </p>
        </div>
        <div className="viewmode-toggle" role="group" aria-label="Rolle">
          <button type="button" className={`viewmode-btn ${rolle === 'betreiber' ? 'active' : ''}`} onClick={() => onRolleChange('betreiber')}>
            Betreiber
          </button>
          <button type="button" className={`viewmode-btn ${rolle === 'anbieter' ? 'active' : ''}`} onClick={() => onRolleChange('anbieter')}>
            Anbieter
          </button>
        </div>
      </section>

      {ergebnis.primaerklasse === 'verboten' ? (
        <section className="panel compliance-verboten-hinweis">
          <p>Kein Erfüllungsgrad — der Einsatz ist in dieser Form unzulässig, es gibt nichts zu erfüllen.</p>
        </section>
      ) : (
        <section className="panel">
          <div className="panel-heading">
            <h2>Erfüllungsgrad</h2>
          </div>
          <div className="compliance-fortschritt-bar">
            <div className="compliance-fortschritt-fill" style={{ width: `${Math.round((ergebnis.erfuellungsgrad ?? 0) * 100)}%` }} />
          </div>
          <p className="compliance-erfuellungsgrad-zahl">
            {((ergebnis.erfuellungsgrad ?? 0) * 100).toFixed(0)} % ({rolle})
          </p>
        </section>
      )}

      <section className="panel">
        <div className="panel-heading">
          <h2>Pflichten</h2>
        </div>
        {ergebnis.pflichten.length === 0 ? (
          <p className="helper-note">Keine Pflichten — Einsatz unzulässig.</p>
        ) : (
          <ul className="compliance-pflichten-liste-specialist">
            {ergebnis.pflichten.map((p) => (
              <li key={p.id}>
                <div className="compliance-pflicht-head">
                  <strong>{p.artikel}</strong>
                  <span>{p.titel.specialist}</span>
                  {p.bedingt && <span className="compliance-bedingt-badge">bedingt — zählt nur, wenn als zutreffend bestätigt</span>}
                </div>
                <p>{p.beschreibung.specialist}</p>
                <label className="choice-option">
                  <input type="checkbox" checked={p.erfuellt} onChange={() => onToggleKontrolle(p.id)} />
                  <span>Erfüllt</span>
                </label>
                {p.bedingt && (
                  <label className="choice-option compliance-bedingt-zutreffend">
                    <input
                      type="checkbox"
                      checked={istZutreffendBestaetigt(p.id)}
                      onChange={() => onToggleKontrolle(`${p.id}:zutreffend`)}
                    />
                    <span>Trifft auf uns zu</span>
                  </label>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {ergebnis.unschaerfe.length > 0 && (
        <section className="panel compliance-unschaerfe-panel">
          <div className="panel-heading">
            <h2>Unschärfe — wo Ermessen erforderlich ist</h2>
          </div>
          <ul>
            {ergebnis.unschaerfe.map((u) => (
              <li key={u.grund}>
                <strong>{u.grund}:</strong> {u.empfehlung}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel">
        <div className="panel-heading">
          <h2>Fristen</h2>
        </div>
        <ul className="compliance-fristen-liste">
          {AIACT_FRISTEN.map((frist) => (
            <li key={frist.datum}>
              <strong>{formatDatum(frist.datum)}</strong>: {frist.bezeichnung}
            </li>
          ))}
        </ul>
        <p className="helper-note">{AIACT_FRISTEN_HINWEIS}</p>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Selbstprüfung — nicht ableitbare Verbotstatbestände</h2>
          <p>Aus den erfassten Feldern nicht erkennbar. Prüft selbst, ob einer dieser Fälle zutrifft.</p>
        </div>
        <ul className="compliance-selbstpruefung-liste">
          {ergebnis.selbstpruefung.map((eintrag) => (
            <li key={eintrag}>{eintrag}</li>
          ))}
        </ul>
      </section>
    </>
  )
}

function Disclaimer({ ausfuehrlich }: { ausfuehrlich: boolean }) {
  return (
    <section className="panel compliance-disclaimer">
      <p>
        Vorläufige Einordnung auf Basis der eingegebenen Angaben. Keine Rechtsberatung.
        {ausfuehrlich && (
          <>
            {' '}
            Die Zuordnung zu Anhang III und die Reichweite der Ausnahme nach Art. 6 Abs. 3 erfordern eine
            Einzelfallprüfung. Stand der Verordnung: {AIACT_VERORDNUNG}. Änderungen und Fristverschiebungen sind
            möglich.
          </>
        )}
      </p>
    </section>
  )
}
