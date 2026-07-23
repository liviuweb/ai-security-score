import { useViewMode } from '../ViewModeContext'
import {
  AUTONOMIE_RISIKO,
  DATEN_RISIKO,
  DEPLOYMENT_RISIKO,
  EXFILTRATION_TOOLS,
  GEWICHT_AUTONOMIE,
  GEWICHT_DATEN,
  GEWICHT_DEPLOYMENT,
  GEWICHT_REICHWEITE,
  GEWICHT_TOOLS,
  REICHWEITE_LOG_OBERGRENZE,
  STUFE_SCHWELLE_B,
  STUFE_SCHWELLE_C,
  STUFE_SCHWELLE_D,
  STUFE_SCHWELLE_E,
  TOOL_RISIKO,
  TOOL_SAETTIGUNG,
  VERSCHAERFUNG_AUTONOM_UNTRUSTED,
  VERSCHAERFUNG_BESONDERE_CONSUMER,
} from '../exposure'
import {
  AIACT_FRISTEN,
  AIACT_FRISTEN_HINWEIS,
  AIACT_VERORDNUNG,
  SELBSTPRUEFUNG_VERBOTSTATBESTAENDE,
} from '../aiact'

function wertebereich(record: Record<string, number>): string {
  const werte = Object.values(record)
  return `${Math.min(...werte).toFixed(2)} – ${Math.max(...werte).toFixed(2)}`
}

const MONATE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]

function formatDatum(iso: string): string {
  const [jahr, monat, tag] = iso.split('-').map(Number)
  return `${tag}. ${MONATE[monat - 1]} ${jahr}`
}

const FAKTOREN_TABELLE = [
  { label: 'Datenrisiko', gewicht: GEWICHT_DATEN, bereich: `${wertebereich(DATEN_RISIKO)} (je Datenklasse)` },
  { label: 'Tool-Risiko', gewicht: GEWICHT_TOOLS, bereich: '0.00 – 1.00 (Summe der Tool-Werte ÷ TOOL_SÄTTIGUNG, gedeckelt)' },
  { label: 'Autonomie-Risiko', gewicht: GEWICHT_AUTONOMIE, bereich: `${wertebereich(AUTONOMIE_RISIKO)} (je Autonomiegrad)` },
  { label: 'Deployment-Risiko', gewicht: GEWICHT_DEPLOYMENT, bereich: `${wertebereich(DEPLOYMENT_RISIKO)} (je Deployment)` },
  { label: 'Reichweite', gewicht: GEWICHT_REICHWEITE, bereich: `0.00 – 1.00 (log10(Betroffene) ÷ ${REICHWEITE_LOG_OBERGRENZE}, gedeckelt)` },
]

const OWASP_ABGEBILDET = [
  { id: 'LLM01', titel: 'Prompt Injection', bedingung: 'untrustedInput = true' },
  { id: 'LLM02', titel: 'Sensitive Information Disclosure', bedingung: 'datenklasse ≠ öffentlich UND (externeKommunikation ODER deployment = consumer)' },
  { id: 'LLM05', titel: 'Improper Output Handling', bedingung: 'tools enthält code_ausfuehren ODER datenbank_schreiben' },
  { id: 'LLM06', titel: 'Excessive Agency', bedingung: 'autonomie = autonom ODER (≥ 3 Tools UND autonomie ≠ vorschlag)' },
  { id: 'LLM08', titel: 'Vector and Embedding Weaknesses', bedingung: 'tools enthält datenbank_lesen UND untrustedInput = true' },
  { id: 'LLM10', titel: 'Unbounded Consumption', bedingung: 'betroffene > 100.000' },
]

const ABGEBILDETE_ARTIKEL = [
  'Art. 4 — KI-Kompetenz',
  'Art. 5 Abs. 1 lit. f — Verbot der Emotionserkennung am Arbeitsplatz',
  'Art. 6 Abs. 2 i. V. m. Anhang III Nr. 4 — Hochrisiko im Beschäftigungskontext',
  'Art. 6 Abs. 3 — Ausnahme für vorbereitende/eng begrenzte Aufgaben',
  'Anhang III Nr. 1 — biometrische Systeme (als Grenzfall ausgewiesen)',
  'Art. 26 Abs. 1, 2, 4, 5, 6, 7, 11 — Betreiberpflichten bei Hochrisiko',
  'Art. 27 — Grundrechte-Folgenabschätzung (bedingte Pflicht)',
  'Art. 50 Abs. 1, 3, 4 — Transparenzpflichten',
]

export function MethodikTab() {
  const { mode } = useViewMode()
  return mode === 'specialist' ? <SpecialistMethodik /> : <NormalMethodik />
}

function NormalMethodik() {
  return (
    <div className="methodik-shell">
      <section className="panel hero-card">
        <p className="eyebrow">Methodik (Kurzfassung)</p>
        <h2>Wie die Bewertung zustande kommt</h2>
      </section>

      <section className="panel">
        <h3>Exposure (Sicherheitsrisiko)</h3>
        <p>
          Fünf Merkmale eures Use-Cases — welche Daten, welche Werkzeuge, wie viel Selbstständigkeit, welche
          Betriebsart, wie viele Betroffene — fließen gewichtet in einen Risikowert von 0 bis 1 ein. Eine besonders
          gefährliche Kombination aus drei Bedingungen (vertrauliche Daten, fremde Inhalte, ein Weg nach außen)
          überschreibt dieses Ergebnis unabhängig vom Rechenwert.
        </p>
      </section>

      <section className="panel">
        <h3>AI Act (rechtliche Einordnung)</h3>
        <p>
          Anhand eurer Angaben prüft das Tool, ob eine verbotene Praxis, eine Hochrisiko-Kategorie oder eine
          Transparenzpflicht nach dem AI Act vorliegt. Wo die Einordnung Ermessen erfordert, wird das als
          „Grenzfall" ausgewiesen statt als sichere Antwort behauptet.
        </p>
      </section>

      <section className="panel">
        <h3>Grenzen</h3>
        <p>
          Die Gewichte sind fachlich gesetzt, nicht wissenschaftlich validiert. Das Tool ersetzt keine
          Bedrohungsmodellierung und keine Rechtsberatung. Wechselt in den Specialist-Modus für die vollständige
          Offenlegung aller Zahlen, Schwellen und Artikelverweise.
        </p>
      </section>
    </div>
  )
}

function SpecialistMethodik() {
  return (
    <div className="methodik-shell">
      <section className="panel hero-card">
        <p className="eyebrow">Methodik (vollständig)</p>
        <h2>Alle Gewichte, Schwellen und Quellen</h2>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Exposure — Faktoren</h2>
          <p>Risikowert = Σ (Rohwert × Gewicht) + Verschärfungen, gedeckelt bei 1.0.</p>
        </div>
        <div className="table-wrap">
          <table className="analysis-table">
            <thead>
              <tr><th>Faktor</th><th>Gewicht</th><th>Wertebereich</th></tr>
            </thead>
            <tbody>
              {FAKTOREN_TABELLE.map((f) => (
                <tr key={f.label}>
                  <td>{f.label}</td>
                  <td>{f.gewicht.toFixed(2)}</td>
                  <td>{f.bereich}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3>Tool-Einzelwerte</h3>
        <div className="table-wrap">
          <table className="analysis-table">
            <thead>
              <tr><th>Tool</th><th>Wert</th></tr>
            </thead>
            <tbody>
              {Object.entries(TOOL_RISIKO).map(([tool, wert]) => (
                <tr key={tool}>
                  <td>{tool}</td>
                  <td>{wert.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="helper-note">
          TOOL_SÄTTIGUNG = {TOOL_SAETTIGUNG}: Die Summe der Tool-Werte wird durch diese Zahl geteilt und bei 1.0
          gedeckelt — ab dieser Schwelle ändern weitere Tools das Bild nicht mehr nennenswert.
        </p>

        <h3>Stufen-Schwellen</h3>
        <p>
          A &lt; {STUFE_SCHWELLE_B.toFixed(2)} ≤ B &lt; {STUFE_SCHWELLE_C.toFixed(2)} ≤ C &lt;{' '}
          {STUFE_SCHWELLE_D.toFixed(2)} ≤ D &lt; {STUFE_SCHWELLE_E.toFixed(2)} ≤ E
        </p>

        <h3>Verschärfungen</h3>
        <ul>
          <li>
            <strong>+{VERSCHAERFUNG_AUTONOM_UNTRUSTED.toFixed(2)}</strong> wenn autonomie = autonom UND
            untrustedInput = true (Injection ohne menschliche Zwischenkontrolle).
          </li>
          <li>
            <strong>+{VERSCHAERFUNG_BESONDERE_CONSUMER.toFixed(2)}</strong> wenn datenklasse = besondere_kategorien
            UND deployment = consumer (Art.-9-Daten ohne AVV).
          </li>
        </ul>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Lethal Trifecta</h2>
        </div>
        <p>
          Konzept nach Simon Willison (2025): Zugriff auf private Daten, Verarbeitung nicht vertrauenswürdiger
          Inhalte und ein Kanal nach außen ermöglichen zusammen Exfiltration durch Prompt Injection, ohne dass es
          bemerkt wird. Prompt Injection ist nach aktuellem Stand nicht zuverlässig durch Filter lösbar — deshalb
          ist die Trifecta hier eine Hard-Rule statt eines gewichteten Faktors: Sind alle drei Bedingungen erfüllt,
          überschreibt das jede graduelle Bewertung und setzt die Stufe unabhängig vom Risikowert auf KRITISCH.
        </p>
        <p>
          <strong>Warum Websuche als Exfiltrationskanal zählt:</strong> Ein Websuche-Tool ist ein Exfiltrationskanal,
          weil eine injizierte Anweisung Daten in eine Suchanfrage bzw. URL kodieren kann, die das Tool anschließend
          abruft — das Tool selbst muss dafür nicht kompromittiert sein, es reicht als Transportweg. Als
          Exfiltrationskanäle gelten: {EXFILTRATION_TOOLS.join(', ')}.
        </p>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>OWASP-Mapping</h2>
          <p>OWASP Top 10 for LLM Applications 2025 — nur Treffer, die die Eingabedaten tatsächlich hergeben.</p>
        </div>
        <div className="table-wrap">
          <table className="analysis-table">
            <thead>
              <tr><th>ID</th><th>Titel</th><th>Trefferbedingung</th></tr>
            </thead>
            <tbody>
              {OWASP_ABGEBILDET.map((eintrag) => (
                <tr key={eintrag.id}>
                  <td>{eintrag.id}</td>
                  <td>{eintrag.titel}</td>
                  <td>{eintrag.bedingung}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>AI Act</h2>
          <p>Stand der Verordnung: {AIACT_VERORDNUNG}.</p>
        </div>

        <h3>Fristen</h3>
        <ul className="methodik-fristen-liste">
          {AIACT_FRISTEN.map((frist) => (
            <li key={frist.datum}>
              <strong>{formatDatum(frist.datum)}</strong>: {frist.bezeichnung}
            </li>
          ))}
        </ul>
        <p className="helper-note">{AIACT_FRISTEN_HINWEIS}</p>

        <h3>Abgebildete Artikel</h3>
        <ul>
          {ABGEBILDETE_ARTIKEL.map((artikel) => (
            <li key={artikel}>{artikel}</li>
          ))}
        </ul>

        <h3>Was dieses Tool nicht abbildet</h3>
        <ul>
          <li>GPAI-Pflichten nach Art. 53 ff. (General-Purpose-AI-Modelle)</li>
          <li>Konformitätsbewertungsverfahren für Hochrisiko-Systeme</li>
          <li>Anhang-I-Produkte (Produktsicherheitsrecht, z. B. Maschinen, Medizinprodukte)</li>
          <li>
            Nicht ableitbare Verbotstatbestände:
            <ul>
              {SELBSTPRUEFUNG_VERBOTSTATBESTAENDE.map((eintrag) => (
                <li key={eintrag}>{eintrag}</li>
              ))}
            </ul>
          </li>
        </ul>
      </section>

      <section className="panel methodik-grenzen">
        <div className="panel-heading">
          <h2>Grenzen</h2>
        </div>
        <ul>
          <li>Die Gewichtungen in Exposure sind fachlich gesetzt, nicht empirisch validiert.</li>
          <li>Keine Bedrohungsmodellierung, kein Penetrationstest, keine Risikoanalyse nach ISO 27005.</li>
          <li>Keine Rechtsberatung — die AI-Act-Klassifikation ist eine vorläufige Einordnung.</li>
          <li>
            Stand der Datenlage: OWASP-Liste und AI-Act-Fristen können sich ändern; dieses Tool spiegelt den Stand
            zum Zeitpunkt der letzten Aktualisierung wider, nicht zwingend den aktuell gültigen.
          </li>
        </ul>
      </section>
    </div>
  )
}
