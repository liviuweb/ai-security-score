import { useMemo, useState } from 'react'
import type { UseCase } from '../types'
import { useViewMode } from '../ViewModeContext'
import { berechneExposure, EXFILTRATION_TOOLS, type Ampel, type ExposureErgebnis } from '../exposure'
import bannerExposure from '../assets/banner-exposure.jpg'

interface ExposureTabProps {
  useCase: UseCase
}

const AMPEL_LABEL: Record<Ampel, string> = {
  gruen: 'Grün',
  gelb: 'Gelb',
  rot: 'Rot',
}

const AMPEL_SATZ: Record<Ampel, string> = {
  gruen: 'Für diesen Anwendungsfall sind aktuell keine gravierenden Sicherheitsrisiken erkennbar.',
  gelb: 'Für diesen Anwendungsfall gibt es Risiken, die ihr im Blick behalten und angehen solltet.',
  rot: 'Für diesen Anwendungsfall bestehen ernsthafte Sicherheitsrisiken — klärt sie, bevor ihr live geht.',
}

const WIRKSAMKEIT_LABEL: Record<string, string> = {
  hoch: 'Hohe Wirksamkeit',
  mittel: 'Mittlere Wirksamkeit',
  ergaenzend: 'Ergänzende Maßnahme',
}

const GLOSSAR: Array<{ begriff: string; erklaerung: string }> = [
  {
    begriff: 'Prompt Injection',
    erklaerung:
      'Versteckte Anweisungen in Inhalten, die die KI verarbeitet — z. B. in einer Webseite oder E-Mail. Die KI kann sie ausführen, ohne dass jemand es bemerkt.',
  },
  {
    begriff: 'Exfiltration',
    erklaerung:
      'Daten verlassen unbemerkt das System — etwa weil die KI sie über eine E-Mail, einen Webaufruf oder eine Suche nach außen schickt.',
  },
]

function AbbrGlossar({ begriff }: { begriff: string }) {
  const eintrag = GLOSSAR.find((g) => g.begriff === begriff)
  return (
    <abbr title={eintrag?.erklaerung} className="exposure-abbr">
      {begriff}
    </abbr>
  )
}

export function ExposureTab({ useCase }: ExposureTabProps) {
  const { mode } = useViewMode()
  const ergebnis = useMemo(() => berechneExposure(useCase), [useCase])

  return (
    <div className="exposure-shell">
      {mode === 'normal' && <img src={bannerExposure} alt="" className="tab-banner" loading="lazy" />}
      {mode === 'specialist' ? (
        <SpecialistAnsicht ergebnis={ergebnis} useCase={useCase} />
      ) : (
        <NormalAnsicht ergebnis={ergebnis} />
      )}
      <Disclaimer ausfuehrlich={mode === 'specialist'} />
    </div>
  )
}

function NormalAnsicht({ ergebnis }: { ergebnis: ExposureErgebnis }) {
  const [glossarOpen, setGlossarOpen] = useState(false)
  const hoheMassnahmen = ergebnis.massnahmen.filter((m) => m.wirksamkeit === 'hoch')

  return (
    <>
      <section className="panel exposure-ampel-panel">
        <div className={`exposure-ampel-large exposure-ampel-${ergebnis.ampel}`} aria-hidden="true" />
        <div>
          <p className="exposure-ampel-label">{AMPEL_LABEL[ergebnis.ampel]}</p>
          <p>{AMPEL_SATZ[ergebnis.ampel]}</p>
        </div>
      </section>

      {ergebnis.trifecta.erfuellt && (
        <section className="panel exposure-trifecta-panel">
          <h2>Gefährliche Kombination erkannt</h2>
          <p>
            Die KI liest Inhalte, die von außen kommen. In solchen Inhalten können versteckte Anweisungen stehen
            (<AbbrGlossar begriff="Prompt Injection" />). Die KI hat gleichzeitig Zugriff auf vertrauliche Daten
            und einen Weg, Daten nach außen zu schicken. Damit kann jemand von außen die KI dazu bringen, eure
            Daten zu verschicken (<AbbrGlossar begriff="Exfiltration" />) — ohne dass jemand bei euch etwas davon
            merkt.
          </p>
          <ul className="exposure-trifecta-liste">
            <li className={ergebnis.trifecta.privateDaten ? 'erfuellt' : 'nicht-erfuellt'}>
              {ergebnis.trifecta.privateDaten ? '✓' : '–'} Zugriff auf vertrauliche oder personenbezogene Daten
            </li>
            <li className={ergebnis.trifecta.untrusted ? 'erfuellt' : 'nicht-erfuellt'}>
              {ergebnis.trifecta.untrusted ? '✓' : '–'} Verarbeitet Inhalte von außen
            </li>
            <li className={ergebnis.trifecta.exfiltration ? 'erfuellt' : 'nicht-erfuellt'}>
              {ergebnis.trifecta.exfiltration ? '✓' : '–'} Hat einen Weg, Daten nach außen zu schicken
            </li>
          </ul>
        </section>
      )}

      {hoheMassnahmen.length > 0 && (
        <section className="panel">
          <div className="panel-heading">
            <h2>Was zu tun ist</h2>
          </div>
          <ol className="exposure-massnahmen-liste">
            {hoheMassnahmen.map((m) => (
              <li key={m.id}>{m.normal}</li>
            ))}
          </ol>
        </section>
      )}

      <section className="panel exposure-glossar">
        <button
          type="button"
          className="inline-link"
          onClick={() => setGlossarOpen((v) => !v)}
          aria-expanded={glossarOpen}
        >
          Begriffe erklärt {glossarOpen ? '↑' : '↓'}
        </button>
        {glossarOpen && (
          <dl>
            {GLOSSAR.map((eintrag) => (
              <div key={eintrag.begriff} className="exposure-glossar-eintrag">
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

function SpecialistAnsicht({ ergebnis, useCase }: { ergebnis: ExposureErgebnis; useCase: UseCase }) {
  const summeBeitrag = ergebnis.faktoren.reduce((summe, faktor) => summe + faktor.beitrag, 0)
  const summeVerschaerfung = ergebnis.verschaerfungen.reduce((summe, v) => summe + v.wert, 0)
  const vorDeckelung = summeBeitrag + summeVerschaerfung

  const exfiltrationAusloeser = [
    useCase.externeKommunikation ? 'externeKommunikation' : null,
    ...useCase.tools.filter((tool) => EXFILTRATION_TOOLS.includes(tool)),
  ].filter((entry): entry is string => Boolean(entry))

  return (
    <>
      <section className="panel exposure-stufe-panel">
        <div className={`score-badge-large exposure-stufe-${ergebnis.stufe.toLowerCase()}`}>{ergebnis.stufe}</div>
        <div>
          <p className="exposure-risikowert">
            Risikowert: <strong>{ergebnis.risikoWert.toFixed(2)}</strong>
          </p>
          <p>
            <span
              className={`fleet-ampel-dot ${
                ergebnis.ampel === 'gruen' ? 'fleet-ampel-good' : ergebnis.ampel === 'gelb' ? 'fleet-ampel-warn' : 'fleet-ampel-bad'
              }`}
              aria-hidden="true"
            />
            Ampel: {AMPEL_LABEL[ergebnis.ampel]}
          </p>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Lethal-Trifecta-Matrix</h2>
          <p>
            Nach Simon Willison (2025): Erst die Kombination aller drei Bedingungen ermöglicht Exfiltration durch
            Prompt Injection, ohne dass sie durch Filter zuverlässig verhindert werden kann.
          </p>
        </div>
        <div className="table-wrap">
          <table className="analysis-table">
            <thead>
              <tr>
                <th>Bedingung</th>
                <th>Erfüllt</th>
                <th>Ausgelöst durch</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Private Daten</td>
                <td>{ergebnis.trifecta.privateDaten ? 'Ja' : 'Nein'}</td>
                <td>datenklasse = {useCase.datenklasse}</td>
              </tr>
              <tr>
                <td>Untrusted Input</td>
                <td>{ergebnis.trifecta.untrusted ? 'Ja' : 'Nein'}</td>
                <td>untrustedInput = {String(useCase.untrustedInput)}</td>
              </tr>
              <tr>
                <td>Exfiltrationskanal</td>
                <td>{ergebnis.trifecta.exfiltration ? 'Ja' : 'Nein'}</td>
                <td>{exfiltrationAusloeser.length > 0 ? exfiltrationAusloeser.join(', ') : '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className={`exposure-trifecta-status ${ergebnis.trifecta.erfuellt ? 'erfuellt' : ''}`}>
          {ergebnis.trifecta.erfuellt
            ? 'Trifecta erfüllt — Stufe wird unabhängig vom Risikowert auf KRITISCH gesetzt.'
            : 'Trifecta nicht erfüllt — Stufe ergibt sich aus dem Risikowert.'}
        </p>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Faktoren</h2>
          <p>Risikowert (Basis) = Σ (Rohwert × Gewicht). Verschärfungen kommen danach separat dazu.</p>
        </div>
        <div className="table-wrap">
          <table className="analysis-table">
            <thead>
              <tr>
                <th>Faktor</th>
                <th>Rohwert</th>
                <th>Gewicht</th>
                <th>Beitrag</th>
              </tr>
            </thead>
            <tbody>
              {ergebnis.faktoren.map((faktor) => (
                <tr key={faktor.id}>
                  <td>{faktor.label}</td>
                  <td>{faktor.wert.toFixed(2)}</td>
                  <td>{faktor.gewicht.toFixed(2)}</td>
                  <td>{faktor.beitrag.toFixed(3)}</td>
                </tr>
              ))}
              <tr className="exposure-summenzeile">
                <td colSpan={3}>Summe (Basis)</td>
                <td>{summeBeitrag.toFixed(3)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Verschärfungen</h2>
          <p>Kombinationen, die additiv nicht abgebildet sind, aber real gefährlicher — sie fließen nicht still ein.</p>
        </div>
        {ergebnis.verschaerfungen.length === 0 ? (
          <p className="helper-note">Keine Verschärfungen ausgelöst.</p>
        ) : (
          <ul className="exposure-verschaerfungen-liste">
            {ergebnis.verschaerfungen.map((v) => (
              <li key={v.id}>
                <strong>+{v.wert.toFixed(2)}</strong> {v.label} — {v.begruendung}
              </li>
            ))}
          </ul>
        )}
        <p className="exposure-summenzeile-text">
          Basis {summeBeitrag.toFixed(3)} + Verschärfungen {summeVerschaerfung.toFixed(2)} = {vorDeckelung.toFixed(3)}
          {vorDeckelung > 1 ? ' → gedeckelt auf 1.000' : ''} = Risikowert {ergebnis.risikoWert.toFixed(3)}
        </p>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>OWASP Top 10 for LLM Applications (2025)</h2>
        </div>
        {ergebnis.owasp.length === 0 ? (
          <p className="helper-note">Keine Treffer auf Basis der aktuellen Angaben.</p>
        ) : (
          <ul className="exposure-owasp-liste">
            {ergebnis.owasp.map((treffer) => (
              <li key={treffer.id}>
                <span className="owasp-badge">{treffer.id}</span>
                <strong>{treffer.titel}</strong>
                <p>{treffer.begruendung}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Maßnahmen</h2>
        </div>
        <ul className="exposure-massnahmen-liste-specialist">
          {ergebnis.massnahmen.map((massnahme) => (
            <li key={massnahme.id}>
              <div className="exposure-massnahme-head">
                <span className={`massnahme-wirksamkeit wirksamkeit-${massnahme.wirksamkeit}`}>
                  {WIRKSAMKEIT_LABEL[massnahme.wirksamkeit]}
                </span>
                <span className="exposure-massnahme-ausloeser">{massnahme.ausloeser}</span>
              </div>
              <p>{massnahme.specialist}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <p className="helper-note">
          Hinweis: <strong>Biometrisch</strong> und <strong>Emotionserkennung</strong> sind Felder, die im
          Normal-Modus nicht angezeigt werden. Ohne einen Wechsel in den Specialist-Modus blieben sie auf ihrem
          Standardwert „Nein" stehen — das kann die Bewertung verändern, falls einer der beiden Fälle tatsächlich
          zutrifft.
        </p>
      </section>
    </>
  )
}

function Disclaimer({ ausfuehrlich }: { ausfuehrlich: boolean }) {
  return (
    <section className="panel exposure-disclaimer">
      <p>
        Heuristische Ersteinschätzung auf Basis der eingegebenen Angaben. Ersetzt keine Bedrohungsmodellierung,
        kein Penetrationstest, keine Risikoanalyse nach ISO 27005. Die Gewichtungen sind gesetzt, nicht empirisch
        validiert.
        {ausfuehrlich && (
          <>
            {' '}
            Die fünf Teilfaktoren und ihre Gewichte (25/25/20/15/15 %) sowie die beiden Verschärfungen beruhen auf
            einer fachlichen Einschätzung, nicht auf einer statistischen Herleitung aus Vorfalldaten. Die
            Lethal-Trifecta-Regel ist bewusst als Hard-Rule statt als gewichteter Faktor umgesetzt, weil Prompt
            Injection nach aktuellem Stand nicht zuverlässig durch Filter lösbar ist. Bei Zweifeln an der
            Einstufung: vor einer Entscheidung auf dieser Basis Rücksprache halten.
          </>
        )}
      </p>
    </section>
  )
}
