import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import logoImage from '/logo.png'
import { modelProfiles, scenarios, type ModelClass, type Scenario } from './scenarios'
import { calculateScore, formatCostValue, formatEnergyValue, type ScoreResult } from './score'
import { formatCo2, sanitizeCo2Text } from './formatCo2'
import { classifyPrompt, type TaskType } from './taskClassifier'
import { calculateScalingImpact } from './scaling'
import { getNutriScoreSteps, colors as nutriScoreColors } from './nutriScoreLabel'
import { UsageOverlay } from './UsageOverlay'
import { FeedbackWidget } from './FeedbackWidget'
import { AdminTab } from './AdminTab'
import { PrivacyNotice } from './PrivacyNotice'
import { useUsage } from './UsageContext'
import { useViewMode, type ViewMode } from './ViewModeContext'
import { useAudience } from './AudienceContext'
import { CO2_BUDGET_G } from './dailyScore'
import type { DailyAggregate } from './usageTypes'
import { MODEL_GUIDE, MODEL_GUIDE_STAND } from './modelGuide'
import { useTrackVisit } from './hooks/useTrackVisit'
import {
  B2B_ACCENT,
  B2B_ACCENT_TINT,
  BUSINESS_USE_CASES,
  calculateFleet,
  checkCompliance,
  DAYS_PER_MONTH,
  DEFAULT_COMPLIANCE_POLICY,
  generateFleetHistory,
  toScenario as buildScenarioFromUseCase,
  type CompliancePolicy,
  type FleetHistoryPoint,
  type Letter,
} from './businessData'

type TabKey = 'einfuehrung' | 'dashboard' | 'rechner' | 'vergleich' | 'skalierung' | 'bibliothek' | 'methodik' | 'verlauf' | 'admin'

// Einmalige Definition von Label/Icon pro Tab. Welche Tabs sichtbar sind, hängt vom
// Audience-Modus ab (siehe PRIVAT_TABS/UNTERNEHMEN_TABS) — Privat ist die schlanke
// Alltags-App, Unternehmen die volle Analyse-Suite. Kein Tab-Inhalt ändert sich hier,
// nur welche Einträge in der Sidebar erscheinen.
const TAB_META: Record<TabKey, { label: string; icon: string }> = {
  einfuehrung: { label: 'Einführung', icon: '▶' },
  dashboard: { label: 'Dashboard', icon: '◉' },
  rechner: { label: 'Rechner', icon: '⌘' },
  vergleich: { label: 'Vergleich', icon: '⇄' },
  skalierung: { label: 'Skalierung', icon: '↗' },
  bibliothek: { label: 'Bibliothek', icon: '▤' },
  methodik: { label: 'Hintergrund', icon: '⚙' },
  verlauf: { label: 'Verlauf', icon: '◔' },
  admin: { label: 'Admin', icon: '🔒' },
}

// Admin ist bewusst in beiden Audiences sichtbar — passwortgeschützt, orthogonal zu
// Privat/Unternehmen, da es Besuche + Feedback über die ganze App hinweg auswertet.
const PRIVAT_TABS: TabKey[] = ['einfuehrung', 'rechner', 'vergleich', 'verlauf', 'admin']
const UNTERNEHMEN_TABS: TabKey[] = ['einfuehrung', 'dashboard', 'rechner', 'vergleich', 'skalierung', 'bibliothek', 'methodik', 'admin']

const modelShortLabel: Record<ModelClass, string> = {
  klein: 'Klein',
  mittel: 'Mittel',
  gross: 'Groß',
}

const DEMO_STEPS: Array<{
  scenarioId?: string
  model?: ModelClass
  headline: string
  explanation: string
}> = [
  {
    scenarioId: 'clock',
    model: 'gross',
    headline: 'Eine ganz einfache Frage.',
    explanation: '„Wie spät ist es?" — beantwortet vom größten Modell. Schau dir den Score an.',
  },
  {
    headline: 'Jetzt du: wähl das kleine Modell.',
    explanation: 'Klick oben auf „kleines Modell" und beobachte den Buchstaben.',
  },
  {
    scenarioId: 'analysis',
    model: 'gross',
    headline: 'Und andersherum?',
    explanation:
      'Eine komplexe Analyse — hier ist das große Modell genau richtig. A heißt: Aufwand und Aufgabe passen zusammen.',
  },
]

const taskTypeMeta: Record<TaskType, { label: string; icon: string; tone: string }> = {
  trivial: { label: 'trivial', icon: '⚡', tone: 'tone-trivial' },
  fakten: { label: 'fakten', icon: '📚', tone: 'tone-fakten' },
  kreativ: { label: 'kreativ', icon: '🎨', tone: 'tone-kreativ' },
  analyse: { label: 'analyse', icon: '📊', tone: 'tone-analyse' },
  code: { label: 'code', icon: '💻', tone: 'tone-code' },
  generierung: { label: 'generierung', icon: '🖼️', tone: 'tone-generierung' },
}

interface TabProps {
  selectedScenarioId: string
  selectedModel: ModelClass
  selectedScenario: Scenario
  result: ScoreResult
  onScenarioChange: (value: string) => void
  onModelChange: (value: ModelClass) => void
  onJumpToDemo: (scenarioId: string, model: ModelClass) => void
}

function App() {
  useTrackVisit()
  const [activeTab, setActiveTab] = useState<TabKey>('einfuehrung')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [selectedScenarioId, setSelectedScenarioId] = useState(scenarios[0].id)
  const [selectedModel, setSelectedModel] = useState<ModelClass>('gross')
  const [demoStep, setDemoStep] = useState<number | null>(null)
  const [modeBeforeDemo, setModeBeforeDemo] = useState<ViewMode | null>(null)
  const [feedback, setFeedback] = useState<Record<string, 'ja' | 'nein'>>({})
  const { mode, setMode } = useViewMode()
  const { audience, setAudience, isBusiness } = useAudience()
  const [prevAudience, setPrevAudience] = useState(audience)

  const recordFeedback = (scenarioId: string, model: ModelClass, value: 'ja' | 'nein') => {
    setFeedback((prev) => ({ ...prev, [`${scenarioId}-${model}`]: value }))
  }

  const selectedScenario = useMemo(
    () => scenarios.find((scenario) => scenario.id === selectedScenarioId) ?? scenarios[0],
    [selectedScenarioId],
  )

  const result = useMemo(() => calculateScore(selectedScenario, selectedModel), [selectedScenario, selectedModel])
  const nutriScoreSteps = useMemo(() => getNutriScoreSteps(result.letter), [result.letter])
  const comparisonModelClass: ModelClass = selectedModel === 'klein' ? 'gross' : 'klein'
  const comparisonResult = useMemo(
    () => calculateScore(selectedScenario, comparisonModelClass),
    [selectedScenario, comparisonModelClass],
  )

  const jumpToDemo = (scenarioId: string, model: ModelClass) => {
    setSelectedScenarioId(scenarioId)
    setSelectedModel(model)
  }

  const loadInRechner = (scenarioId: string) => {
    setSelectedScenarioId(scenarioId)
    setActiveTab('rechner')
  }

  const startDemo = () => {
    const step = DEMO_STEPS[0]
    setModeBeforeDemo(mode)
    setMode('einfach')
    if (step.scenarioId) setSelectedScenarioId(step.scenarioId)
    if (step.model) setSelectedModel(step.model)
    setActiveTab('rechner')
    setDemoStep(0)
  }

  const closeDemo = () => {
    setDemoStep(null)
    if (modeBeforeDemo !== null) {
      setMode(modeBeforeDemo)
      setModeBeforeDemo(null)
    }
  }

  const advanceDemo = () => {
    const next = (demoStep ?? 0) + 1
    if (next < DEMO_STEPS.length) {
      const step = DEMO_STEPS[next]
      if (step.scenarioId) setSelectedScenarioId(step.scenarioId)
      if (step.model) setSelectedModel(step.model)
      setDemoStep(next)
    } else {
      closeDemo()
    }
  }

  const visibleTabIds = isBusiness ? UNTERNEHMEN_TABS : PRIVAT_TABS
  const tabs = visibleTabIds.map((id) => ({ id, ...TAB_META[id] }))

  // Tab-Fallback beim Umschalten: direkt beim Rendern anpassen (statt in einem Effect),
  // damit kein ungültiger Zwischenzustand sichtbar wird und kein Extra-Render-Zyklus
  // entsteht. Siehe https://react.dev/learn/you-might-not-need-an-effect
  if (audience !== prevAudience) {
    setPrevAudience(audience)
    if (!visibleTabIds.includes(activeTab)) {
      setActiveTab(isBusiness ? 'dashboard' : 'rechner')
    }
  }

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? 'mobile-nav-open' : ''}`}>
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <img className="brand-mark" src={logoImage} alt="KI-Nutri-Score Logo" />
            <div>
              <p className="brand-title">Nutri-Score</p>
              <p className="brand-subtitle">Angemessenheit</p>
            </div>
          </div>

          <button
            type="button"
            className="mobile-nav-toggle"
            aria-label="Navigation öffnen"
            aria-expanded={mobileNavOpen}
            aria-controls="mobile-sidebar-nav"
            onClick={() => setMobileNavOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        <div className="mobile-nav-panel">
          <nav className={`sidebar-nav ${mobileNavOpen ? 'open' : ''}`} id="mobile-sidebar-nav" aria-label="KI-Nutri-Score Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`sidebar-link ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(tab.id)
                  setMobileNavOpen(false)
                }}
              >
                <span className="sidebar-icon">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          <div className="audience-section">
          <p className="sidebar-heading">Ansicht für</p>
          <div className="audience-toggle" role="group" aria-label="Privat- oder Unternehmens-Ansicht">
            <button
              type="button"
              className={`audience-btn ${audience === 'privat' ? 'active' : ''}`}
              onClick={() => setAudience('privat')}
            >
              Privat
            </button>
            <button
              type="button"
              className={`audience-btn ${audience === 'unternehmen' ? 'active' : ''}`}
              onClick={() => setAudience('unternehmen')}
            >
              Unternehmen
            </button>
          </div>
        </div>

          <div className="viewmode-toggle" role="group" aria-label="Anzeige-Modus">
            <button
              type="button"
              className={`viewmode-btn ${mode === 'einfach' ? 'active' : ''}`}
              onClick={() => setMode('einfach')}
            >
              Einfach
            </button>
            <button
              type="button"
              className={`viewmode-btn ${mode === 'erweitert' ? 'active' : ''}`}
              onClick={() => setMode('erweitert')}
            >
              Erweitert
            </button>
          </div>
          {mode === 'einfach' && <p className="sidebar-legend">Zeigt nur das Wesentliche.</p>}

          <div className="nutri-score-sidebar" aria-label="Nutri-Score-Label">
            {nutriScoreSteps.map((step) => (
              <div
                key={step.letter}
                className={`nutri-score-letter ${step.active ? 'active' : ''}`}
                style={{ opacity: step.opacity, color: step.color }}
              >
                {step.letter}
              </div>
            ))}
          </div>
          <p className="sidebar-legend">A = sehr angemessen · E = unangemessen</p>
          <PrivacyNotice />
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">
              KI-Nutri-Score MVP
              {isBusiness && (
                <span className="business-badge" style={{ background: B2B_ACCENT }}>
                  Business
                </span>
              )}
            </p>
            <h1>{TAB_META[activeTab].label}</h1>
          </div>
          <div className="topbar-badge">Transparente Heuristik</div>
        </header>

        {demoStep !== null && (
          <DemoOverlay
            step={demoStep}
            result={result}
            canAdvance={demoStep === 1 ? selectedModel === 'klein' : true}
            waitingLabel="Warte auf deine Wahl…"
            onAdvance={advanceDemo}
            onClose={closeDemo}
          />
        )}

        <div className="content-scroll">
          {activeTab === 'einfuehrung' && <EinfuehrungTab onOpenTab={setActiveTab} onStartDemo={startDemo} />}
          {activeTab === 'dashboard' && (
            <DashboardView
              result={result}
              selectedModel={selectedModel}
              onJumpToDemo={jumpToDemo}
              onOpenTab={setActiveTab}
              feedback={feedback}
            />
          )}
          {activeTab === 'rechner' && (
            <RechnerTab
              selectedScenarioId={selectedScenarioId}
              selectedModel={selectedModel}
              selectedScenario={selectedScenario}
              result={result}
              onScenarioChange={setSelectedScenarioId}
              onModelChange={setSelectedModel}
              onJumpToDemo={jumpToDemo}
              onOpenTab={setActiveTab}
              feedback={feedback}
              onFeedback={recordFeedback}
            />
          )}
          {activeTab === 'vergleich' && (
            <VergleichTab
              result={result}
              comparisonResult={comparisonResult}
              selectedModel={selectedModel}
              comparisonModel={comparisonModelClass}
            />
          )}
          {activeTab === 'skalierung' && (
            <SkalierungTab result={result} scenario={selectedScenario} modelClass={selectedModel} />
          )}
          {activeTab === 'bibliothek' && <BibliothekTab scenarios={scenarios} onLoadInRechner={loadInRechner} />}
          {activeTab === 'methodik' && <MethodikTab result={result} />}
          {activeTab === 'verlauf' && <VerlaufTab onOpenTab={setActiveTab} />}
          {activeTab === 'admin' && <AdminTab />}
        </div>
      </section>

      {demoStep === null && (
        <UsageOverlay onClick={() => setActiveTab(isBusiness ? 'dashboard' : 'verlauf')} />
      )}
      <FeedbackWidget />
    </main>
  )
}

function DashboardView({
  selectedModel,
  onJumpToDemo,
  onOpenTab,
  feedback,
}: {
  result: ScoreResult
  selectedModel: ModelClass
  onJumpToDemo: (scenarioId: string, model: ModelClass) => void
  onOpenTab: (tab: TabKey) => void
  feedback: Record<string, 'ja' | 'nein'>
}) {
  const [explainerOpen, setExplainerOpen] = useState(false)
  const { events } = useUsage()
  const { isSimple } = useViewMode()

  const dashboardRows = useMemo(() => {
    const taskToModel: Record<TaskType, ModelClass> = {
      trivial: 'klein',
      fakten: 'mittel',
      kreativ: 'mittel',
      analyse: 'gross',
      code: 'gross',
      generierung: 'gross',
    }

    return scenarios.map((scenario) => {
      const current = calculateScore(scenario, selectedModel)
      const betterFit = calculateScore(scenario, taskToModel[scenario.taskType])
      return {
        scenario,
        current,
        betterFit,
      }
    })
  }, [selectedModel])

  // ── Unternehmens-Modus: Hooks IMMER aufrufen (auch wenn isBusiness gerade false ist),
  // damit ein Umschalten des Audience-Schalters die Hook-Reihenfolge nicht verändert.
  const { isBusiness } = useAudience()
  const [maxScoreForTrivial, setMaxScoreForTrivial] = useState<Letter>(DEFAULT_COMPLIANCE_POLICY.maxScoreForTrivial)
  const policy = useMemo<CompliancePolicy>(
    () => ({ ...DEFAULT_COMPLIANCE_POLICY, maxScoreForTrivial }),
    [maxScoreForTrivial],
  )
  const fleetSummary = useMemo(() => calculateFleet(BUSINESS_USE_CASES, policy), [policy])
  const fleetRows = useMemo(
    () =>
      BUSINESS_USE_CASES.map((useCase) => {
        const scenario = buildScenarioFromUseCase(useCase)
        return {
          useCase,
          currentResult: calculateScore(scenario, useCase.currentModel),
          compliant: checkCompliance(useCase, policy),
        }
      }),
    [policy],
  )
  const fleetHistory = useMemo(() => generateFleetHistory(30), [])

  if (isBusiness) {
    const nonCompliantCount = fleetSummary.totalCount - fleetSummary.compliantCount
    const complianceTone =
      fleetSummary.compliantCount === fleetSummary.totalCount
        ? 'fleet-ampel-good'
        : fleetSummary.compliantCount / fleetSummary.totalCount >= 0.5
          ? 'fleet-ampel-warn'
          : 'fleet-ampel-bad'

    return (
      <div className="dashboard-shell">
        <div className="metric-grid metric-grid-business">
          <article className="metric-card">
            <p className="metric-label">CO₂ pro Monat</p>
            <h3>{formatCo2(fleetSummary.totalCo2PerMonth)}</h3>
            <span>über alle Anwendungsfälle</span>
          </article>
          <article className="metric-card">
            <p className="metric-label">Kosten pro Monat</p>
            <h3>{formatCostValue(fleetSummary.totalCostPerMonth)}</h3>
            <span>aktuelle Modellwahl</span>
          </article>
          <article
            className="metric-card metric-card-highlight"
            style={{ borderColor: B2B_ACCENT, background: B2B_ACCENT_TINT }}
          >
            <p className="metric-label">Einsparpotenzial</p>
            <h3>{formatCostValue(fleetSummary.savingsCostPerMonth)}</h3>
            <span>möglich durch bessere Modellwahl</span>
            <p className="fleet-savings-co2">{formatCo2(fleetSummary.savingsCo2PerMonth)} CO₂ / Monat</p>
          </article>
          <article className="metric-card">
            <p className="metric-label">Compliance</p>
            <h3>
              <span className={`fleet-ampel-dot ${complianceTone}`} aria-hidden="true" />
              {fleetSummary.compliantCount} / {fleetSummary.totalCount}
            </h3>
            <span>Anwendungsfälle richtlinienkonform</span>
          </article>
        </div>

        <section className="panel">
          <div className="panel-heading">
            <h2>KI-Anwendungsfälle</h2>
            <p>Portfolio aller Anwendungsfälle — aktuelle vs. empfohlene Modellwahl.</p>
          </div>
          <div className="table-wrap">
            <table className="analysis-table">
              <thead>
                <tr style={{ borderBottom: `2px solid ${B2B_ACCENT}` }}>
                  <th>Anwendungsfall</th>
                  <th>Typ</th>
                  <th>Anfragen/Tag</th>
                  <th>Aktuell</th>
                  <th>Empfehlung</th>
                  <th>CO₂/Monat</th>
                  <th>Konform</th>
                </tr>
              </thead>
              <tbody>
                {fleetRows.map(({ useCase, currentResult, compliant }) => {
                  const sc = scoreColors[currentResult.letter] ?? scoreColors.C
                  const mismatch = useCase.currentModel !== useCase.recommendedModel
                  const rowClass = !compliant ? 'fleet-row-noncompliant' : mismatch ? 'fleet-row-suboptimal' : ''
                  const monthlyCo2 = currentResult.co2Gram * useCase.requestsPerDay * 30
                  return (
                    <tr key={useCase.id} className={rowClass}>
                      <td>{useCase.name}</td>
                      <td>
                        <span className={`type-badge ${taskTypeMeta[useCase.taskType].tone}`}>
                          {taskTypeMeta[useCase.taskType].icon} {taskTypeMeta[useCase.taskType].label}
                        </span>
                      </td>
                      <td>{useCase.requestsPerDay.toLocaleString('de-DE')}</td>
                      <td>
                        <div className="fleet-model-cell">
                          <span
                            className="task-letter-badge"
                            style={{ color: sc.text, background: sc.bg, borderColor: sc.border }}
                          >
                            {currentResult.letter}
                          </span>
                          {modelShortLabel[useCase.currentModel]}
                        </div>
                      </td>
                      <td>{mismatch ? `→ ${modelShortLabel[useCase.recommendedModel]}` : '—'}</td>
                      <td>{formatCo2(monthlyCo2)}</td>
                      <td>
                        {compliant ? (
                          <span className="fleet-ampel-dot fleet-ampel-good" aria-label="Richtlinienkonform" />
                        ) : (
                          <span className="fleet-ampel-dot fleet-ampel-bad" aria-label="Verletzt die Richtlinie" />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        {!isSimple && (
          <section className="panel">
            <div className="panel-heading">
              <h2>KI-Richtlinie</h2>
              <p>Lege fest, welche Modellwahl für triviale Aufgaben noch akzeptabel ist.</p>
            </div>
            <div className="fleet-policy-row">
              <label className="fleet-policy-select">
                <span>Maximale Note für triviale Aufgaben</span>
                <select
                  value={maxScoreForTrivial}
                  onChange={(event) => setMaxScoreForTrivial(event.target.value as Letter)}
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                  <option value="E">E</option>
                </select>
              </label>
              <span className="fleet-policy-meta">
                Mindestnote insgesamt: <strong>{DEFAULT_COMPLIANCE_POLICY.minScoreOverall}</strong>
              </span>
            </div>
            <p className="fleet-policy-violations">
              {nonCompliantCount} {nonCompliantCount === 1 ? 'Anwendungsfall verletzt' : 'Anwendungsfälle verletzen'} die aktuelle Richtlinie.
            </p>
          </section>
        )}

        {!isSimple && (
          <section className="panel">
            <div className="panel-heading">
              <h2>Nutzung über den Zeitraum</h2>
              <p>CO₂-Verlauf der letzten 30 Tage.</p>
            </div>
            <div className="methodik-hint-box">
              <span className="methodik-hint-icon">ℹ️</span>
              <p>Simulierte Daten aus der Browser-Extension über 30 Tage — zur Veranschaulichung, keine echte Messung.</p>
            </div>
            <FleetHistoryChart points={fleetHistory} />
          </section>
        )}
      </div>
    )
  }

  const distribution = ['A', 'B', 'C', 'D', 'E'].map((letter) => ({
    label: letter,
    count: dashboardRows.filter((row) => row.current.letter === letter).length,
  }))
  const maxDistribution = Math.max(...distribution.map((item) => item.count), 1)

  const nutriBarColors: Record<string, string> = {
    A: '#1b5e20',
    B: '#66bb6a',
    C: '#fdd835',
    D: '#fb8c00',
    E: '#e53935',
  }

  const averageAppropriateness = dashboardRows.reduce((total, row) => total + row.current.appropriateness, 0) / dashboardRows.length
  const averageLetter = averageAppropriateness >= 0.82 ? 'A' : averageAppropriateness >= 0.68 ? 'B' : averageAppropriateness >= 0.5 ? 'C' : averageAppropriateness >= 0.3 ? 'D' : 'E'
  const totalCo2 = dashboardRows.reduce((total, row) => total + row.current.co2Gram, 0)
  const savingsPotential = dashboardRows.reduce((total, row) => total + Math.max(0, row.current.co2Gram - row.betterFit.co2Gram), 0)

  return (
    <div className="dashboard-shell">
      <section className="panel hero-card">
        <p className="eyebrow">KI-Nutri-Score MVP</p>
        <h2>Überblick über die aktuelle Modellstrategie</h2>
        <p className="hero-copy">
          Die Dashboard-Ansicht fasst die wichtigsten Kennzahlen der Beispiel-Szenarien zusammen und macht sofort sichtbar, wo ein passenderes Modell mehr Sinn ergibt.
        </p>
        <div className="hero-highlights">
          <span>📈 Schnellvergleich</span>
          <span>♻️ CO₂ und Kosten im Blick</span>
          <span>🧭 Gute Entscheidungen sichtbar</span>
        </div>
      </section>

      <div className="metric-explainer">
        <button type="button" className="explainer-toggle" onClick={() => setExplainerOpen((v) => !v)}>
          Was zeigen diese Zahlen? <span className="explainer-chevron">{explainerOpen ? '▲' : '▼'}</span>
        </button>
        {explainerOpen && (
          <div className="explainer-content">
            <span><strong>Szenarien bewertet:</strong> Wie viele Beispielaufgaben aktuell analysiert werden.</span>
            <span><strong>Ø Score:</strong> Der mittlere Buchstabe aller Szenarien mit der gewählten Modellklasse.</span>
            <span><strong>CO₂ gesamt:</strong> Kumulierter Schätzwert aller Anfragen — zeigt die Größenordnung.</span>
            <span><strong>Einsparungspotenzial:</strong> Wie viel CO₂ eingespart würde, wenn jede Aufgabe das passendste Modell nutzte.</span>
          </div>
        )}
      </div>

      <div className={`metric-grid ${isSimple ? 'metric-grid-simple' : ''}`}>
        {!isSimple && (
          <article className="metric-card">
            <p className="metric-label">Szenarien bewertet</p>
            <h3>{dashboardRows.length}</h3>
            <span>Beispielaufgaben im Überblick</span>
          </article>
        )}
        <article className="metric-card">
          <p className="metric-label">Ø Score</p>
          <h3>{averageLetter}</h3>
          <span>{Math.round(averageAppropriateness * 100)}% mittlere Angemessenheit</span>
        </article>
        {!isSimple && (
          <article className="metric-card">
            <p className="metric-label">CO₂ gesamt</p>
            <h3>{formatCo2(totalCo2)}</h3>
            <span>für die aktuelle Modellwahl</span>
          </article>
        )}
        <article className="metric-card">
          <p className="metric-label">Einsparungspotenzial</p>
          <h3>{formatCo2(savingsPotential)}</h3>
          <span>CO₂ bei passenderer Modellwahl</span>
        </article>
        {(() => {
          const total = Object.keys(feedback).length
          const ja = Object.values(feedback).filter((v) => v === 'ja').length
          return (
            <article className="metric-card metric-card-feedback">
              <p className="metric-label">Nachvollziehbarkeit</p>
              <h3>{total === 0 ? '–' : `${Math.round((ja / total) * 100)} %`}</h3>
              <span>{total === 0 ? 'Noch keine Bewertungen' : `${ja} von ${total} als klar bewertet`}</span>
            </article>
          )
        })()}
      </div>

      <div className={`dashboard-grid-2 ${isSimple ? 'dashboard-grid-2-single' : ''}`}>
        <section className="panel">
          <div className="panel-heading">
            <h2>Verteilung A–E</h2>
            <p>Die aktuelle Auswahl verteilt sich so über die Score-Stufen.</p>
          </div>
          <div className="distribution-chart" aria-label="Verteilung der Scores A bis E">
            {distribution.map((entry) => (
              <div key={entry.label} className="distribution-column">
                <div
                  className="distribution-bar-wrap"
                  style={{ height: `${Math.max((entry.count / maxDistribution) * 140, entry.count > 0 ? 4 : 0)}px` }}
                >
                  <span className="distribution-count">{entry.count}</span>
                  <div
                    className="distribution-bar-fill"
                    style={{ background: nutriBarColors[entry.label] }}
                  />
                </div>
                <span className="distribution-label">{entry.label}</span>
              </div>
            ))}
          </div>
        </section>

        {!isSimple && (
          <section className="panel">
            <div className="panel-heading">
              <h2>Letzte Analysen</h2>
              <p>Einfacher Überblick über deine jüngsten erfassten Bewertungen.</p>
            </div>
            <div className="table-wrap">
              <table className="analysis-table">
                <thead>
                  <tr>
                    <th>Quelle</th>
                    <th>Modell</th>
                    <th>Score</th>
                    <th>CO₂</th>
                  </tr>
                </thead>
                <tbody>
                  {events.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="analysis-table-empty">
                        Noch keine Nutzung erfasst — bewerte etwas im Rechner.
                      </td>
                    </tr>
                  ) : (
                    events.slice(0, 5).map((event) => {
                      const letter = appropriatenessToLetter(event.appropriateness)
                      const sc = scoreColors[letter]
                      return (
                        <tr key={event.id}>
                          <td>{formatSourceLabel(event.source)} · {event.taskType}</td>
                          <td>{event.modelSize.charAt(0).toUpperCase() + event.modelSize.slice(1)}</td>
                          <td>
                            <span
                              className="task-letter-badge"
                              style={{ color: sc.text, background: sc.bg, borderColor: sc.border }}
                            >
                              {letter}
                            </span>
                          </td>
                          <td>{formatCo2(event.co2Gram)}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      <section className="panel insight-card">
        <h3>Insight</h3>
        <p>
          Bei trivialen Aufgaben lohnt sich oft ein kleineres Modell deutlich mehr, während komplexe Analysen ihren Nutzen mit größeren Modellen besser entfalten. Der größte Hebel liegt deshalb im richtigen Größenverhältnis von Aufgabe und Modell.
        </p>
        <div className="insight-actions">
          <button type="button" className="demo-card demo-card-bad" onClick={() => onJumpToDemo('clock', 'gross')}>
            <h3>Klar unangemessen</h3>
            <p>Triviale Anfrage mit großem Modell</p>
            <span>Direkt testen</span>
          </button>
          <button type="button" className="demo-card demo-card-good" onClick={() => onOpenTab('rechner')}>
            <h3>Zum Rechner</h3>
            <p>Eigenes Szenario prüfen</p>
            <span>Jetzt öffnen</span>
          </button>
        </div>
      </section>
    </div>
  )
}

// Repräsentativer Tokenwert je Aufgabentyp für einen freien Prompt ohne Beispiel-Szenario.
// Schätzung, angelehnt an das jeweils typische Standard-Szenario aus scenarios.ts (clock,
// summary, poem, analysis, code, image_single) — die Antwortlänge dominiert den Energieverbrauch,
// nicht die Länge des eingegebenen Prompts, daher wird hier nicht gezählt, sondern geschätzt.
const CUSTOM_PROMPT_TOKENS_BY_TYPE: Record<TaskType, number> = {
  trivial: 200,
  fakten: 800,
  kreativ: 1500,
  analyse: 8000,
  code: 3000,
  generierung: 12000,
}

function truncatePromptTitle(prompt: string): string {
  return prompt.length > 40 ? `${prompt.slice(0, 40)}…` : prompt
}

function ModellGuide() {
  return (
    <div className="modell-guide">
      <div className="modell-guide-grid">
        {MODEL_GUIDE.map((info) => (
          <div key={info.klasse} className="modell-guide-card">
            <h4 className="modell-guide-label">{info.label}</h4>
            <p className="modell-guide-kurz">{info.kurz}</p>

            <span className="modell-guide-caption">Erkennst du an</span>
            <div className="modell-guide-muster">
              {info.muster.map((pattern) => (
                <span key={pattern} className="modell-guide-chip">{pattern}</span>
              ))}
            </div>

            <p className="modell-guide-wofuer">{info.wofuer}</p>

            <span className="modell-guide-caption">Beispiele</span>
            <ul className="modell-guide-beispiele">
              {info.beispiele.map((beispiel) => (
                <li key={beispiel.name}>
                  <strong>{beispiel.name}</strong> <span>({beispiel.family})</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="modell-guide-kernbotschaft">
        Unsicher? Dann ist es fast immer „Mittel" — das ist bei den meisten Chatbots die Voreinstellung.
      </p>

      <p className="modell-guide-stand">
        Beispiele Stand {MODEL_GUIDE_STAND} — Modellnamen ändern sich schnell, die Faustregel bleibt.
      </p>
    </div>
  )
}

function RechnerTab({
  selectedScenarioId,
  selectedModel,
  selectedScenario,
  result,
  onScenarioChange,
  onModelChange,
  onJumpToDemo,
  onOpenTab,
  feedback,
  onFeedback,
}: TabProps & {
  onOpenTab: (tab: TabKey) => void
  feedback: Record<string, 'ja' | 'nein'>
  onFeedback: (scenarioId: string, model: ModelClass, value: 'ja' | 'nein') => void
}) {
  const [customPrompt, setCustomPrompt] = useState('')
  const [customClassification, setCustomClassification] = useState<{ type: TaskType; reason: string[] } | null>(null)
  const [scoreOpen, setScoreOpen] = useState(false)
  const [modellGuideOpen, setModellGuideOpen] = useState(false)
  const { addEvent } = useUsage()
  const { isSimple } = useViewMode()
  const { isBusiness } = useAudience()
  const [requestsPerDay, setRequestsPerDay] = useState(1000)
  const [captured, setCaptured] = useState(false)
  const captureTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (captureTimeoutRef.current) clearTimeout(captureTimeoutRef.current)
    }
  }, [])

  const handleCapture = () => {
    addEvent({
      source: 'rechner',
      taskType: effectiveScenario.taskType,
      modelSize: selectedModel,
      tokens: effectiveScenario.estimatedTokens,
      co2Gram: effectiveResult.co2Gram,
      costEuro: effectiveResult.costEuro,
      effortWh: effectiveResult.effortWh,
      appropriateness: effectiveResult.appropriateness,
    })
    setCaptured(true)
    if (captureTimeoutRef.current) clearTimeout(captureTimeoutRef.current)
    captureTimeoutRef.current = setTimeout(() => setCaptured(false), 2000)
  }

  const handlePromptChange = (value: string) => {
    setCustomPrompt(value)
    if (!value.trim()) {
      setCustomClassification(null)
      return
    }

    setCustomClassification(classifyPrompt(value))
  }

  const isCustomActive = customPrompt.trim() !== '' && customClassification !== null

  // Solange ein eigener Prompt aktiv ist, ersetzt dieses temporäre Szenario das Dropdown-Szenario
  // als Grundlage für Score, Begründung und Erfassung — score.ts/scenarios.ts bleiben unverändert.
  const customScenario: Scenario | null = useMemo(() => {
    if (!isCustomActive || !customClassification) return null
    const trimmedPrompt = customPrompt.trim()
    return {
      id: 'custom',
      title: truncatePromptTitle(trimmedPrompt),
      prompt: trimmedPrompt,
      taskType: customClassification.type,
      estimatedTokens: CUSTOM_PROMPT_TOKENS_BY_TYPE[customClassification.type],
      description: 'Eigener Prompt',
    }
  }, [isCustomActive, customClassification, customPrompt])

  const effectiveScenario = customScenario ?? selectedScenario
  const effectiveScenarioId = customScenario ? 'custom' : selectedScenarioId
  const effectiveResult = customScenario ? calculateScore(customScenario, selectedModel) : result

  const handleResetCustomPrompt = () => {
    setCustomPrompt('')
    setCustomClassification(null)
  }

  const handleScenarioSelect = (value: string) => {
    if (isCustomActive) {
      setCustomPrompt('')
      setCustomClassification(null)
    }
    onScenarioChange(value)
  }

  const gradeSteps: Array<{ letter: ScoreResult['letter']; label: string }> = [
    { letter: 'A', label: 'sehr passend' },
    { letter: 'B', label: 'gut' },
    { letter: 'C', label: 'mittel' },
    { letter: 'D', label: 'schwach' },
    { letter: 'E', label: 'unangemessen' },
  ]

  const gradeIndex = gradeSteps.findIndex((grade) => grade.letter === effectiveResult.letter)
  const effortPercent = Math.round(Math.min(100, effectiveResult.effortWh / 0.01 * 100))
  const benefitPercent = Math.round(effectiveResult.benefitIndex * 100)

  // Best alternative: pick the non-selected model with the highest appropriateness
  const bestAlt = useMemo(() => {
    const scenario = customScenario ?? selectedScenario
    return (['klein', 'mittel', 'gross'] as ModelClass[])
      .filter((m) => m !== selectedModel)
      .map((m) => ({ model: m, result: calculateScore(scenario, m) }))
      .sort((a, b) => b.result.appropriateness - a.result.appropriateness)[0]
  }, [customScenario, selectedScenario, selectedModel])

  const altSizeLabel =
    bestAlt.model === 'gross' ? 'größerem' : bestAlt.model === 'mittel' ? 'mittlerem' : 'kleinerem'

  const modelSizeNum = { klein: 1, mittel: 2, gross: 3 }[selectedModel]
  const requiredSize = 1 + effectiveResult.benefitIndex * 2
  const overAlloc = Math.max(0, modelSizeNum - requiredSize) / 2
  const underAlloc = Math.max(0, requiredSize - modelSizeNum) / 4

  const complexityLabel =
    effectiveResult.benefitIndex >= 0.85 ? 'sehr hoch'
    : effectiveResult.benefitIndex >= 0.7 ? 'hoch'
    : effectiveResult.benefitIndex >= 0.5 ? 'mittel'
    : effectiveResult.benefitIndex >= 0.3 ? 'gering'
    : 'sehr gering'

  const breakdownModelSizeLabel =
    selectedModel === 'klein' ? 'klein (1/3)'
    : selectedModel === 'mittel' ? 'mittel (2/3)'
    : 'groß (3/3)'

  const ratioArrow =
    effectiveResult.appropriateness >= 0.82 ? '↑↑'
    : effectiveResult.appropriateness >= 0.68 ? '↑'
    : effectiveResult.appropriateness >= 0.5 ? '→'
    : effectiveResult.appropriateness >= 0.3 ? '↓'
    : '↓↓'

  const breakdownSizeTag =
    overAlloc > 0.05 ? 'überdimensioniert' : underAlloc > 0.05 ? 'unterdimensioniert' : 'passend'

  const reasoningText = (() => {
    const modelLabel = { klein: 'kleines', mittel: 'mittleres', gross: 'großes' }[selectedModel]
    if (overAlloc > 0.3) {
      return `Bei einem Nutzenindex von ${effectiveResult.benefitIndex.toFixed(2)} (${complexityLabel}) ist ein ${modelLabel} Modell deutlich überdimensioniert — ein kleineres würde fast identische Ergebnisse liefern.`
    }
    if (overAlloc > 0) {
      return `Das ${modelLabel} Modell leistet etwas mehr als nötig (Über-Allokation ${overAlloc.toFixed(2)}), der Score bleibt vertretbar.`
    }
    if (underAlloc > 0.2) {
      return `Die Aufgabe stellt hohe Anforderungen (Nutzenindex ${effectiveResult.benefitIndex.toFixed(2)}), die ein ${modelLabel} Modell nur eingeschränkt erfüllen kann.`
    }
    if (underAlloc > 0) {
      return `Das ${modelLabel} Modell ist leicht unterdimensioniert für diese Aufgabe, liefert aber voraussichtlich akzeptable Ergebnisse.`
    }
    return `Aufgabenbedarf (Nutzenindex ${effectiveResult.benefitIndex.toFixed(2)}) und Modellkapazität passen optimal zusammen — der Score von ${effectiveResult.appropriateness.toFixed(2)} spiegelt eine ausgewogene Wahl wider.`
  })()

  const modelOptions = useMemo(() => {
    const scenario = customScenario ?? selectedScenario
    return (['klein', 'mittel', 'gross'] as ModelClass[]).map((modelClass) => ({
      modelClass,
      profile: modelProfiles[modelClass],
      score: calculateScore(scenario, modelClass),
    }))
  }, [customScenario, selectedScenario])

  const bestModel = [...modelOptions].sort((a, b) => b.score.appropriateness - a.score.appropriateness)[0]
  const recommendationText =
    selectedModel === bestModel.modelClass
      ? `Für ${effectiveScenario.title} passt ${modelTitles[selectedModel]} am besten.`
      : `Für ${effectiveScenario.title} wäre ${modelTitles[bestModel.modelClass]} die bessere Wahl als ${modelTitles[selectedModel]}.`

  // Unternehmens-Modus: Rechner bewertet nicht nur die einzelne Anfrage, sondern den
  // Betrieb dahinter — dieselbe ×30-Monatslogik wie im Flotten-Cockpit (Dashboard).
  const monthlyRequests = requestsPerDay * DAYS_PER_MONTH
  const monthlyCo2 = effectiveResult.co2Gram * monthlyRequests
  const monthlyCost = effectiveResult.costEuro * monthlyRequests
  const hasBetterModel = selectedModel !== bestModel.modelClass
  const monthlySavings = hasBetterModel
    ? Math.max(0, monthlyCost - bestModel.score.costEuro * monthlyRequests)
    : 0

  return (
    <div className="rechner-shell">
      <section className="panel">
        <div className="panel-heading">
          <h2>Prompt und Szenario</h2>
          <p>Wähle ein Beispiel oder teste einen freien Prompt direkt.</p>
        </div>
        <div className="rechner-grid">
          <label className="prompt-card">
            <span>Freier Prompt</span>
            <textarea
              value={customPrompt}
              onChange={(event) => handlePromptChange(event.target.value)}
              placeholder="Beispiel: Analysiere diesen Datensatz und erkläre die wichtigsten Muster."
              rows={5}
            />
            {customClassification ? (
              <div className={`classification-card ${taskTypeMeta[customClassification.type].tone}`}>
                <div className="classification-header">
                  <span className={`type-badge ${taskTypeMeta[customClassification.type].tone}`}>
                    {taskTypeMeta[customClassification.type].icon} {taskTypeMeta[customClassification.type].label}
                  </span>
                  <span className="confidence-pill">{customClassification.reason.length} Treffer</span>
                </div>
                <div className="confidence-track" aria-hidden="true">
                  <div className="confidence-fill" style={{ width: `${Math.min(100, customClassification.reason.length * 28)}%` }} />
                </div>
                <p>Warum?</p>
                <ul>
                  {customClassification.reason.map((entry) => (
                    <li key={entry}>{entry}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </label>

          <div className={`scenario-card compact-card ${isCustomActive ? 'scenario-card-dimmed' : ''}`}>
            <label>
              <span>Beispielaufgabe</span>
              <select value={selectedScenarioId} onChange={(event) => handleScenarioSelect(event.target.value)}>
                {scenarios.map((scenario) => (
                  <option key={scenario.id} value={scenario.id}>
                    {scenario.title}
                  </option>
                ))}
              </select>
            </label>
            {isCustomActive ? (
              <div className="custom-active-hint">
                <p>Dein eigener Prompt wird bewertet.</p>
                <button type="button" className="inline-link" onClick={handleResetCustomPrompt}>
                  Zurücksetzen
                </button>
              </div>
            ) : (
              <>
                <div className="scenario-summary">
                  <h3>{selectedScenario.title}</h3>
                  <p>{selectedScenario.prompt}</p>
                  <p className="scenario-meta">{selectedScenario.description}</p>
                </div>
                <div className="mini-actions">
                  <button type="button" className="mini-action demo-card-bad" onClick={() => onJumpToDemo('clock', 'gross')}>
                    Unangemessen testen
                  </button>
                  <button type="button" className="mini-action demo-card-good" onClick={() => onJumpToDemo('analysis', 'gross')}>
                    Angemessen testen
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Modellwahl</h2>
          <p>Wähle ein Modell aus – die Karten zeigen sofort Parameter, Preis und Passung.</p>
        </div>
        <button
          type="button"
          className="inline-link modell-guide-toggle"
          onClick={() => setModellGuideOpen((prev) => !prev)}
          aria-expanded={modellGuideOpen}
        >
          Welche Größe hab ich benutzt? {modellGuideOpen ? '↑' : '↓'}
        </button>
        {modellGuideOpen && <ModellGuide />}
        <div className="model-card-grid">
          {modelOptions.map(({ modelClass, profile, score }) => (
            <button
              key={modelClass}
              type="button"
              className={`model-card ${selectedModel === modelClass ? 'active' : ''}`}
              onClick={() => onModelChange(modelClass)}
            >
              <div className="model-card-head">
                <h3>{modelTitles[modelClass]}</h3>
                <span className={`model-pill ${score.letter.toLowerCase()}`}>{score.letter}</span>
              </div>
              {!isSimple && (
                <>
                  <p>{profile.parameterBand}</p>
                  <div className="model-card-meta">
                    <span>{profile.pricePer1kTokensEuro.toFixed(3)} €/1k Tokens</span>
                    <span>{profile.energyPer1kTokensWh.toFixed(4)} Wh/1k</span>
                  </div>
                </>
              )}
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Score & Empfehlung</h2>
          <p>
            {isCustomActive
              ? 'Bewertung deines eigenen Prompts.'
              : isBusiness
                ? 'Die Bewertung zeigt Aufwand und Kosten dieses Anwendungsfalls im Betrieb.'
                : 'Die Bewertung bündelt Aufwand, Nutzen und Ressourcen in einem Blick.'}
          </p>
        </div>

        <div className={`result-grid ${isSimple ? 'result-grid-simple' : ''}`}>
          <div className="score-panel">
            <div key={`badge-${effectiveScenarioId}-${selectedModel}`} className="score-badge-large">
              {effectiveResult.letter}
            </div>
            <div key={`bar-${effectiveScenarioId}-${selectedModel}`} className="grade-bar" aria-label={`Score-Leiste ${effectiveResult.letter}`}>
              {gradeSteps.map((grade, index) => (
                <div key={grade.letter} className={`grade-step ${index <= gradeIndex ? 'active' : ''}`}>
                  <span>{grade.letter}</span>
                  <small>{grade.label}</small>
                </div>
              ))}
            </div>
            <p className="score-copy">{sanitizeCo2Text(effectiveResult.explanation)}</p>

            {!isSimple && (
              <div className="score-breakdown">
                <button
                  type="button"
                  className="breakdown-toggle"
                  onClick={() => setScoreOpen((prev) => !prev)}
                  aria-expanded={scoreOpen}
                >
                  Score aufschlüsseln {scoreOpen ? '↑' : '↓'}
                </button>
                {scoreOpen && (
                  <div className="breakdown-body">
                    <div className="breakdown-num">
                      <span className="breakdown-num-value">{effectiveResult.appropriateness.toFixed(2)}</span>
                      <span className="breakdown-num-total">&nbsp;/ 1.00</span>
                    </div>
                    <div className="breakdown-factors">
                      <div className="breakdown-factor">
                        <span className="factor-name">Aufgabenkomplexität</span>
                        <span className="factor-val">{effectiveResult.benefitIndex.toFixed(2)}</span>
                        <span className="factor-tag">{complexityLabel}</span>
                      </div>
                      <div className="breakdown-factor">
                        <span className="factor-name">Modellgröße</span>
                        <span className="factor-val">{breakdownModelSizeLabel}</span>
                        <span className="factor-tag">{breakdownSizeTag}</span>
                      </div>
                      <div className="breakdown-factor">
                        <span className="factor-name">Verhältnis</span>
                        <span className="factor-val">{effectiveResult.appropriateness.toFixed(2)}</span>
                        <span className={`factor-arrow factor-arrow-${effectiveResult.letter.toLowerCase()}`}>{ratioArrow}</span>
                      </div>
                    </div>
                    <p className="breakdown-uncertainty">± 0.15 je nach tatsächlicher Tokenzahl</p>
                    <p className="breakdown-reasoning">{reasoningText}</p>
                  </div>
                )}
              </div>
            )}

            {(() => {
              const key = `${effectiveScenarioId}-${selectedModel}`
              const current = feedback[key] ?? null
              return (
                <div className="feedback-row">
                  <span className="feedback-question">War diese Bewertung nachvollziehbar?</span>
                  <div className="feedback-btns">
                    <button
                      type="button"
                      className={`feedback-btn feedback-btn-ja ${current === 'ja' ? 'selected' : ''}`}
                      onClick={() => onFeedback(effectiveScenarioId, selectedModel, 'ja')}
                      aria-pressed={current === 'ja'}
                    >
                      Ja
                    </button>
                    <button
                      type="button"
                      className={`feedback-btn feedback-btn-nein ${current === 'nein' ? 'selected' : ''}`}
                      onClick={() => onFeedback(effectiveScenarioId, selectedModel, 'nein')}
                      aria-pressed={current === 'nein'}
                    >
                      Nein
                    </button>
                  </div>
                </div>
              )
            })()}

            {!isBusiness && (
              <div className="capture-row">
                <button
                  type="button"
                  className={`capture-btn ${captured ? 'captured' : ''}`}
                  onClick={handleCapture}
                >
                  {captured ? '✓ Erfasst' : 'Nutzung erfassen'}
                </button>
                <span className="capture-hint">
                  Speichert diese Bewertung im Verlauf (über das Overlay unten rechts erreichbar).
                </span>
              </div>
            )}

            <button
              type="button"
              className="whatif-btn"
              onClick={() => onOpenTab('vergleich')}
            >
              Mit {altSizeLabel} Modell wäre der Score{' '}
              <strong>{bestAlt.result.letter}</strong>
              {' '}— jetzt vergleichen →
            </button>
          </div>

          {!isSimple && (
            <div className="result-side">
              <div className="progress-card">
                <div className="progress-row">
                  <div className="progress-labels">
                    <strong>
                      Aufwand
                      <span className="info-tooltip" tabIndex={0}>ⓘ<span className="tooltip-text">Energie und CO₂ dieser Anfrage (geschätzt).</span></span>
                    </strong>
                    <span>{effortPercent}%</span>
                  </div>
                  <div className="progress-track"><div className="progress-fill effort" style={{ width: `${effortPercent}%` }} /></div>
                </div>
                <div className="progress-row">
                  <div className="progress-labels">
                    <strong>
                      Nutzen
                      <span className="info-tooltip" tabIndex={0}>ⓘ<span className="tooltip-text">Wie sehr rechtfertigt die Aufgabe dieses Modell?</span></span>
                    </strong>
                    <span>{benefitPercent}%</span>
                  </div>
                  <div className="progress-track"><div className="progress-fill benefit" style={{ width: `${benefitPercent}%` }} /></div>
                </div>
              </div>

              <div className="metrics-grid">
                <div className="metric-tile">
                  <strong>{formatCo2(effectiveResult.co2Gram)}</strong>
                  <span>CO₂</span>
                </div>
                <div className="metric-tile">
                  <strong>{formatEnergyValue(effectiveResult.effortWh)}</strong>
                  <span>Energie</span>
                </div>
                <div className="metric-tile">
                  <strong>{formatCostValue(effectiveResult.costEuro)}</strong>
                  <span>Kosten</span>
                </div>
                <div className="metric-tile">
                  <strong>{effectiveScenario.estimatedTokens}</strong>
                  <span>Tokens</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {isBusiness && (
          <div className="fleet-projection-card" style={{ borderColor: B2B_ACCENT }}>
            <div className="fleet-projection-header">
              <span className="metric-label">Hochgerechnet auf</span>
              <label className="fleet-volume-input">
                <input
                  type="number"
                  min={1}
                  value={requestsPerDay}
                  onChange={(event) => setRequestsPerDay(Math.max(1, Number(event.target.value) || 1))}
                />
                <span>Anfragen/Tag</span>
              </label>
            </div>
            <div className="fleet-projection-grid">
              <div className="fleet-projection-tile">
                <span className="metric-label">CO₂/Monat</span>
                <strong>{formatCo2(monthlyCo2)}</strong>
              </div>
              <div className="fleet-projection-tile">
                <span className="metric-label">Kosten/Monat</span>
                <strong>{formatCostValue(monthlyCost)}</strong>
              </div>
            </div>
            {hasBetterModel && (
              <p className="fleet-projection-savings" style={{ color: B2B_ACCENT }}>
                Einsparpotenzial: {formatCostValue(monthlySavings)}/Monat mit {modelTitles[bestModel.modelClass]}
              </p>
            )}
          </div>
        )}

        <div className="recommendation-card">
          <h3>Empfehlung</h3>
          <p>{recommendationText}</p>
          <div className="alt-models">
            <div className="alt-pill alt-pill-primary">Empfohlen: {modelTitles[bestModel.modelClass]}</div>
            {modelOptions.filter((model) => model.modelClass !== bestModel.modelClass).slice(0, 2).map((model) => (
              <div key={model.modelClass} className="alt-pill">
                {modelTitles[model.modelClass]} · {model.score.letter}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

const sourceLabels: Record<string, string> = {
  rechner: 'Rechner',
  chatgpt: 'ChatGPT',
  gemini: 'Gemini',
  claude: 'Claude',
  copilot: 'Copilot',
}

function formatSourceLabel(source: string): string {
  return sourceLabels[source] ?? source.charAt(0).toUpperCase() + source.slice(1)
}

// Mirrors the appropriateness thresholds in calculateScore (score.ts) so a single
// event's letter grade reads the same way here as it would in the Rechner tab.
function appropriatenessToLetter(value: number): ScoreResult['letter'] {
  if (value >= 0.82) return 'A'
  if (value >= 0.68) return 'B'
  if (value >= 0.5) return 'C'
  if (value >= 0.3) return 'D'
  return 'E'
}

function getTaskMeta(taskType: string): { icon: string; label: string; tone: string } {
  if (taskType in taskTypeMeta) {
    return taskTypeMeta[taskType as TaskType]
  }
  return { icon: '❔', label: taskType, tone: '' }
}

function formatDayLabel(dateKey: string, todayKey: string): string {
  if (dateKey === todayKey) return 'Heute'
  const [, month, day] = dateKey.split('-')
  return `${day}.${month}.`
}

function buildDayExplanation(today: DailyAggregate): string {
  if (today.events.length === 0) {
    return 'Noch keine Aktivität heute — sobald du eine Bewertung erfasst, erscheint hier eine Einschätzung.'
  }

  const effGood = today.avgEfficiency >= 0.7
  const effMixed = !effGood && today.avgEfficiency >= 0.5
  const volLow = today.volumeLoad <= 0.33
  const volHigh = today.volumeLoad > 0.66

  const effLabel = effGood ? 'überwiegend angemessen' : effMixed ? 'gemischt' : 'überwiegend unangemessen'
  const volLabel = volLow ? 'gering' : volHigh ? 'erhöht' : 'moderat'
  const contrast = (effGood && volHigh) || (!effGood && volLow)
  const connector = contrast ? 'aber das Volumen ist' : 'und das Volumen ist'

  return `Deine heutige Nutzung ist ${effLabel}, ${connector} ${volLabel}.`
}

function VerlaufTab({ onOpenTab }: { onOpenTab: (tab: TabKey) => void }) {
  const { today, days, seedDemoData, clearUsage } = useUsage()
  const { isSimple } = useViewMode()

  const hasToday = today.events.length > 0

  const RING_RADIUS = 40
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS
  const todayColor = nutriScoreColors[today.letter]
  const todayDashOffset = RING_CIRCUMFERENCE * (1 - today.volumeLoad)

  const toolBreakdown = useMemo(() => {
    const groups = new Map<string, { count: number; co2Gram: number; weightedApprop: number; tokens: number }>()
    for (const event of today.events) {
      const group = groups.get(event.source) ?? { count: 0, co2Gram: 0, weightedApprop: 0, tokens: 0 }
      group.count += 1
      group.co2Gram += event.co2Gram
      group.weightedApprop += event.appropriateness * event.tokens
      group.tokens += event.tokens
      groups.set(event.source, group)
    }
    return Array.from(groups.entries())
      .map(([source, group]) => ({
        source,
        count: group.count,
        co2Gram: group.co2Gram,
        share: today.totalCo2Gram > 0 ? group.co2Gram / today.totalCo2Gram : 0,
        avgApprop: group.tokens > 0 ? group.weightedApprop / group.tokens : 1,
      }))
      .sort((a, b) => b.co2Gram - a.co2Gram)
  }, [today])

  return (
    <div className="dashboard-shell">
      <div className="panel-heading">
        <h2>Verlauf</h2>
        <p>Hier läuft deine tägliche KI-Nutzung über alle Tools hinweg zusammen — Rechner, ChatGPT, Gemini, Claude, Copilot.</p>
      </div>

      {hasToday ? (
        <>
          <section className="panel verlauf-today-card">
            <div className="panel-heading">
              <h2>Heute</h2>
              <p>Dein Tages-Score aus allen bisher erfassten Aktivitäten.</p>
            </div>
            <div className="verlauf-today-body">
              <div className="verlauf-ring-col">
                <div className="verlauf-ring-wrap">
                  <svg viewBox="0 0 96 96" className="verlauf-ring" aria-hidden="true">
                    <circle cx="48" cy="48" r={RING_RADIUS} className="verlauf-ring-track" />
                    <circle
                      cx="48"
                      cy="48"
                      r={RING_RADIUS}
                      className="verlauf-ring-fill"
                      style={{ stroke: todayColor, strokeDasharray: RING_CIRCUMFERENCE, strokeDashoffset: todayDashOffset }}
                    />
                  </svg>
                  <span className="verlauf-ring-letter" style={{ color: todayColor }}>{today.letter}</span>
                </div>
                <span className="verlauf-ring-caption">{Math.round(today.volumeLoad * 100)}% von {CO2_BUDGET_G} g Tagesbudget</span>
              </div>

              {!isSimple && (
                <div className="verlauf-metric-grid">
                  <article className="metric-card">
                    <p className="metric-label">CO₂ heute</p>
                    <h3>{formatCo2(today.totalCo2Gram)}</h3>
                    <span>von {CO2_BUDGET_G} g Tagesbudget</span>
                  </article>
                  <article className="metric-card">
                    <p className="metric-label">Kosten heute</p>
                    <h3>{formatCostValue(today.totalCostEuro)}</h3>
                    <span>geschätzt</span>
                  </article>
                  <article className="metric-card">
                    <p className="metric-label">Tokens heute</p>
                    <h3>{today.totalTokens.toLocaleString('de-DE')}</h3>
                    <span>verarbeitet</span>
                  </article>
                </div>
              )}
            </div>

            {!isSimple && (
              <p className="verlauf-efficiency-line">
                Ø Angemessenheit heute: <strong>{Math.round(today.avgEfficiency * 100)}%</strong>
              </p>
            )}
            <p className="verlauf-summary-sentence">{buildDayExplanation(today)}</p>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <h2>Nach Tool aufgeschlüsselt</h2>
              <p>Welcher Anteil deines heutigen CO₂-Budgets stammt von welchem Tool.</p>
            </div>
            <div className="distribution-chart" aria-label="CO2-Anteil nach Tool">
              {toolBreakdown.map((tool) => {
                const letter = appropriatenessToLetter(tool.avgApprop)
                return (
                  <div key={tool.source} className="distribution-column">
                    <div
                      className="distribution-bar-wrap"
                      style={{ height: `${Math.max(tool.share * 140, tool.co2Gram > 0 ? 4 : 0)}px` }}
                    >
                      <span className="distribution-count">{Math.round(tool.share * 100)}%</span>
                      <div className="distribution-bar-fill" style={{ background: nutriScoreColors[letter] }} />
                    </div>
                    <span className="distribution-label">{formatSourceLabel(tool.source)}</span>
                    <span className="verlauf-tool-count">{tool.count}×</span>
                  </div>
                )
              })}
            </div>
          </section>

          {!isSimple && (
            <section className="panel">
              <div className="panel-heading">
                <h2>Einzelne Aktivitäten heute</h2>
                <p>Alle heute erfassten Ereignisse, neueste zuerst.</p>
              </div>
              <div className="table-wrap">
                <table className="analysis-table">
                  <thead>
                    <tr>
                      <th>Quelle</th>
                      <th>Aufgabe</th>
                      <th>Modell</th>
                      <th>CO₂</th>
                      <th>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {today.events.map((event) => {
                      const letter = appropriatenessToLetter(event.appropriateness)
                      const sc = scoreColors[letter]
                      const meta = getTaskMeta(event.taskType)
                      return (
                        <tr key={event.id}>
                          <td>{formatSourceLabel(event.source)}</td>
                          <td>
                            <span className={`type-badge ${meta.tone}`}>{meta.icon} {meta.label}</span>
                          </td>
                          <td>{event.modelSize.charAt(0).toUpperCase() + event.modelSize.slice(1)}</td>
                          <td>{formatCo2(event.co2Gram)}</td>
                          <td>
                            <span
                              className="task-letter-badge"
                              style={{ color: sc.text, background: sc.bg, borderColor: sc.border }}
                            >
                              {letter}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      ) : (
        <section className="panel insight-card">
          <h3>Noch keine Nutzung heute erfasst</h3>
          <p>Erfasse eine Bewertung im Rechner oder lade Demo-Daten, um zu sehen, wie der Tages-Score entsteht.</p>
          <div className="insight-actions">
            <button type="button" className="demo-card demo-card-good" onClick={() => onOpenTab('rechner')}>
              <h3>Zum Rechner</h3>
              <p>Eigene Bewertung berechnen und erfassen</p>
              <span>Jetzt öffnen</span>
            </button>
            <button type="button" className="demo-card demo-card-good" onClick={seedDemoData}>
              <h3>Demo-Daten laden</h3>
              <p>Beispielhafte Nutzung simulieren</p>
              <span>Jetzt laden</span>
            </button>
          </div>
        </section>
      )}

      {!isSimple && days.length > 0 && (
        <section className="panel">
          <div className="panel-heading">
            <h2>Verlauf über Tage</h2>
            <p>Tages-Scores im Überblick.</p>
          </div>
          <div className="verlauf-days-row">
            {days.map((day) => {
              const sc = scoreColors[day.letter]
              return (
                <div
                  key={day.dateKey}
                  className="day-chip"
                  style={{ color: sc.text, background: sc.bg, borderColor: sc.border }}
                >
                  <span className="day-chip-date">{formatDayLabel(day.dateKey, today.dateKey)}</span>
                  <span className="day-chip-letter">{day.letter}</span>
                  <span className="day-chip-co2">{formatCo2(day.totalCo2Gram)}</span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section className="panel verlauf-demo-card">
        <div className="panel-heading">
          <h2>Demo-Daten</h2>
          <p>Zum Ausprobieren, ohne echte Aktivitäten zu erfassen.</p>
        </div>
        <div className="methodik-hint-box">
          <span className="methodik-hint-icon">ℹ️</span>
          <p>
            Echtes, systemweites Tracking über alle installierten Programme hinweg ist in diesem MVP nicht enthalten.
            Die Beispiel-Ereignisse hier sind simuliert, um die Vision „ein Score über alle KI-Tools hinweg" greifbar zu machen.
          </p>
        </div>
        <div className="insight-actions">
          <button type="button" className="demo-card demo-card-good" onClick={seedDemoData}>
            <h3>Demo-Nutzung laden</h3>
            <p>Simuliert ~8 Beispiel-Ereignisse von heute über ChatGPT, Gemini, Claude und Copilot.</p>
            <span>Jetzt laden</span>
          </button>
          <button type="button" className="demo-card demo-card-bad" onClick={clearUsage}>
            <h3>Verlauf zurücksetzen</h3>
            <p>Löscht alle erfassten und simulierten Ereignisse unwiderruflich.</p>
            <span>Zurücksetzen</span>
          </button>
        </div>
      </section>
    </div>
  )
}

const modelTitles: Record<ModelClass, string> = {
  klein: 'kleines Modell',
  mittel: 'mittleres Modell',
  gross: 'großes Modell',
}
function VergleichTab(_props: {
  result: ScoreResult
  comparisonResult: ScoreResult
  selectedModel: ModelClass
  comparisonModel: ModelClass
}) {
  const { isSimple } = useViewMode()
  const { isBusiness } = useAudience()
  const [mode, setMode] = useState<'modelle' | 'aufgaben'>('modelle')
  const effectiveMode = isSimple ? 'modelle' : mode
  const [requestsPerDay, setRequestsPerDay] = useState(1000)
  const monthlyRequests = requestsPerDay * DAYS_PER_MONTH

  // ── Modus: Modelle vergleichen ──────────────────────────────────────────
  const [selectedScenarioId, setSelectedScenarioId] = useState(scenarios[0].id)

  const selectedScenario = useMemo(
    () => scenarios.find((s) => s.id === selectedScenarioId) ?? scenarios[0],
    [selectedScenarioId],
  )

  const modelResults = useMemo(
    () => ({
      klein: calculateScore(selectedScenario, 'klein'),
      mittel: calculateScore(selectedScenario, 'mittel'),
      gross: calculateScore(selectedScenario, 'gross'),
    }),
    [selectedScenario],
  )

  const availableOptions = [
    { key: 'klein' as const, result: modelResults.klein },
    { key: 'mittel' as const, result: modelResults.mittel },
    { key: 'gross' as const, result: modelResults.gross },
  ]

  const bestOption = [...availableOptions].sort((a, b) => b.result.appropriateness - a.result.appropriateness)[0]
  const worstOption = [...availableOptions].sort((a, b) => a.result.appropriateness - b.result.appropriateness)[0]
  const savingsCo2 = Math.max(0, worstOption.result.co2Gram - bestOption.result.co2Gram)
  const savingsCost = Math.max(0, worstOption.result.costEuro - bestOption.result.costEuro)

  const qualLabel = (diff: number): { text: string; cls: string } => {
    if (diff > 0.15) return { text: 'Qualitätsgewinn: hoch', cls: 'hoch' }
    if (diff > 0.07) return { text: 'Qualitätsgewinn: mittel', cls: 'mittel' }
    if (diff > 0.01) return { text: 'Qualitätsgewinn: gering', cls: 'gering' }
    if (diff >= -0.01) return { text: 'Qualitätsgewinn: keiner', cls: 'neutral' }
    return { text: 'Qualitätsverlust', cls: 'verlust' }
  }

  const energyDiffKM = modelResults.klein.effortWh > 0
    ? Math.round((modelResults.mittel.effortWh - modelResults.klein.effortWh) / modelResults.klein.effortWh * 100)
    : 0
  const energyDiffMG = modelResults.mittel.effortWh > 0
    ? Math.round((modelResults.gross.effortWh - modelResults.mittel.effortWh) / modelResults.mittel.effortWh * 100)
    : 0
  const qualKM = qualLabel(modelResults.mittel.appropriateness - modelResults.klein.appropriateness)
  const qualMG = qualLabel(modelResults.gross.appropriateness - modelResults.mittel.appropriateness)

  const bestValueOption = [...availableOptions].sort((a, b) => {
    const ratioA = a.result.costEuro > 0 ? a.result.appropriateness / a.result.costEuro : 0
    const ratioB = b.result.costEuro > 0 ? b.result.appropriateness / b.result.costEuro : 0
    return ratioB - ratioA
  })[0]

  const bestValueReason = (() => {
    const bv = bestValueOption
    if (bv.key === 'mittel') {
      const grossScore = modelResults.gross.appropriateness
      const scoreRatio = grossScore > 0 ? Math.round(bv.result.appropriateness / grossScore * 100) : 100
      const costRatio = modelResults.gross.costEuro > 0 ? Math.round(bv.result.costEuro / modelResults.gross.costEuro * 100) : 100
      return `${scoreRatio}% der Score-Qualität von Groß bei nur ${costRatio}% der Kosten.`
    }
    if (bv.key === 'klein') {
      const mittelScore = modelResults.mittel.appropriateness
      const scoreRatio = mittelScore > 0 ? Math.round(bv.result.appropriateness / mittelScore * 100) : 100
      const cost = isBusiness ? bv.result.costEuro * monthlyRequests : bv.result.costEuro
      return isBusiness
        ? `Niedrigste Kosten (${formatCostValue(cost)}/Monat) bei ${scoreRatio}% Score-Qualität von Mittel.`
        : `Niedrigste Kosten (${formatCostValue(cost)}) bei ${scoreRatio}% Score-Qualität von Mittel.`
    }
    const scoreGap = Math.round((bv.result.appropriateness - modelResults.mittel.appropriateness) * 100)
    return `Aufgabenkomplexität rechtfertigt den vollen Aufwand — Score ${scoreGap > 0 ? '+' : ''}${scoreGap} Pkt. vor Mittel.`
  })()

  // ── Modus: Aufgaben vergleichen ─────────────────────────────────────────
  const [taskModel, setTaskModel] = useState<ModelClass>('gross')

  const sortedScenarios = useMemo(
    () =>
      [...scenarios]
        .map((scenario) => ({ scenario, result: calculateScore(scenario, taskModel) }))
        .sort((a, b) => b.result.appropriateness - a.result.appropriateness),
    [taskModel],
  )

  const letterGroups = ['A', 'B', 'C', 'D', 'E'] as const

  return (
    <section className="panel panel-comparison">
      <div className="panel-heading">
        <h2>Vergleich</h2>
        <p>
          {effectiveMode === 'modelle'
            ? isBusiness
              ? 'Gleiche Aufgabe, drei Modelle — was die Modellwahl im Betrieb kostet.'
              : 'Gleiche Aufgabe, drei Modelle — sieh wie der Score auf die Modellwahl reagiert.'
            : 'Ein Modell, alle Szenarien — sortiert von A bis E.'}
        </p>
      </div>

      {/* ── Mode-Toggle ── */}
      {!isSimple && (
        <div className="compare-mode-toggle">
          <button
            type="button"
            className={`mode-btn ${mode === 'modelle' ? 'active' : ''}`}
            onClick={() => setMode('modelle')}
          >
            Modelle vergleichen
          </button>
          <button
            type="button"
            className={`mode-btn ${mode === 'aufgaben' ? 'active' : ''}`}
            onClick={() => setMode('aufgaben')}
          >
            Aufgaben vergleichen
          </button>
        </div>
      )}

      {/* ── Modus A: Modelle ── */}
      {effectiveMode === 'modelle' && (
        <>
          <label className="scenario-select-label">
            <span>Szenario wählen</span>
            <select value={selectedScenarioId} onChange={(e) => setSelectedScenarioId(e.target.value)}>
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </label>
          <p className="context-hint">
            {isBusiness
              ? 'Hochgerechnet auf das angenommene Tagesvolumen.'
              : 'Der Score zeigt, ob der Aufwand für die gewählte Aufgabe gerechtfertigt war.'}
          </p>

          {isBusiness && (
            <label className="fleet-volume-input">
              <input
                type="number"
                min={1}
                value={requestsPerDay}
                onChange={(event) => setRequestsPerDay(Math.max(1, Number(event.target.value) || 1))}
              />
              <span>Anfragen/Tag (angenommenes Volumen)</span>
            </label>
          )}

          <div className={`comparison-row-annotated ${isSimple ? 'comparison-row-annotated-simple' : ''}`}>
            {/* Klein */}
            <div className={`compare-card ${bestOption.key === 'klein' ? 'best-choice' : ''}`}>
              <div className="compare-card-header">
                <h3>{modelTitles.klein}</h3>
                {bestOption.key === 'klein' ? <span className="best-pill">Beste Wahl</span> : null}
              </div>
              <ScoreCard result={modelResults.klein} />
              <div className="compare-footnote">
                {isBusiness ? (
                  <>
                    <span>{formatCo2(modelResults.klein.co2Gram * monthlyRequests)} CO₂/Monat</span>
                    <span>{formatCostValue(modelResults.klein.costEuro * monthlyRequests)}/Monat</span>
                  </>
                ) : (
                  <>
                    <span>{formatCo2(modelResults.klein.co2Gram)} CO₂</span>
                    <span>{formatCostValue(modelResults.klein.costEuro)}</span>
                  </>
                )}
              </div>
            </div>

            {/* Connector: Klein → Mittel */}
            {!isSimple && (
              <div className="diff-connector">
                <span className="diff-arrow">→</span>
                <span className="diff-badge diff-energy">+{energyDiffKM}% Energie</span>
                <span className={`diff-badge diff-quality diff-quality-${qualKM.cls}`}>{qualKM.text}</span>
              </div>
            )}

            {/* Mittel */}
            <div className={`compare-card ${bestOption.key === 'mittel' ? 'best-choice' : ''}`}>
              <div className="compare-card-header">
                <h3>{modelTitles.mittel}</h3>
                {bestOption.key === 'mittel' ? <span className="best-pill">Beste Wahl</span> : null}
              </div>
              <ScoreCard result={modelResults.mittel} />
              <div className="compare-footnote">
                {isBusiness ? (
                  <>
                    <span>{formatCo2(modelResults.mittel.co2Gram * monthlyRequests)} CO₂/Monat</span>
                    <span>{formatCostValue(modelResults.mittel.costEuro * monthlyRequests)}/Monat</span>
                  </>
                ) : (
                  <>
                    <span>{formatCo2(modelResults.mittel.co2Gram)} CO₂</span>
                    <span>{formatCostValue(modelResults.mittel.costEuro)}</span>
                  </>
                )}
              </div>
            </div>

            {/* Connector: Mittel → Groß */}
            {!isSimple && (
              <div className="diff-connector">
                <span className="diff-arrow">→</span>
                <span className="diff-badge diff-energy">+{energyDiffMG}% Energie</span>
                <span className={`diff-badge diff-quality diff-quality-${qualMG.cls}`}>{qualMG.text}</span>
              </div>
            )}

            {/* Groß */}
            <div className={`compare-card ${bestOption.key === 'gross' ? 'best-choice' : ''}`}>
              <div className="compare-card-header">
                <h3>{modelTitles.gross}</h3>
                {bestOption.key === 'gross' ? <span className="best-pill">Beste Wahl</span> : null}
              </div>
              <ScoreCard result={modelResults.gross} />
              <div className="compare-footnote">
                {isBusiness ? (
                  <>
                    <span>{formatCo2(modelResults.gross.co2Gram * monthlyRequests)} CO₂/Monat</span>
                    <span>{formatCostValue(modelResults.gross.costEuro * monthlyRequests)}/Monat</span>
                  </>
                ) : (
                  <>
                    <span>{formatCo2(modelResults.gross.co2Gram)} CO₂</span>
                    <span>{formatCostValue(modelResults.gross.costEuro)}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {!isSimple && (
            <div className="best-value-row">
              <span className="best-value-label">Bestes Kosten-Nutzen-Verhältnis:</span>
              <strong className="best-value-model">{modelTitles[bestValueOption.key]}</strong>
              <span className="best-value-sep">—</span>
              <span className="best-value-reason">{bestValueReason}</span>
            </div>
          )}

          {!isSimple && (
            <div className="savings-banner" style={isBusiness ? { borderColor: B2B_ACCENT } : undefined}>
              <h3>Wirtschaftlicher und ökologischer Gewinn</h3>
              <p>
                {isBusiness ? (
                  <>
                    Die beste Wahl ({modelTitles[bestOption.key]}) spart gegenüber der schwächsten Option ({modelTitles[worstOption.key]}) ca.{' '}
                    {formatCo2(savingsCo2 * monthlyRequests)} CO₂ und {formatCostValue(savingsCost * monthlyRequests)} pro Monat bei {requestsPerDay.toLocaleString('de-DE')} Anfragen/Tag.
                  </>
                ) : (
                  <>
                    Die beste Wahl ({modelTitles[bestOption.key]}) spart gegenüber der schwächsten Option ({modelTitles[worstOption.key]}) ca. {formatCo2(savingsCo2)} CO₂ und {formatCostValue(savingsCost)} pro Nutzung.
                  </>
                )}
              </p>
            </div>
          )}

          <p className="closing-line">Die beste Option ist nicht immer das größte Modell – der Score macht die sinnvolle Mitte sichtbar.</p>
        </>
      )}

      {/* ── Modus B: Aufgaben ── */}
      {effectiveMode === 'aufgaben' && (
        <>
          <div className="task-model-selector">
            {(['klein', 'mittel', 'gross'] as ModelClass[]).map((m) => (
              <button
                key={m}
                type="button"
                className={`task-model-btn ${taskModel === m ? 'active' : ''}`}
                onClick={() => setTaskModel(m)}
              >
                {modelTitles[m]}
              </button>
            ))}
          </div>
          <p className="context-hint">
            {sortedScenarios.filter((r) => r.result.letter === 'A').length} von {scenarios.length} Szenarien erhalten Score A mit {modelTitles[taskModel]}.
          </p>

          <div className="task-scenario-list">
            {letterGroups.map((letter) => {
              const group = sortedScenarios.filter((r) => r.result.letter === letter)
              if (group.length === 0) return null
              const sc = scoreColors[letter]
              return (
                <div key={letter} className="task-letter-group">
                  <div className="task-letter-divider" style={{ borderColor: sc.border }}>
                    <span className="task-letter-badge" style={{ color: sc.text, background: sc.bg, borderColor: sc.border }}>
                      {letter}
                    </span>
                    <span className="task-letter-count">{group.length} Szenario{group.length !== 1 ? 's' : ''}</span>
                  </div>
                  {group.map(({ scenario, result }) => (
                    <div key={scenario.id} className="task-row">
                      <div className="task-row-info">
                        <span className="task-row-title">{scenario.title}</span>
                        <span className={`task-row-type ${taskTypeMeta[scenario.taskType].tone}`}>
                          {taskTypeMeta[scenario.taskType].icon} {scenario.taskType}
                        </span>
                      </div>
                      <div className="task-row-metrics">
                        <span>{formatCo2(result.co2Gram)}</span>
                        <span>{formatCostValue(result.costEuro)}</span>
                        <span className="task-row-pct">{Math.round(result.appropriateness * 100)} %</span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}

function fmtKm(km: number): string {
  if (km >= 1) return `${km.toFixed(1)} km`
  if (km >= 0.01) return `${(km * 1000).toFixed(0)} m`
  if (km > 0) return '< 10 m'
  return '0 km'
}

function fmtCharges(n: number): string {
  if (n >= 1) return `${n.toFixed(0)}×`
  if (n >= 0.1) return `${n.toFixed(1)}×`
  if (n > 0) return '< 0,1×'
  return '0×'
}

function fmtStreamH(h: number): string {
  if (h >= 1) return `${h.toFixed(0)} h`
  if (h >= 1 / 60) return `${Math.round(h * 60)} min`
  if (h > 0) return '< 1 min'
  return '0 h'
}

function fmtTrees(n: number): string {
  if (n >= 1) return `${n.toFixed(0)}`
  if (n >= 0.1) return `${n.toFixed(1)}`
  if (n > 0) return '< 0,1'
  return '0'
}

function fmtDays(d: number): string {
  if (d >= 1) return `${d.toFixed(1)} Tage`
  if (d >= 1 / 24) return `${(d * 24).toFixed(1)} h`
  if (d >= 1 / 1440) return `${Math.round(d * 1440)} min`
  if (d > 0) return '< 1 min'
  return '0 Tage'
}

function SkalierungTab({ result, scenario, modelClass }: { result: ScoreResult; scenario: Scenario; modelClass: ModelClass }) {
  const { isSimple } = useViewMode()
  const [selectedScenarioId, setSelectedScenarioId] = useState(scenario.id)
  const [selectedModel, setSelectedModel] = useState<ModelClass>(modelClass)
  const [requestsPerDay, setRequestsPerDay] = useState(1000000)
  const [inputText, setInputText] = useState('1.000.000')

  const applyRequests = (raw: string) => {
    const cleaned = raw.replace(/[^\d]/g, '')
    const parsed = parseInt(cleaned, 10)
    if (!isNaN(parsed) && parsed > 0) {
      const clamped = Math.min(Math.max(parsed, 100), 100_000_000)
      setRequestsPerDay(clamped)
      setInputText(clamped.toLocaleString('de-DE'))
    } else {
      setInputText(requestsPerDay.toLocaleString('de-DE'))
    }
  }

  const handleSliderChange = (value: number) => {
    setRequestsPerDay(value)
    setInputText(value.toLocaleString('de-DE'))
  }

  const handleStepClick = (value: number) => {
    setRequestsPerDay(value)
    setInputText(value.toLocaleString('de-DE'))
  }

  const selectedScenario = useMemo(
    () => scenarios.find((entry) => entry.id === selectedScenarioId) ?? scenario,
    [selectedScenarioId, scenario],
  )

  const profile = modelProfiles[selectedModel]

  const impact = useMemo(
    () => calculateScalingImpact(requestsPerDay, selectedScenario.estimatedTokens, profile.energyPer1kTokensWh, profile.pricePer1kTokensEuro),
    [requestsPerDay, selectedScenario.estimatedTokens, profile.energyPer1kTokensWh, profile.pricePer1kTokensEuro],
  )

  const sparklinePoints = useMemo(() => {
    const values = [100, 1000, 10000, 100000, 1000000, 10000000, 100000000]
    return values.map((value) => ({
      label: value.toLocaleString('de-DE'),
      value: calculateScalingImpact(value, selectedScenario.estimatedTokens, profile.energyPer1kTokensWh, profile.pricePer1kTokensEuro).totalCo2Gram,
    }))
  }, [selectedScenario.estimatedTokens, profile.energyPer1kTokensWh, profile.pricePer1kTokensEuro])

  const namedSteps = [
    { value: 1_000, label: 'Kleine Firma, interner Chatbot' },
    { value: 100_000, label: 'Mittelgroßer FAQ-Service' },
    { value: 1_000_000, label: 'Großer Kundenservice-Bot (z.B. Telekom)' },
    { value: 10_000_000, label: 'ChatGPT-Nutzung einer deutschen Großstadt pro Tag' },
  ]
  const currentStepIndex = namedSteps.findIndex((s) => s.value === requestsPerDay)

  const impactYear = {
    co2Gram: impact.totalCo2Gram * 365,
    energyWh: impact.totalEnergyWh * 365,
    costEuro: impact.totalCostEuro * 365,
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Skalierung</h2>
        <p>Wähle Szenario und Modell und verfolge die Wirkung steigender Anfragefrequenz live.</p>
      </div>

      <div className="scaling-controls">
        <label>
          <span>Szenario</span>
          <select value={selectedScenarioId} onChange={(event) => setSelectedScenarioId(event.target.value)}>
            {scenarios.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Modell</span>
          <select value={selectedModel} onChange={(event) => setSelectedModel(event.target.value as ModelClass)}>
            {Object.entries(modelProfiles).map(([key, profileEntry]) => (
              <option key={key} value={key}>
                {profileEntry.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="slider-panel">
        <div className="slider-header">
          <label htmlFor="requests-slider" className="slider-heading">Anfragen pro Tag</label>
          {!isSimple && (
            <input
              type="text"
              inputMode="numeric"
              className="requests-input"
              value={inputText}
              aria-label="Anfragen pro Tag (direkte Eingabe)"
              onChange={(e) => setInputText(e.target.value)}
              onBlur={() => applyRequests(inputText)}
              onKeyDown={(e) => { if (e.key === 'Enter') applyRequests(inputText) }}
            />
          )}
        </div>
        <input
          id="requests-slider"
          type="range"
          className="requests-slider"
          min="100"
          max="100000000"
          step="100"
          list="scaling-steps"
          value={requestsPerDay}
          onChange={(event) => handleSliderChange(Number(event.target.value))}
        />
        <datalist id="scaling-steps">
          {namedSteps.map((step) => (
            <option key={step.value} value={step.value} />
          ))}
        </datalist>

        <div className="scale-step-row" aria-label="Reale Skalierungs-Szenarien">
          {namedSteps.map((step, index) => (
            <button
              key={step.value}
              type="button"
              className={`scale-step scale-step-named ${index === currentStepIndex ? 'active' : ''}`}
              onClick={() => handleStepClick(step.value)}
            >
              <span className="scale-step-label">{step.label}</span>
              <span className="scale-step-num">{step.value.toLocaleString('de-DE')} / Tag</span>
            </button>
          ))}
        </div>

        <div className={`impact-grid ${isSimple ? 'impact-grid-simple' : ''}`}>
          <article className="impact-card">
            <h3>CO₂ pro Tag</h3>
            <p className="impact-value">{formatCo2(impact.totalCo2Gram)}</p>
            <p>≈ {fmtKm(impact.carKm)} Autofahrt</p>
            {!isSimple && (
              <div className="impact-year-row">
                <span className="impact-year-label">pro Jahr ×365</span>
                <strong className="impact-year-value">{formatCo2(impactYear.co2Gram)}</strong>
              </div>
            )}
          </article>
          {!isSimple && (
            <article className="impact-card">
              <h3>Energie pro Tag</h3>
              <p className="impact-value">{formatEnergyValue(impact.totalEnergyWh)}</p>
              <p>≈ {fmtCharges(impact.phoneCharges)} Smartphone-Ladevorgänge</p>
              <div className="impact-year-row">
                <span className="impact-year-label">pro Jahr ×365</span>
                <strong className="impact-year-value">{formatEnergyValue(impactYear.energyWh)}</strong>
              </div>
            </article>
          )}
          {!isSimple && (
            <article className="impact-card">
              <h3>Kosten pro Tag</h3>
              <p className="impact-value">{formatCostValue(impact.totalCostEuro)}</p>
              <p>≈ {fmtStreamH(impact.streamingHours)} Streaming</p>
              <div className="impact-year-row">
                <span className="impact-year-label">pro Jahr ×365</span>
                <strong className="impact-year-value">{formatCostValue(impactYear.costEuro)}</strong>
              </div>
            </article>
          )}
        </div>

        <div className={`visual-row ${isSimple ? 'visual-row-simple' : ''}`}>
          {!isSimple && (
            <div className="impact-card wide-card">
              <h3>Skalierungsverlauf</h3>
              <ImpactSparkline points={sparklinePoints} currentValue={impact.totalCo2Gram} currentRequestsPerDay={requestsPerDay} />
            </div>
          )}
          <div className="impact-card">
            <h3>Alltagsvergleich</h3>
            <div className="comparison-list">
              <div className="comparison-item"><strong>Autokilometer</strong><span>{fmtKm(impact.carKm)}</span></div>
              <div className="comparison-item"><strong>Smartphone-Ladevorgänge</strong><span>{fmtCharges(impact.phoneCharges)}</span></div>
              <div className="comparison-item"><strong>Streaming-Stunden</strong><span>{fmtStreamH(impact.streamingHours)}</span></div>
              {!isSimple && (
                <>
                  <div className="comparison-item"><strong>Bäume</strong><span>{fmtTrees(impact.trees)}</span></div>
                  <div className="comparison-item"><strong>Haushalts-Tage</strong><span>{fmtDays(impact.householdDays)}</span></div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {!isSimple && (
        <div className="info-grid">
          <div className="info-card">
            <h3>Aktueller Stand</h3>
            <ScoreCard result={result} />
          </div>
          <div className="info-card">
            <h3>Hinweis</h3>
            <p>Die Zahlen sind bewusst grob und dienen als einfache Skalierung für die Größenordnung. Sie zeigen, wie schnell sich ein hoher Anfrageverkehr in reale Effekte übersetzt.</p>
          </div>
        </div>
      )}
    </section>
  )
}

function BibliothekTab({ scenarios, onLoadInRechner }: { scenarios: Scenario[]; onLoadInRechner: (scenarioId: string) => void }) {
  const { isSimple } = useViewMode()
  const [search, setSearch] = useState('')
  const [taskFilter, setTaskFilter] = useState<'all' | TaskType>('all')
  const [scoreFilter, setScoreFilter] = useState<'all' | ScoreResult['letter']>('all')
  const [modelFilter, setModelFilter] = useState<'all' | ModelClass>('all')

  const visibleScenarios = useMemo(() => {
    if (isSimple) return scenarios
    const query = search.toLowerCase().trim()
    return scenarios.filter((scenario) => {
      const matchesSearch = !query || scenario.title.toLowerCase().includes(query) || scenario.prompt.toLowerCase().includes(query)
      const matchesTask = taskFilter === 'all' || scenario.taskType === taskFilter
      const scores = {
        klein: calculateScore(scenario, 'klein').letter,
        mittel: calculateScore(scenario, 'mittel').letter,
        gross: calculateScore(scenario, 'gross').letter,
      }
      const matchesScore = scoreFilter === 'all' || (modelFilter === 'all' ? Object.values(scores).includes(scoreFilter) : scores[modelFilter] === scoreFilter)

      return matchesSearch && matchesTask && matchesScore
    })
  }, [scenarios, isSimple, search, taskFilter, scoreFilter, modelFilter])

  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Bibliothek</h2>
        <p>Suche und filtere die Szenarien live nach Typ, Score und Modell.</p>
      </div>

      {!isSimple && (
        <div className="library-controls">
          <label>
            <span>Suche</span>
            <input type="text" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Szenario oder Prompt" />
          </label>
          <label>
            <span>Typ</span>
            <select value={taskFilter} onChange={(event) => setTaskFilter(event.target.value as 'all' | TaskType)}>
              <option value="all">Alle</option>
              <option value="trivial">trivial</option>
              <option value="fakten">fakten</option>
              <option value="kreativ">kreativ</option>
              <option value="analyse">analyse</option>
              <option value="code">code</option>
              <option value="generierung">generierung</option>
            </select>
          </label>
          <label>
            <span>Score</span>
            <select value={scoreFilter} onChange={(event) => setScoreFilter(event.target.value as 'all' | ScoreResult['letter'])}>
              <option value="all">Alle</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
              <option value="E">E</option>
            </select>
          </label>
          <label>
            <span>Modell</span>
            <select value={modelFilter} onChange={(event) => setModelFilter(event.target.value as 'all' | ModelClass)}>
              <option value="all">Alle</option>
              <option value="klein">Klein</option>
              <option value="mittel">Mittel</option>
              <option value="gross">Groß</option>
            </select>
          </label>
        </div>
      )}

      <div className="library-grid">
        {visibleScenarios.map((scenario) => {
          const scores = {
            klein: calculateScore(scenario, 'klein').letter,
            mittel: calculateScore(scenario, 'mittel').letter,
            gross: calculateScore(scenario, 'gross').letter,
          }

          return (
            <article key={scenario.id} className="library-item">
              <div className="library-item-header">
                <h3>{scenario.title}</h3>
                <span className="library-chip">{scenario.taskType}</span>
              </div>
              {!isSimple && <p>{scenario.prompt}</p>}
              <div className="library-score-row">
                {(['klein', 'mittel', 'gross'] as ModelClass[]).map((modelClass) => (
                  <span key={modelClass} className={`score-pill ${scores[modelClass].toLowerCase()}`}>
                    {modelTitles[modelClass]} · {scores[modelClass]}
                  </span>
                ))}
              </div>
              {!isSimple && <span>{scenario.description}</span>}
              <button
                type="button"
                className="library-test-btn"
                onClick={() => onLoadInRechner(scenario.id)}
              >
                Im Rechner testen →
              </button>
            </article>
          )
        })}
      </div>
    </section>
  )
}

const scoreColors: Record<string, { text: string; bg: string; border: string }> = {
  A: { text: '#1b5e20', bg: '#f0fdf4', border: '#86efac' },
  B: { text: '#2e7d32', bg: '#f7fef7', border: '#a7f3d0' },
  C: { text: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  D: { text: '#c2410c', bg: '#fff7ed', border: '#fdba74' },
  E: { text: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
}

function DemoOverlay({
  step,
  result,
  canAdvance,
  waitingLabel,
  onAdvance,
  onClose,
}: {
  step: number
  result: ScoreResult
  canAdvance: boolean
  waitingLabel?: string
  onAdvance: () => void
  onClose: () => void
}) {
  const current = DEMO_STEPS[step]
  const isLast = step === DEMO_STEPS.length - 1
  const sc = scoreColors[result.letter] ?? scoreColors.C
  const nextDisabled = !isLast && !canAdvance
  const nextLabel = isLast ? 'Fertig' : nextDisabled ? (waitingLabel ?? 'Warte…') : 'Weiter →'

  return (
    <div className="demo-overlay" role="dialog" aria-modal="false" aria-label="Geführte Demo">
      <div className="demo-dots">
        {DEMO_STEPS.map((_, i) => (
          <span key={i} className={`demo-dot ${i === step ? 'active' : i < step ? 'done' : ''}`} />
        ))}
        <span className="demo-step-label">Schritt {step + 1} / {DEMO_STEPS.length}</span>
      </div>

      <div className="demo-body">
        <div className="demo-headline-row">
          <h3 className="demo-headline">{current.headline}</h3>
          <div className="demo-score-badge" style={{ color: sc.text, background: sc.bg, borderColor: sc.border }}>
            {result.letter}
          </div>
        </div>
        <p className="demo-explanation">{current.explanation}</p>
      </div>

      <div className="demo-footer">
        <button type="button" className="demo-close-btn" onClick={onClose} aria-label="Demo beenden">
          ✕ Beenden
        </button>
        <button
          type="button"
          className="demo-next-btn"
          disabled={nextDisabled}
          onClick={isLast ? onClose : onAdvance}
        >
          {nextLabel}
        </button>
      </div>
    </div>
  )
}

function EinfuehrungTab({ onOpenTab, onStartDemo }: { onOpenTab: (tab: TabKey) => void; onStartDemo: () => void }) {
  const clockScenario = scenarios.find((scenario) => scenario.id === 'clock') ?? scenarios[0]
  const resultKlein = calculateScore(clockScenario, 'klein')
  const resultGross = calculateScore(clockScenario, 'gross')
  const scKlein = scoreColors[resultKlein.letter] ?? scoreColors.C
  const scGross = scoreColors[resultGross.letter] ?? scoreColors.C

  const grossProfile = modelProfiles.gross
  const scalingImpact = calculateScalingImpact(
    100_000,
    clockScenario.estimatedTokens,
    grossProfile.energyPer1kTokensWh,
    grossProfile.pricePer1kTokensEuro,
  )

  return (
    <div className="einfuehrung-shell">

      {/* 0 — Was ist das? */}
      <section className="panel einfuehrung-hero">
        <h2 className="einfuehrung-hero-headline">Nutzt du für deine KI-Fragen die richtige Modellgröße?</h2>
        <p className="einfuehrung-hero-sub">
          KI-Modelle gibt es in klein, mittel und groß. Große verbrauchen viel mehr Energie. Dieses Tool
          zeigt dir mit einer Note von A bis E, ob sich der Aufwand für deine Aufgabe lohnt — so wie der
          Nutri-Score bei Lebensmitteln.
        </p>
      </section>

      {/* 1 — Der Kontrast */}
      <section className="panel">
        <h2 className="kontrast-frage">„{clockScenario.title}"</h2>
        <div className="kontrast-grid">
          <div className="kontrast-card demo-card-good">
            <span className="kontrast-badge">kleines Modell</span>
            <div className="kontrast-letter" style={{ color: scKlein.text }}>{resultKlein.letter}</div>
          </div>
          <div className="kontrast-card demo-card-bad">
            <span className="kontrast-badge">großes Modell</span>
            <div className="kontrast-letter" style={{ color: scGross.text }}>{resultGross.letter}</div>
          </div>
        </div>
        <p className="kontrast-satz">
          Links die kleine KI, rechts die große. Beide sagen dir dieselbe Uhrzeit — aber die große
          verbraucht ein Vielfaches an Strom. Note A gegen Note E.
        </p>
      </section>

      {/* 2 — Die Einordnung */}
      <section className="panel">
        <div className="panel-heading">
          <h2>Warum A bis E?</h2>
        </div>
        <p className="einordnung-text">
          A heißt nicht „verbraucht wenig". A heißt: Aufwand und Aufgabe passen zusammen. Ein Sportwagen
          für 200 Meter zur Bäckerei ist nicht kaputt — nur unnötig.
        </p>
      </section>

      {/* 3 — Warum das zählt */}
      <section className="panel">
        <div className="panel-heading">
          <h2>Einmal ist egal. Millionenfach nicht.</h2>
        </div>
        <p className="millionenfach-satz">
          Einmal die große KI für eine Mini-Frage? Egal. Aber stell dir vor, ein Kundenservice macht das
          100.000 Mal am Tag:
        </p>
        <div className="millionenfach-zahl">{formatCo2(scalingImpact.totalCo2Gram)} CO₂ pro Tag</div>
        <p className="millionenfach-vergleich">≈ {fmtKm(scalingImpact.carKm)} Autofahrt</p>
        <button type="button" className="inline-link" onClick={() => onOpenTab('skalierung')}>
          Selbst hochrechnen →
        </button>
      </section>

      {/* 4 — Call-to-Action */}
      <div className="einfuehrung-cta">
        <button type="button" className="einfuehrung-cta-btn" onClick={onStartDemo}>
          Probier es selbst →
        </button>
        <button type="button" className="einfuehrung-cta-secondary" onClick={() => onOpenTab('rechner')}>
          oder direkt zum Rechner
        </button>
      </div>

    </div>
  )
}

function MethodikTab({ result }: { result: ScoreResult }) {
  const { isSimple } = useViewMode()
  const benefitRows: Array<{ type: string; index: number; label: string }> = [
    { type: 'trivial', index: 0.20, label: 'Einfache Faktenfrage, keine Schlussfolgerung nötig' },
    { type: 'fakten', index: 0.45, label: 'Informationsextraktion, Zusammenfassung' },
    { type: 'kreativ', index: 0.60, label: 'Generative Textaufgabe, mittlere Komplexität' },
    { type: 'code', index: 0.80, label: 'Logisch anspruchsvolle Programmieraufgabe' },
    { type: 'analyse', index: 0.85, label: 'Komplexe Mustererkennung, Interpretation' },
    { type: 'generierung', index: 0.92, label: 'Multimodale Synthese, Bilddiffusion' },
  ]

  const modelRows = [
    { label: 'Klein', band: '1–10 Mrd. Parameter', energy: '0,0008 Wh/1k', price: '0,002 €/1k', source: 'Patterson et al. 2021 · MLCommons' },
    { label: 'Mittel', band: '10–70 Mrd. Parameter', energy: '0,0017 Wh/1k', price: '0,01 €/1k', source: 'MLCommons · Mistral / Llama 3 Listenpreis Q1 2025' },
    { label: 'Groß', band: '>70 Mrd. Parameter', energy: '0,0036 Wh/1k', price: '0,06 €/1k', source: 'OpenAI / Anthropic / Google API Q1 2025' },
  ]

  return (
    <div className="methodik-shell">
      <section className="panel">
        <div className="panel-heading">
          <h2>Hintergrund</h2>
          <p>Alle Berechnungen sind transparente Schätzungen — keine Pseudogenauigkeit, kein Greenwashing.</p>
        </div>

        <div className="methodik-section">
          <h3>Grundprinzip</h3>
          <p>
            Der KI-Nutri-Score bewertet nicht, wie viel Energie ein Modell verbraucht, sondern ob der Energieaufwand
            in einem sinnvollen Verhältnis zur gestellten Aufgabe steht. Ein großes Modell für eine triviale Frage
            ist Ressourcenverschwendung — ein kleines Modell für eine komplexe Analyse ebenfalls ineffizient, weil
            schlechtere Ergebnisse Nachfragen provozieren. Der Score misst die <strong>Passung</strong>, nicht den
            absoluten Verbrauch.
          </p>
          <p>
            Das Konzept lehnt sich an den Lebensmittel-Nutri-Score an: A steht nicht für „wenig Kalorien",
            sondern für ein ausgewogenes Verhältnis von Nährstoffen zu Bedarf. Hier: Rechenaufwand zu Aufgabenbedarf.
          </p>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Was heißt klein/mittel/groß?</h2>
          <p>Die Grundlage, um dein eigenes KI-Modell einzuordnen.</p>
        </div>
        <ModellGuide />
      </section>

      {!isSimple && (
      <>
      <section className="panel">
        <div className="panel-heading">
          <h2>Offene Formel</h2>
          <p>Was der Score berechnet — Schritt für Schritt, ohne Blackbox.</p>
        </div>

        <ol className="formula-steps">
          <li className="formula-step">
            <span className="formula-step-num">1</span>
            <div className="formula-step-body">
              <strong>Token-Aufwand schätzen</strong>
              <p>Jede Anfrage besteht aus Tokens. Das Tool schätzt die Token-Anzahl pro Aufgabentyp (z. B. „Gedicht schreiben" ≈ 1 500 Tokens). Dieser Wert wird mit dem Energiefaktor des gewählten Modells multipliziert.</p>
              <code>effortWh = (Tokens ÷ 1 000) × Energie_pro_1k_Tokens</code>
              <p className="formula-step-example">Beispiel: (1 500 ÷ 1 000) × 0,0017 Wh = <strong>0,0026 Wh</strong></p>
            </div>
          </li>
          <li className="formula-step">
            <span className="formula-step-num">2</span>
            <div className="formula-step-body">
              <strong>CO₂-Äquivalent umrechnen</strong>
              <p>Energie wird mit dem EU-Strommix-Faktor in Gramm CO₂ umgerechnet. Der Faktor 0,40 g/Wh gilt für den EU-Durchschnitt 2023 (Ember Climate). Regional stark abweichend — Norwegen &lt; 0,05 g, Polen &gt; 0,70 g.</p>
              <code>co2 [g] = effortWh × 0,40 g/Wh</code>
              <p className="formula-step-example">Beispiel: 0,0026 Wh × 0,40 = <strong>0,001 g CO₂</strong></p>
            </div>
          </li>
          <li className="formula-step">
            <span className="formula-step-num">3</span>
            <div className="formula-step-body">
              <strong>Aufgabenbedarf bestimmen</strong>
              <p>Jeder Aufgabentyp erhält einen Nutzenindex (0,20–0,92), der beschreibt, wie viel Modellkapazität die Aufgabe sinnvollerweise benötigt. Triviale Fragen haben 0,20, multimodale Synthese 0,92. Aus dem Nutzenindex ergibt sich die benötigte Modellgröße auf der Skala 1–3.</p>
              <code>requiredSize = 1 + Nutzenindex × 2</code>
              <p className="formula-step-example">Beispiel: kreativ → 0,60 → requiredSize = <strong>2,20</strong></p>
            </div>
          </li>
          <li className="formula-step">
            <span className="formula-step-num">4</span>
            <div className="formula-step-body">
              <strong>Abweichung von der optimalen Größe messen</strong>
              <p>Die tatsächliche Modellgröße (Klein = 1, Mittel = 2, Groß = 3) wird mit der benötigten verglichen. Ist das Modell zu groß, entsteht Über-Allokation — ist es zu klein, Unter-Allokation. Über-Allokation wird doppelt so stark bestraft, weil ein zu großes Modell immer Ressourcen verschwendet, ein zu kleines zumindest versucht, die Aufgabe zu erfüllen.</p>
              <code>Über-Allokation  = max(0, Modell − requiredSize) ÷ 2</code>
              <code>Unter-Allokation = max(0, requiredSize − Modell) ÷ 4</code>
            </div>
          </li>
          <li className="formula-step">
            <span className="formula-step-num">5</span>
            <div className="formula-step-body">
              <strong>Angemessenheitsscore und Briefnote berechnen</strong>
              <p>Der finale Score ist 1 minus die beiden Abzüge, begrenzt auf den Bereich 0–1. Daraus folgt die Briefnote.</p>
              <code>score = clamp(1 − Über-Allokation − Unter-Allokation,&nbsp; 0,&nbsp; 1)</code>
              <p className="formula-step-example">A ≥ 0,82 &nbsp;·&nbsp; B ≥ 0,68 &nbsp;·&nbsp; C ≥ 0,50 &nbsp;·&nbsp; D ≥ 0,30 &nbsp;·&nbsp; E &lt; 0,30</p>
            </div>
          </li>
        </ol>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Bewertungsformel</h2>
          <p>Die Formelkette von Tokens bis zur Schulnote A–E.</p>
        </div>

        <div className="methodik-section">
          <div className="formula-block">
            <div className="formula-line"><span className="formula-label">Aufwand</span><code>effortWh = (Tokens ÷ 1 000) × Energie_pro_1k [Wh]</code></div>
            <div className="formula-line"><span className="formula-label">CO₂</span><code>co2 [g] = effortWh × 0,40 g/Wh &nbsp;&nbsp;(EU-Strommix 2023)</code></div>
            <div className="formula-line"><span className="formula-label">Kosten</span><code>cost [€] = (Tokens ÷ 1 000) × Preis_pro_1k [€]</code></div>
            <div className="formula-divider" />
            <div className="formula-line"><span className="formula-label">Bedarf</span><code>requiredSize = 1 + Nutzenindex × 2 &nbsp;&nbsp;&nbsp;[Skala 1–3]</code></div>
            <div className="formula-line"><span className="formula-label">Über-Allokation</span><code>over = max(0, Modellgröße − requiredSize) ÷ 2</code></div>
            <div className="formula-line"><span className="formula-label">Unter-Allokation</span><code>under = max(0, requiredSize − Modellgröße) ÷ 4</code></div>
            <div className="formula-line"><span className="formula-label">Angemessenheit</span><code>score = clamp(1 − over − under, 0, 1)</code></div>
          </div>
          <p className="formula-note">
            Modellgröße: klein = 1, mittel = 2, groß = 3. Über-Allokation wird stärker bestraft als Unter-Allokation,
            weil unnötig großes Modell immer verschwendet — zu kleines Modell lässt sich notfalls ergänzen.
          </p>
        </div>

        <div className="methodik-section">
          <h3>Briefstufen</h3>
          <div className="table-wrap">
            <table className="analysis-table">
              <thead>
                <tr><th>Note</th><th>Angemessenheit</th><th>Bedeutung</th></tr>
              </thead>
              <tbody>
                <tr><td><strong>A</strong></td><td>≥ 0,82</td><td>Sehr passende Modellwahl</td></tr>
                <tr><td><strong>B</strong></td><td>≥ 0,68</td><td>Gut vertretbar</td></tr>
                <tr><td><strong>C</strong></td><td>≥ 0,50</td><td>Mittel — Verbesserung möglich</td></tr>
                <tr><td><strong>D</strong></td><td>≥ 0,30</td><td>Schwach — Modell kaum begründbar</td></tr>
                <tr><td><strong>E</strong></td><td>&lt; 0,30</td><td>Unangemessen — Modell eindeutig falsch</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="methodik-section">
          <h3>Nutzenindex pro Aufgabentyp</h3>
          <div className="table-wrap">
            <table className="analysis-table">
              <thead>
                <tr><th>Typ</th><th>Nutzenindex</th><th>Begründung</th></tr>
              </thead>
              <tbody>
                {benefitRows.map((row) => (
                  <tr key={row.type}>
                    <td><strong>{row.type}</strong></td>
                    <td>{row.index.toFixed(2)}</td>
                    <td>{row.label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="formula-note">Aktuelle Schätzung für dieses Szenario: {result.methodHint}</p>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Parameter-Tabelle</h2>
          <p>Alle Modellparameter mit Quellen — bewusst grobe Größenordnungen, keine Herstellergarantien.</p>
        </div>

        <div className="table-wrap">
          <table className="analysis-table">
            <thead>
              <tr>
                <th>Modellklasse</th>
                <th>Parametergröße</th>
                <th>Energie / 1k Tokens</th>
                <th>Preis / 1k Tokens</th>
                <th>Quellen</th>
              </tr>
            </thead>
            <tbody>
              {modelRows.map((row) => (
                <tr key={row.label}>
                  <td><strong>{row.label}</strong></td>
                  <td>{row.band}</td>
                  <td>{row.energy}</td>
                  <td>{row.price}</td>
                  <td className="source-cell">{row.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="info-grid" style={{ marginTop: '1.2rem' }}>
          <div className="info-card">
            <h3>CO₂-Intensität Strom</h3>
            <p>0,40 g CO₂ / Wh — EU-Durchschnitt 2023 (Ember Climate). Variiert stark nach Region: Norwegen &lt; 0,05 g, Polen &gt; 0,70 g.</p>
          </div>
          <div className="info-card">
            <h3>Token-Schätzungen</h3>
            <p>Alle <code>estimatedTokens</code> sind grobe Richtwerte für typische Aufgaben der jeweiligen Kategorie. Reale Werte variieren je nach Prompt-Länge und Modell.</p>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Annahmen je Modellklasse</h2>
          <p>Jede Klasse steht für eine Größenordnung — kein spezifisches Produkt, sondern einen repräsentativen Wertebereich.</p>
        </div>

        <div className="table-wrap">
          <table className="analysis-table">
            <thead>
              <tr>
                <th>Klasse</th>
                <th>Parameter</th>
                <th>Energie / 1k Tokens</th>
                <th>Unsicherheitsbereich</th>
                <th>Quelle</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Klein</strong></td>
                <td>1–10 Mrd.</td>
                <td>0,0008 Wh</td>
                <td className="uncertainty-cell">± 50 % (0,0004–0,0012 Wh)</td>
                <td className="source-cell">Patterson et al. 2021 · MLCommons</td>
              </tr>
              <tr>
                <td><strong>Mittel</strong></td>
                <td>10–70 Mrd.</td>
                <td>0,0017 Wh</td>
                <td className="uncertainty-cell">± 40 % (0,0010–0,0024 Wh)</td>
                <td className="source-cell">MLCommons · Mistral / Llama 3, Q1 2025</td>
              </tr>
              <tr>
                <td><strong>Groß</strong></td>
                <td>&gt; 70 Mrd.</td>
                <td>0,0036 Wh</td>
                <td className="uncertainty-cell">± 35 % (0,0023–0,0049 Wh)</td>
                <td className="source-cell">OpenAI / Anthropic / Google API, Q1 2025</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="formula-note">
          Die Unsicherheitsbereiche entstehen durch Hardware-Unterschiede (GPU-Generation, Batch-Größe), Implementierungsdetails und mangelnde öffentliche Datenlage.
          Ein „Groß"-Modell auf dedizierter, moderner Hardware kann bis zu 40 % effizienter sein als der angegebene Richtwert.
          Alle Werte beziehen sich ausschließlich auf Inferenz — Training ist nicht enthalten.
        </p>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Abgrenzung: KI-Nutri-Score vs. AI Energy Score</h2>
          <p>Zwei verwandte, aber grundlegend verschiedene Konzepte.</p>
        </div>

        <div className="info-grid">
          <div className="info-card">
            <h3>AI Energy Score (MLCommons u. a.)</h3>
            <ul>
              <li>Misst <strong>absoluten Energieverbrauch</strong> pro Task-Benchmark</li>
              <li>Benchmarks sind standardisiert und reproduzierbar</li>
              <li>Ziel: Modelle vergleichen, Hardware optimieren</li>
              <li>Keine Aussage zur Angemessenheit der Modellwahl</li>
            </ul>
          </div>
          <div className="info-card">
            <h3>KI-Nutri-Score (dieses Tool)</h3>
            <ul>
              <li>Misst <strong>Verhältnis Aufwand zu Aufgabenbedarf</strong></li>
              <li>Grobe Schätzungen, keine kontrollierten Benchmarks</li>
              <li>Ziel: Entscheidungshilfe bei der Modellwahl im Alltag</li>
              <li>A kann ein kleines Modell für eine triviale Aufgabe sein</li>
            </ul>
          </div>
        </div>

        <div className="info-card" style={{ marginTop: '0' }}>
          <h3>Gemeinsamkeit</h3>
          <p>Beide Ansätze versuchen, den Ressourcenverbrauch von KI transparent zu machen — der AI Energy Score mit wissenschaftlichem Anspruch, der KI-Nutri-Score mit pragmatischem Alltagsfokus. Sie schließen sich nicht aus, sondern ergänzen sich.</p>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Ehrlichkeitsprinzip</h2>
          <p>Was dieses Tool bewusst nicht leistet — und warum das so ist.</p>
        </div>

        <div className="info-grid">
          <div className="info-card">
            <h3>Was nicht enthalten ist</h3>
            <ul>
              <li><strong>Training:</strong> Der Energiebedarf für das Vor-Training ist nicht berücksichtigt — er übersteigt Inferenz um ein Vielfaches.</li>
              <li><strong>Hardware-Herstellung:</strong> Embodied Carbon der GPUs fehlt.</li>
              <li><strong>Kühlung:</strong> PUE-Faktor (Power Usage Effectiveness) der Rechenzentren ist nicht eingerechnet.</li>
              <li><strong>Netz:</strong> Datenübertragung und Client-seitige Energie fehlen.</li>
            </ul>
          </div>
          <div className="info-card">
            <h3>Warum trotzdem sinnvoll</h3>
            <ul>
              <li>Inferenz ist der einzige Faktor, der mit jedem einzelnen Prompt skaliert.</li>
              <li>Relative Unterschiede zwischen Modellen sind trotz Unschärfe aussagekräftig.</li>
              <li>Bewusstsein für Größenordnungen ist besser als gar keine Orientierung.</li>
              <li>Das Tool ist ein Gesprächsstarter, kein Zertifikat.</li>
            </ul>
          </div>
        </div>

        <div className="info-card" style={{ marginTop: '0' }}>
          <h3>Konsequenz für die Nutzung</h3>
          <p>
            Die Zahlen sind Richtwerte — Schätzungen, die Größenordnungen zeigen, keine exakten Messungen.
            Ein Score von A bedeutet nicht, dass die Nutzung „ökologisch unbedenklich" ist. Er bedeutet, dass
            das gewählte Modell <em>verhältnismäßig</em> zur Aufgabe ist. Die Entscheidung, ob eine Aufgabe
            überhaupt KI erfordert, liegt außerhalb des Scope dieses Tools.
          </p>
        </div>
      </section>
      </>
      )}

      <section className="panel">
        <div className="panel-heading">
          <h2>Was dieser Score nicht kann</h2>
          <p>Ehrlichkeit über Grenzen ist Teil des Konzepts — kein Zertifikat, sondern eine Orientierungshilfe.</p>
        </div>

        <ul className="limitations-list">
          <li className="limitation-item">
            <div className="limitation-marker" aria-hidden="true">×</div>
            <div className="limitation-body">
              <strong>Keine Live-Messung</strong>
              <p>Die Energiewerte sind Schätzungen aus öffentlichen Benchmarks, keine Echtzeit-Messung des laufenden Modells. Realer Verbrauch hängt von GPU-Generation, Batch-Größe, Temperatur-Sampling und Netzwerkauslastung ab.</p>
            </div>
          </li>
          <li className="limitation-item">
            <div className="limitation-marker" aria-hidden="true">×</div>
            <div className="limitation-body">
              <strong>Keine Qualitätsbewertung</strong>
              <p>Score A bedeutet nicht, dass das Ergebnis gut, korrekt oder nützlich ist — nur dass die Modellwahl verhältnismäßig zur Aufgabenkomplexität war. Ob ein Modell die Aufgabe tatsächlich löst, liegt vollständig außerhalb des Scope.</p>
            </div>
          </li>
          <li className="limitation-item">
            <div className="limitation-marker" aria-hidden="true">×</div>
            <div className="limitation-body">
              <strong>Keine Berücksichtigung von Trainingskosten</strong>
              <p>Das Vortraining großer Modelle verbraucht die Energie von Hunderttausenden Anfragen. Dieser Anteil ist nicht berücksichtigt — er ist öffentlich nicht belastbar dokumentiert und verteilt sich schwer auf einzelne Nutzungen. Nur Inferenz ist messbar.</p>
            </div>
          </li>
          <li className="limitation-item">
            <div className="limitation-marker" aria-hidden="true">×</div>
            <div className="limitation-body">
              <strong>Keine modellspezifischen Unterschiede innerhalb einer Klasse</strong>
              <p>GPT-4o und Llama-3-70B gelten hier beide als „Groß" — obwohl sie sich in Architektur, Effizienz und tatsächlichem Energieprofil erheblich unterscheiden können. Das Tool abstrahiert bewusst auf drei Klassen, um vergleichbar zu bleiben.</p>
            </div>
          </li>
        </ul>
      </section>

      {!isSimple && (
      <section className="panel">
        <div className="panel-heading">
          <h2>Quellen</h2>
          <p>Alle im Tool verwendeten Referenzwerte mit Quellenangabe — stichpunktartig und nachvollziehbar.</p>
        </div>

        <div className="methodik-section">
          <h3>KI-Energieforschung</h3>
          <ul className="sources-list-methodik">
            <li>
              <strong>Luccioni et al. (2023) — Power Hungry Processing</strong>
              {' '}— Empirische Messung des Energieverbrauchs verschiedener KI-Aufgaben; Grundlage für aufgabenspezifische Energieschätzungen.{' '}
              <a className="source-link" href="https://arxiv.org/abs/2311.16863" target="_blank" rel="noopener noreferrer">arxiv.org/abs/2311.16863 ↗</a>
            </li>
            <li>
              <strong>Patterson et al. (2021) · MLCommons Energy &amp; Power</strong>
              {' '}— Energieverbrauch pro 1k Tokens nach Modellgröße (klein 0,0008 Wh, mittel 0,0017 Wh, groß 0,0036 Wh).
            </li>
          </ul>
        </div>

        <div className="methodik-section">
          <h3>CO₂-Intensität Strom</h3>
          <ul className="sources-list-methodik">
            <li>
              <strong>Ember Climate, European Electricity Review 2023</strong>
              {' '}— 0,40 g CO₂/Wh als EU-Durchschnitt; regional stark abweichend (Norwegen &lt; 0,05 g, Polen &gt; 0,70 g).{' '}
              <a className="source-link" href="https://ember-climate.org/insights/research/european-electricity-review-2023/" target="_blank" rel="noopener noreferrer">ember-climate.org ↗</a>
            </li>
          </ul>
        </div>

        <div className="methodik-section">
          <h3>AI Energy Score</h3>
          <ul className="sources-list-methodik">
            <li>
              <strong>MLCommons AI Energy Score</strong>
              {' '}— Standardisierter Benchmark für absoluten Energieverbrauch von KI-Modellen; Grundlage für den Vergleich im Abgrenzungs-Abschnitt.{' '}
              <a className="source-link" href="https://mlcommons.org/ai-energy-score/" target="_blank" rel="noopener noreferrer">mlcommons.org/ai-energy-score ↗</a>
            </li>
          </ul>
        </div>

        <div className="methodik-section">
          <h3>Modellpreise</h3>
          <ul className="sources-list-methodik">
            <li><strong>OpenAI / Anthropic / Google API, Q1 2025</strong> — Listenpreis großes Modell (0,06 €/1k Tokens)</li>
            <li><strong>Mistral / Llama 3 Listenpreis, Q1 2025</strong> — Listenpreis mittleres Modell (0,01 €/1k Tokens)</li>
            <li><strong>Open-Source-Benchmarks, diverse</strong> — Listenpreis kleines Modell (0,002 €/1k Tokens)</li>
          </ul>
        </div>

        <div className="methodik-section">
          <h3>Alltagsvergleiche</h3>
          <ul className="sources-list-methodik">
            <li><strong>Umweltbundesamt (UBA) 2023</strong> — 120 g CO₂/km für einen durchschnittlichen PKW</li>
            <li><strong>IEA, Digitale Infrastruktur 2023</strong> — ca. 4 g CO₂ pro Smartphone-Ladevorgang (~10 Wh/Ladung)</li>
            <li><strong>Carbon Trust, Streaming-Studie 2021</strong> — ca. 24 g CO₂/h Video-Streaming (konservative Schätzung)</li>
            <li><strong>US Forest Service / BMUV</strong> — ca. 25 g CO₂/Tag CO₂-Aufnahme eines Baumes (~9 kg/Jahr)</li>
            <li><strong>Umweltbundesamt, private Haushalte 2022</strong> — ca. 600 g CO₂/Tag pro Haushalt (Strom- &amp; Wärmeanteil)</li>
          </ul>
        </div>
      </section>
      )}
    </div>
  )
}

function ImpactSparkline({
  points,
  currentValue,
  currentRequestsPerDay,
}: {
  points: Array<{ label: string; value: number }>
  currentValue: number
  currentRequestsPerDay: number
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<{ destroy: () => void } | null>(null)

  useEffect(() => {
    if (chartRef.current) chartRef.current.destroy()
    const container = containerRef.current
    if (!container) return

    // ── Koordinatensystem ────────────────────────────────────────────────
    const W = 400, H = 210
    const PL = 54   // Platz für Y-Achsenbeschriftung
    const PR = 16, PT = 14
    const PB = 38   // Platz für X-Achsenbeschriftung
    const cW = W - PL - PR   // Zeichenbreite
    const cH = H - PT - PB   // Zeichenhöhe
    const x0 = PL             // linke Achse (Y)
    const y0 = PT + cH        // untere Achse (X)

    // ── Y-Skala (log) ────────────────────────────────────────────────────
    const allVals = [...points.map((p) => p.value), currentValue].filter((v) => v > 0)
    const rawMax = Math.max(...allVals, 1e-6)
    const rawMin = Math.min(...allVals, rawMax)
    const safeLog = (v: number) => Math.log10(Math.max(v, 1e-10))
    const yLogMax = safeLog(rawMax) + 0.3
    const yLogMin = Math.min(safeLog(rawMin) - 0.3, yLogMax - 1.5)
    const yRange = yLogMax - yLogMin

    const toY = (v: number) => y0 - ((safeLog(v) - yLogMin) / yRange) * cH

    // ── X-Skala (log, feste Stufen) ──────────────────────────────────────
    const xSteps = [100, 1000, 10000, 100000, 1_000_000, 10_000_000, 100_000_000]
    const xLabels = ['100', '1K', '10K', '100K', '1M', '10M', '100M']
    const xLogMin = safeLog(xSteps[0])
    const xLogMax = safeLog(xSteps[xSteps.length - 1])
    const toX = (v: number) => x0 + ((safeLog(v) - xLogMin) / (xLogMax - xLogMin)) * cW

    // ── SVG aufbauen ─────────────────────────────────────────────────────
    const ns = 'http://www.w3.org/2000/svg'
    const mk = (tag: string, attrs: Record<string, string>) => {
      const e = document.createElementNS(ns, tag)
      for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
      return e
    }
    const mkText = (x: number, y: number, content: string, anchor: string) => {
      const t = mk('text', { x: String(x), y: String(y), 'text-anchor': anchor, class: 'sparkline-label' })
      t.textContent = content
      return t
    }

    const svg = mk('svg', { viewBox: `0 0 ${W} ${H}`, class: 'sparkline-svg', role: 'img', 'aria-label': 'CO₂-Verlauf nach Anfragezahl' })

    // Gradient
    const defs = document.createElementNS(ns, 'defs')
    const grad = mk('linearGradient', { id: 'sparklineGradient', x1: '0%', y1: '0%', x2: '100%', y2: '0%' })
    const s1 = mk('stop', { offset: '0%', 'stop-color': '#0f766e' })
    const s2 = mk('stop', { offset: '100%', 'stop-color': '#f59e0b' })
    grad.append(s1, s2)
    defs.appendChild(grad)
    svg.appendChild(defs)

    // ── Y-Achse: Hilfsgitter + Beschriftung ──────────────────────────────
    const fmtY = formatCo2
    for (let i = 0; i <= 4; i++) {
      const logVal = yLogMin + (i / 4) * yRange
      const y = y0 - (i / 4) * cH
      svg.appendChild(mk('line', { x1: String(x0), y1: String(y), x2: String(x0 + cW), y2: String(y), stroke: '#e2e8f0', 'stroke-width': '1' }))
      svg.appendChild(mkText(x0 - 6, y + 4, fmtY(Math.pow(10, logVal)), 'end'))
    }

    // Y-Achse (senkrechte Linie)
    svg.appendChild(mk('line', { x1: String(x0), y1: String(PT), x2: String(x0), y2: String(y0), stroke: '#666', 'stroke-width': '1.5' }))

    // X-Achse (waagerechte Linie)
    svg.appendChild(mk('line', { x1: String(x0), y1: String(y0), x2: String(x0 + cW), y2: String(y0), stroke: '#666', 'stroke-width': '1.5' }))

    // ── Datenlinie ───────────────────────────────────────────────────────
    const coords = points.map((p, i) => ({ x: toX(xSteps[i]), y: toY(p.value) }))
    svg.appendChild(mk('polyline', { points: coords.map((c) => `${c.x},${c.y}`).join(' '), class: 'sparkline-line' }))

    // ── X-Ticks, Datenpunkte, Beschriftung ───────────────────────────────
    coords.forEach((c, i) => {
      svg.appendChild(mk('line', { x1: String(c.x), y1: String(y0), x2: String(c.x), y2: String(y0 + 5), stroke: '#666', 'stroke-width': '1.5' }))
      svg.appendChild(mk('circle', { cx: String(c.x), cy: String(c.y), r: '4', class: 'sparkline-dot' }))
      svg.appendChild(mkText(c.x, y0 + 18, xLabels[i], 'middle'))
    })

    // ── Aktueller Wert: hervorgehobener Marker ───────────────────────────
    const mx = toX(Math.max(currentRequestsPerDay, xSteps[0]))
    const my = toY(Math.max(currentValue, 1e-10))
    svg.appendChild(mk('circle', { cx: String(mx), cy: String(my), r: '8', class: 'sparkline-dot-current' }))

    container.replaceChildren(svg)
    chartRef.current = { destroy: () => container.replaceChildren() }
    return () => { chartRef.current?.destroy() }
  }, [points, currentValue, currentRequestsPerDay])

  return <div ref={containerRef} className="sparkline-card" />
}

// Gleiches Muster wie ImpactSparkline: manuell gebautes SVG statt Chart-Library,
// useRef + destroy() vor Neuaufbau, Cleanup beim Unmount — keine Chart-Leaks.
function FleetHistoryChart({ points }: { points: FleetHistoryPoint[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<{ destroy: () => void } | null>(null)

  useEffect(() => {
    if (chartRef.current) chartRef.current.destroy()
    const container = containerRef.current
    if (!container || points.length === 0) return

    const W = 400, H = 210
    const PL = 54, PR = 16, PT = 14, PB = 30
    const cW = W - PL - PR
    const cH = H - PT - PB
    const x0 = PL
    const y0 = PT + cH

    const values = points.map((p) => p.co2Gram)
    const maxVal = Math.max(...values, 1e-6)
    const minVal = Math.min(...values, 0)
    const yMax = maxVal * 1.1
    const yMin = Math.max(0, minVal * 0.9)
    const yRange = Math.max(yMax - yMin, 1e-6)

    const toX = (i: number) => x0 + (i / Math.max(points.length - 1, 1)) * cW
    const toY = (v: number) => y0 - ((v - yMin) / yRange) * cH

    const ns = 'http://www.w3.org/2000/svg'
    const mk = (tag: string, attrs: Record<string, string>) => {
      const e = document.createElementNS(ns, tag)
      for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
      return e
    }
    const mkText = (x: number, y: number, content: string, anchor: string) => {
      const t = mk('text', { x: String(x), y: String(y), 'text-anchor': anchor, class: 'sparkline-label' })
      t.textContent = content
      return t
    }

    const svg = mk('svg', { viewBox: `0 0 ${W} ${H}`, class: 'sparkline-svg', role: 'img', 'aria-label': 'CO₂-Verlauf der letzten 30 Tage' })

    const defs = document.createElementNS(ns, 'defs')
    const grad = mk('linearGradient', { id: 'sparklineGradient', x1: '0%', y1: '0%', x2: '100%', y2: '0%' })
    const s1 = mk('stop', { offset: '0%', 'stop-color': '#0f766e' })
    const s2 = mk('stop', { offset: '100%', 'stop-color': '#f59e0b' })
    grad.append(s1, s2)
    defs.appendChild(grad)
    svg.appendChild(defs)

    // ── Y-Achse: Hilfsgitter + Beschriftung ──────────────────────────────
    for (let i = 0; i <= 4; i++) {
      const val = yMin + (i / 4) * yRange
      const y = y0 - (i / 4) * cH
      svg.appendChild(mk('line', { x1: String(x0), y1: String(y), x2: String(x0 + cW), y2: String(y), stroke: '#e2e8f0', 'stroke-width': '1' }))
      svg.appendChild(mkText(x0 - 6, y + 4, formatCo2(val), 'end'))
    }

    svg.appendChild(mk('line', { x1: String(x0), y1: String(PT), x2: String(x0), y2: String(y0), stroke: '#666', 'stroke-width': '1.5' }))
    svg.appendChild(mk('line', { x1: String(x0), y1: String(y0), x2: String(x0 + cW), y2: String(y0), stroke: '#666', 'stroke-width': '1.5' }))

    // ── Datenlinie ───────────────────────────────────────────────────────
    const coords = points.map((p, i) => ({ x: toX(i), y: toY(p.co2Gram) }))
    svg.appendChild(mk('polyline', { points: coords.map((c) => `${c.x},${c.y}`).join(' '), class: 'sparkline-line' }))

    // ── X-Ticks (jeden 5. Tag + letzter Tag), Datenpunkte ────────────────
    coords.forEach((c, i) => {
      svg.appendChild(mk('circle', { cx: String(c.x), cy: String(c.y), r: '2.5', class: 'sparkline-dot' }))
      if (i % 5 === 0 || i === coords.length - 1) {
        svg.appendChild(mk('line', { x1: String(c.x), y1: String(y0), x2: String(c.x), y2: String(y0 + 5), stroke: '#666', 'stroke-width': '1.5' }))
        svg.appendChild(mkText(c.x, y0 + 18, points[i].dateKey.slice(5), 'middle'))
      }
    })

    // ── Letzter Wert: hervorgehobener Marker ─────────────────────────────
    const last = coords[coords.length - 1]
    svg.appendChild(mk('circle', { cx: String(last.x), cy: String(last.y), r: '6', class: 'sparkline-dot-current' }))

    container.replaceChildren(svg)
    chartRef.current = { destroy: () => container.replaceChildren() }
    return () => { chartRef.current?.destroy() }
  }, [points])

  return <div ref={containerRef} className="sparkline-card" />
}

function ScoreCard({ result, title }: { result: ScoreResult; title?: string }) {
  const grades: Array<{ letter: ScoreResult['letter']; label: string }> = [
    { letter: 'A', label: 'sehr angemessen' },
    { letter: 'B', label: 'angemessen' },
    { letter: 'C', label: 'mittel' },
    { letter: 'D', label: 'schwach' },
    { letter: 'E', label: 'unangemessen' },
  ]

  const activeIndex = grades.findIndex((grade) => grade.letter === result.letter)

  return (
    <div className={`score-card grade-${result.letter.toLowerCase()}`}>
      {title ? <p className="card-title">{title}</p> : null}
      <div className="score-scale" aria-label={`Nutri-Score ${result.letter}`}>
        {grades.map((grade, index) => {
          const isActive = index === activeIndex
          return (
            <div
              key={grade.letter}
              className={`score-segment ${isActive ? 'active' : ''} grade-${grade.letter.toLowerCase()}`}
              title={grade.label}
            >
              <span className="segment-letter">{grade.letter}</span>
            </div>
          )
        })}
      </div>
      <div className="score-badge">{result.letter}</div>
      <p className="score-caption">
        Angemessenheits-Score
        <span className="info-tooltip" tabIndex={0}>ⓘ<span className="tooltip-text">Nicht ob KI effizient war, sondern ob ihr Einsatz zur Aufgabe passte.</span></span>
      </p>
      <p className="score-text">{sanitizeCo2Text(result.explanation)}</p>
    </div>
  )
}

export default App
