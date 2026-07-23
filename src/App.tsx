import { useState } from 'react'
import './App.css'
import { PrivacyNotice } from './PrivacyNotice'
import { FeedbackWidget } from './FeedbackWidget'
import { useViewMode, type ViewMode } from './ViewModeContext'
import { createLeeresUseCase, type UseCase } from './types'
import { StartTab } from './tabs/StartTab'
import { UseCaseTab } from './tabs/UseCaseTab'
import { ExposureTab } from './tabs/ExposureTab'
import { ComplianceTab } from './tabs/ComplianceTab'
import { BibliothekTab } from './tabs/BibliothekTab'
import { MethodikTab } from './tabs/MethodikTab'

type TabKey = 'start' | 'usecase' | 'exposure' | 'compliance' | 'bibliothek' | 'methodik'

const TAB_META: Record<ViewMode, Record<TabKey, { label: string; icon: string }>> = {
  normal: {
    start: { label: 'Start', icon: '◉' },
    usecase: { label: 'Use-Case', icon: '▣' },
    exposure: { label: 'Risiko', icon: '⚠' },
    compliance: { label: 'Pflichten', icon: '✓' },
    bibliothek: { label: 'Bibliothek', icon: '▤' },
    methodik: { label: 'Methodik', icon: '⚙' },
  },
  specialist: {
    start: { label: 'Start', icon: '◉' },
    usecase: { label: 'Use-Case', icon: '▣' },
    exposure: { label: 'Exposure', icon: '⚠' },
    compliance: { label: 'Compliance', icon: '✓' },
    bibliothek: { label: 'Bibliothek', icon: '▤' },
    methodik: { label: 'Methodik', icon: '⚙' },
  },
}

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('start')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [useCase, setUseCase] = useState<UseCase>(createLeeresUseCase())
  const { mode, setMode } = useViewMode()

  const tabs = (Object.keys(TAB_META[mode]) as TabKey[]).map((id) => ({
    id,
    icon: TAB_META[mode][id].icon,
    label: TAB_META[mode][id].label,
  }))

  const activeLabel = TAB_META[mode][activeTab].label

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? 'mobile-nav-open' : ''}`}>
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <div className="brand-mark">AI</div>
            <div>
              <p className="brand-title">AI</p>
              <p className="brand-subtitle">Security &amp; Compliance</p>
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
          <nav className={`sidebar-nav ${mobileNavOpen ? 'open' : ''}`} id="mobile-sidebar-nav" aria-label="AI-Security-Score Tabs">
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

          <div className="viewmode-toggle" role="group" aria-label="Ansichtsmodus">
            <button
              type="button"
              className={`viewmode-btn ${mode === 'normal' ? 'active' : ''}`}
              onClick={() => setMode('normal')}
            >
              Normal
            </button>
            <button
              type="button"
              className={`viewmode-btn ${mode === 'specialist' ? 'active' : ''}`}
              onClick={() => setMode('specialist')}
            >
              Specialist
            </button>
          </div>

          <PrivacyNotice />
          <p className="sidebar-credits">Security &amp; Compliance by design</p>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">AI-SECURITY-SCORE</p>
            <h1>{activeLabel}</h1>
          </div>
          <div className="topbar-badge">EU-AI-Act &amp; Security</div>
        </header>

        <div className="content-scroll">
          {activeTab === 'start' && <StartTab onNavigate={setActiveTab} />}
          {activeTab === 'usecase' && (
            <UseCaseTab useCase={useCase} onChange={setUseCase} onNavigate={setActiveTab} mode={mode} />
          )}
          {activeTab === 'exposure' && <ExposureTab useCase={useCase} />}
          {activeTab === 'compliance' && <ComplianceTab useCase={useCase} onChange={setUseCase} />}
          {activeTab === 'bibliothek' && <BibliothekTab onLoad={setUseCase} onNavigate={setActiveTab} />}
          {activeTab === 'methodik' && <MethodikTab />}
        </div>
      </section>

      <FeedbackWidget />
    </main>
  )
}

export default App
