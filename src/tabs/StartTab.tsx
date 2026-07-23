import { useViewMode } from '../ViewModeContext'
import heroStart from '../assets/hero-start.jpg'
import injectionImg from '../assets/injection.jpg'
import trifectaImg from '../assets/trifecta.jpg'

type TabKey = 'start' | 'usecase' | 'exposure' | 'compliance' | 'bibliothek' | 'methodik'

interface StartTabProps {
  onNavigate?: (tab: TabKey) => void
}

export function StartTab({ onNavigate }: StartTabProps) {
  const { mode } = useViewMode()

  return mode === 'specialist' ? <SpecialistUebersicht onNavigate={onNavigate} /> : <NormalEinfuehrung onNavigate={onNavigate} />
}

function HeroMedia({ compact }: { compact: boolean }) {
  return (
    <div className={`start-hero-media ${compact ? 'start-hero-compact' : ''}`}>
      <img src={heroStart} alt="" className="start-hero-img" loading="eager" />
      <div className="start-hero-overlay">
        <h1>AI-Security-Score</h1>
      </div>
    </div>
  )
}

function NormalEinfuehrung({ onNavigate }: StartTabProps) {
  return (
    <div className="start-shell">
      <section className="panel hero-card">
        <HeroMedia compact={false} />
        <p className="eyebrow">Was ist AI Security?</p>
        <h2>Fünf Dinge, die ihr wissen solltet, bevor ihr einen KI-Einsatz plant</h2>
      </section>

      <section className="panel">
        <h3>1. Worum es hier geht</h3>
        <p>
          Dieses Tool schätzt ein, wie riskant ein geplanter KI-Einsatz ist und welche Regeln dafür gelten. Dazu
          beantwortet ihr ein paar Fragen zu eurem Use-Case im Tab „Use-Case" — der Rest wird automatisch berechnet.
          Es ersetzt keine Prüfung, aber es zeigt, wo man genauer hinschauen muss, bevor ein KI-Projekt live geht.
          Bei Unsicherheit hilft das AI Security Chapter weiter.
        </p>
      </section>

      <section className="panel">
        <h3>2. Prompt Injection — versteckte Anweisungen</h3>
        <div className="start-inline-section">
          <p>
            Wenn eine KI Texte liest, die von außen kommen, kann sie darin versteckte Anweisungen finden und
            ausführen. Sie unterscheidet nicht zuverlässig zwischen „das soll ich lesen" und „das soll ich tun".
            Ein Beispiel: In einer Webseite steht in weißer Schrift auf weißem Grund eine Anweisung an die KI. Ein
            Mensch sieht sie nicht — die KI liest sie trotzdem und kann ihr folgen.
          </p>
          <img src={injectionImg} alt="" className="inline-bild" loading="lazy" />
        </div>
      </section>

      <section className="panel">
        <h3>3. Die gefährliche Dreier-Kombination</h3>
        <div className="start-inline-section">
          <img src={trifectaImg} alt="" className="inline-bild" loading="lazy" />
          <p>
            Manche KI-Systeme haben gleichzeitig drei Eigenschaften: Zugriff auf vertrauliche Daten, die Fähigkeit,
            fremde Inhalte zu verarbeiten, und einen Weg, Daten nach außen zu schicken. Jede einzelne Eigenschaft
            für sich ist unproblematisch. Erst alle drei zusammen machen es möglich, dass jemand von außen die KI
            dazu bringt, eure Daten zu verschicken — ohne dass ihr etwas davon merkt. Deshalb prüft dieses Tool
            diese Kombination als eigene, besonders strenge Regel.
          </p>
        </div>
      </section>

      <section className="panel">
        <h3>4. Was mit euren Eingaben passiert</h3>
        <p>
          Was ein KI-Anbieter mit euren eingegebenen Daten macht, hängt vom Vertrag ab, den ihr — oder RTL — mit ihm
          habt. Bei geschäftlichen Verträgen ist meist vertraglich ausgeschlossen, dass Eingaben zum Training
          verwendet werden. Bei privaten, kostenlosen Zugängen ohne Vertrag müsst ihr dagegen davon ausgehen, dass
          eure Eingaben gespeichert und zum Training verwendet werden können. Für vertrauliche oder
          personenbezogene Daten ist ein privater Zugang deshalb keine gute Wahl.
        </p>
      </section>

      <section className="panel">
        <h3>5. Wann ihr fragen solltet</h3>
        <p>
          Es gibt ein paar klare Signale, bei denen ihr vor dem Start Rücksprache halten solltet: Die KI
          verarbeitet personenbezogene Daten, sie trifft oder beeinflusst Entscheidungen über Menschen, sie kann
          selbstständig handeln, ohne dass jemand gegenprüft, ihre Ergebnisse gehen an die Öffentlichkeit, oder sie
          verarbeitet Inhalte von außen. Trifft eines dieser Signale zu, meldet euch beim AI Security Chapter —
          lieber einmal zu früh als zu spät.
        </p>
      </section>

      <section className="panel start-cta">
        <button type="button" className="demo-card-good" onClick={() => onNavigate?.('usecase')}>
          Use-Case prüfen
        </button>
      </section>
    </div>
  )
}

function SpecialistUebersicht({ onNavigate }: StartTabProps) {
  return (
    <div className="start-shell">
      <section className="panel hero-card">
        <HeroMedia compact={true} />
        <p className="eyebrow">Übersicht</p>
        <h2>Was dieses Tool berechnet — und was nicht</h2>
      </section>

      <section className="panel">
        <div className="start-uebersicht-grid">
          <div>
            <h3>Wird berechnet</h3>
            <ul>
              <li>Exposure: Lethal-Trifecta-Hard-Rule, fünf gewichtete Faktoren, zwei Verschärfungen, OWASP-Top-10-für-LLM-Mapping</li>
              <li>AI Act: Entscheidungsbaum über Art. 5, Anhang III und Art. 50, mit Mehrfachzuordnung und Grenzfall-Ausweisung</li>
              <li>Pflichtenkatalog nach Rolle (Betreiber/Anbieter) mit Erfüllungsgrad</li>
              <li>Konkrete, priorisierte Maßnahmen pro erkanntem Risiko</li>
            </ul>
          </div>
          <div>
            <h3>Wird nicht berechnet</h3>
            <ul>
              <li>Bedrohungsmodellierung, Penetrationstest, Risikoanalyse nach ISO 27005</li>
              <li>Rechtsberatung — die Klassifikation ist eine vorläufige Einordnung, kein Gutachten</li>
              <li>Nicht ableitbare Verbotstatbestände (Social Scoring, Manipulation, Echtzeit-Fernidentifizierung, Predictive Policing, Gesichtsbild-Scraping)</li>
              <li>GPAI-Pflichten (Art. 53 ff.), Konformitätsbewertung, Anhang-I-Produkte</li>
            </ul>
          </div>
        </div>
        <p className="helper-note">Vollständige Herleitung aller Gewichte, Schwellen und Artikel im Methodik-Tab.</p>
      </section>

      <section className="panel start-cta">
        <button type="button" className="demo-card-good" onClick={() => onNavigate?.('usecase')}>
          Zum Use-Case
        </button>
        <button type="button" className="demo-card-bad" onClick={() => onNavigate?.('bibliothek')}>
          Zur Bibliothek
        </button>
        <button type="button" className="inline-link" onClick={() => onNavigate?.('methodik')}>
          Zur Methodik →
        </button>
      </section>
    </div>
  )
}
