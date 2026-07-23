import { useMemo, useState } from 'react'
import { feldTexte, sektionsTexte } from '../content'
import type { UseCase } from '../types'
import type { ViewMode } from '../ViewModeContext'

type TabKey = 'start' | 'usecase' | 'exposure' | 'compliance' | 'bibliothek' | 'methodik'

interface UseCaseTabProps {
  useCase: UseCase
  onChange: (value: UseCase) => void
  onNavigate?: (tab: TabKey) => void
  mode: ViewMode
}

const FELD_SICHTBAR: Record<string, ViewMode[]> = {
  name: ['normal', 'specialist'],
  beschreibung: ['normal', 'specialist'],
  domaene: ['normal', 'specialist'],
  datenklasse: ['normal', 'specialist'],
  betroffene: ['normal', 'specialist'],
  untrustedInput: ['normal', 'specialist'],
  externeKommunikation: ['normal', 'specialist'],
  tools: ['normal', 'specialist'],
  autonomie: ['normal', 'specialist'],
  deployment: ['normal', 'specialist'],
  generiertOeffentlicheInhalte: ['normal', 'specialist'],
  biometrisch: ['specialist'],
  emotionserkennung: ['specialist'],
}

const SECTION_ORDER = ['grunddaten', 'daten', 'agent', 'deployment'] as const
const BETROFFENE_PRESETS = [10, 100, 1000, 100000, 1000000]
const TOOL_OPTIONS: Array<{ value: UseCase['tools'][number]; label: string }> = [
  { value: 'websuche', label: 'Im Internet suchen' },
  { value: 'dateizugriff', label: 'Auf Dateien zugreifen' },
  { value: 'email_senden', label: 'E-Mails verschicken' },
  { value: 'code_ausfuehren', label: 'Code ausführen' },
  { value: 'datenbank_lesen', label: 'Datenbank lesen' },
  { value: 'datenbank_schreiben', label: 'Datenbank schreiben' },
  { value: 'api_extern', label: 'Externe Dienste aufrufen' },
  { value: 'keine', label: 'Keine Werkzeuge' },
]

function getFieldVisible(field: string, mode: ViewMode) {
  return FELD_SICHTBAR[field]?.includes(mode) ?? true
}

function getFieldLabel(field: string, mode: ViewMode) {
  return feldTexte[field as keyof typeof feldTexte]?.label?.[mode] ?? field
}

function getFieldHelp(field: string, mode: ViewMode) {
  const help = feldTexte[field as keyof typeof feldTexte]?.hilfe?.[mode]
  return help ?? null
}

export function UseCaseTab({ useCase, onChange, onNavigate, mode }: UseCaseTabProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    daten: mode === 'specialist',
    agent: mode === 'specialist',
    deployment: mode === 'specialist',
  })

  const visibleSections = useMemo(() => {
    return SECTION_ORDER.filter((section) => {
      if (section === 'grunddaten') return true
      if (section === 'daten') return getFieldVisible('datenklasse', mode) || getFieldVisible('betroffene', mode)
      if (section === 'agent') return getFieldVisible('untrustedInput', mode) || getFieldVisible('tools', mode)
      return true
    })
  }, [mode])

  const toggleSection = (section: string) => {
    setExpandedSections((current) => ({ ...current, [section]: !current[section] }))
  }

  const updateField = <K extends keyof UseCase>(field: K, value: UseCase[K]) => {
    onChange({ ...useCase, [field]: value })
  }

  const toggleTool = (value: UseCase['tools'][number]) => {
    const currentTools = useCase.tools
    if (value === 'keine') {
      updateField('tools', ['keine'])
      return
    }

    const nextTools = currentTools.includes(value)
      ? currentTools.filter((tool) => tool !== value)
      : [...currentTools.filter((tool) => tool !== 'keine'), value]

    updateField('tools', nextTools.length > 0 ? nextTools : ['keine'])
  }

  const renderSection = (section: string) => {
    const isExpanded = expandedSections[section] ?? false
    const canShowExtra = section === 'daten' || section === 'deployment'

    return (
      <section key={section} className="panel">
        <div className="panel-heading">
          <h2>{section === 'grunddaten' ? 'Grunddaten' : section === 'daten' ? 'Daten' : section === 'agent' ? 'Agent & Tools' : 'Deployment & Sonderfälle'}</h2>
          {mode === 'normal' && canShowExtra && (
            <button type="button" className="inline-link" onClick={() => toggleSection(section)}>
              {isExpanded ? 'Weniger anzeigen' : 'Erweiterte Angaben'}
            </button>
          )}
        </div>

        {section === 'grunddaten' && (
          <div className="form-grid">
            <label className="field-card">
              <span>{getFieldLabel('name', mode)}</span>
              <input value={useCase.name} onChange={(event) => updateField('name', event.target.value)} />
              {mode === 'normal' && <small>{getFieldHelp('name', mode)}</small>}
            </label>

            <label className="field-card">
              <span>{getFieldLabel('beschreibung', mode)}</span>
              <textarea rows={4} value={useCase.beschreibung} onChange={(event) => updateField('beschreibung', event.target.value)} />
              {mode === 'normal' && <small>{getFieldHelp('beschreibung', mode)}</small>}
            </label>

            <label className="field-card">
              <span>{getFieldLabel('domaene', mode)}</span>
              <select value={useCase.domaene} onChange={(event) => updateField('domaene', event.target.value as UseCase['domaene'])}>
                {Object.entries(feldTexte.domaene.optionen).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label[mode]}
                  </option>
                ))}
              </select>
              {mode === 'normal' && <small>{getFieldHelp('domaene', mode)}</small>}
            </label>
          </div>
        )}

        {section === 'daten' && (
          <div className="form-grid">
            <label className="field-card">
              <span>{getFieldLabel('datenklasse', mode)}</span>
              {mode === 'normal' ? (
                <div className="choice-list">
                  {Object.entries(feldTexte.datenklasse.optionen).map(([value, label]) => (
                    <label key={value} className="choice-option">
                      <input
                        type="radio"
                        name="datenklasse"
                        value={value}
                        checked={useCase.datenklasse === value}
                        onChange={() => updateField('datenklasse', value as UseCase['datenklasse'])}
                      />
                      <span>{label.normal}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <select value={useCase.datenklasse} onChange={(event) => updateField('datenklasse', event.target.value as UseCase['datenklasse'])}>
                  {Object.entries(feldTexte.datenklasse.optionen).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label.specialist}
                    </option>
                  ))}
                </select>
              )}
              {mode === 'normal' && <small>{getFieldHelp('datenklasse', mode)}</small>}
            </label>

            <label className="field-card">
              <span>{getFieldLabel('betroffene', mode)}</span>
              <div className="preset-row">
                {BETROFFENE_PRESETS.map((preset) => (
                  <button key={preset} type="button" className={`preset-chip ${useCase.betroffene === preset ? 'active' : ''}`} onClick={() => updateField('betroffene', preset)}>
                    {preset >= 1000000 ? '1 Mio.' : preset.toLocaleString('de-DE')}
                  </button>
                ))}
              </div>
              <input type="number" min="1" value={useCase.betroffene} onChange={(event) => updateField('betroffene', Number(event.target.value))} />
              {mode === 'normal' && <small>{getFieldHelp('betroffene', mode)}</small>}
            </label>

            {mode === 'specialist' && (
              <div className="field-card">
                <span>{getFieldLabel('biometrisch', mode)}</span>
                <label className="choice-option">
                  <input type="checkbox" checked={useCase.biometrisch} onChange={() => updateField('biometrisch', !useCase.biometrisch)} />
                  <span>{getFieldLabel('biometrisch', mode)}</span>
                </label>
              </div>
            )}

            {mode === 'normal' && isExpanded && (
              <div className="field-card expanded-card">
                <span>{getFieldLabel('biometrisch', mode)}</span>
                <label className="choice-option">
                  <input type="checkbox" checked={useCase.biometrisch} onChange={() => updateField('biometrisch', !useCase.biometrisch)} />
                  <span>{getFieldLabel('biometrisch', mode)}</span>
                </label>
                <small>{getFieldHelp('biometrisch', mode)}</small>
              </div>
            )}
          </div>
        )}

        {section === 'agent' && (
          <div className="form-grid">
            <label className="field-card">
              <span>{getFieldLabel('untrustedInput', mode)}</span>
              <div className="choice-list">
                <label className="choice-option">
                  <input type="radio" name="untrustedInput" checked={useCase.untrustedInput} onChange={() => updateField('untrustedInput', true)} />
                  <span>Ja</span>
                </label>
                <label className="choice-option">
                  <input type="radio" name="untrustedInput" checked={!useCase.untrustedInput} onChange={() => updateField('untrustedInput', false)} />
                  <span>Nein</span>
                </label>
              </div>
              {mode === 'normal' && <small>{getFieldHelp('untrustedInput', mode)}</small>}
            </label>

            <label className="field-card">
              <span>{getFieldLabel('externeKommunikation', mode)}</span>
              <div className="choice-list">
                <label className="choice-option">
                  <input type="radio" name="externeKommunikation" checked={useCase.externeKommunikation} onChange={() => updateField('externeKommunikation', true)} />
                  <span>Ja</span>
                </label>
                <label className="choice-option">
                  <input type="radio" name="externeKommunikation" checked={!useCase.externeKommunikation} onChange={() => updateField('externeKommunikation', false)} />
                  <span>Nein</span>
                </label>
              </div>
              {mode === 'normal' && <small>{getFieldHelp('externeKommunikation', mode)}</small>}
            </label>

            <label className="field-card">
              <span>{getFieldLabel('tools', mode)}</span>
              <div className="choice-list">
                {TOOL_OPTIONS.map((tool) => (
                  <label key={tool.value} className="choice-option">
                    <input
                      type="checkbox"
                      checked={useCase.tools.includes(tool.value)}
                      disabled={tool.value === 'keine' ? false : useCase.tools.includes('keine')}
                      onChange={() => toggleTool(tool.value)}
                    />
                    <span>{tool.label}</span>
                  </label>
                ))}
              </div>
              {mode === 'normal' && <small>{getFieldHelp('tools', mode)}</small>}
            </label>

            <label className="field-card">
              <span>{getFieldLabel('autonomie', mode)}</span>
              <div className="choice-list">
                {Object.entries(feldTexte.autonomie.optionen).map(([value, label]) => (
                  <label key={value} className="choice-option">
                    <input
                      type="radio"
                      name="autonomie"
                      value={value}
                      checked={useCase.autonomie === value}
                      onChange={() => updateField('autonomie', value as UseCase['autonomie'])}
                    />
                    <span>{label[mode]}</span>
                  </label>
                ))}
              </div>
              {mode === 'normal' && <small>{getFieldHelp('autonomie', mode)}</small>}
            </label>
          </div>
        )}

        {section === 'deployment' && (
          <div className="form-grid">
            <label className="field-card">
              <span>{getFieldLabel('deployment', mode)}</span>
              <div className="choice-list">
                {Object.entries(feldTexte.deployment.optionen).map(([value, label]) => (
                  <label key={value} className="choice-option">
                    <input
                      type="radio"
                      name="deployment"
                      value={value}
                      checked={useCase.deployment === value}
                      onChange={() => updateField('deployment', value as UseCase['deployment'])}
                    />
                    <span>{label[mode]}</span>
                  </label>
                ))}
              </div>
              {mode === 'normal' && <small>{getFieldHelp('deployment', mode)}</small>}
            </label>

            <label className="field-card">
              <span>{getFieldLabel('generiertOeffentlicheInhalte', mode)}</span>
              <div className="choice-list">
                <label className="choice-option">
                  <input type="radio" name="generiertOeffentlicheInhalte" checked={useCase.generiertOeffentlicheInhalte} onChange={() => updateField('generiertOeffentlicheInhalte', true)} />
                  <span>Ja</span>
                </label>
                <label className="choice-option">
                  <input type="radio" name="generiertOeffentlicheInhalte" checked={!useCase.generiertOeffentlicheInhalte} onChange={() => updateField('generiertOeffentlicheInhalte', false)} />
                  <span>Nein</span>
                </label>
              </div>
              {mode === 'normal' && <small>{getFieldHelp('generiertOeffentlicheInhalte', mode)}</small>}
            </label>

            {mode === 'specialist' && (
              <div className="field-card">
                <span>{getFieldLabel('biometrisch', mode)}</span>
                <label className="choice-option">
                  <input type="checkbox" checked={useCase.biometrisch} onChange={() => updateField('biometrisch', !useCase.biometrisch)} />
                  <span>{getFieldLabel('biometrisch', mode)}</span>
                </label>
              </div>
            )}

            {mode === 'specialist' && (
              <div className="field-card">
                <span>{getFieldLabel('emotionserkennung', mode)}</span>
                <label className="choice-option">
                  <input type="checkbox" checked={useCase.emotionserkennung} onChange={() => updateField('emotionserkennung', !useCase.emotionserkennung)} />
                  <span>{getFieldLabel('emotionserkennung', mode)}</span>
                </label>
              </div>
            )}

            {mode === 'normal' && isExpanded && (
              <div className="field-card expanded-card">
                <span>{getFieldLabel('biometrisch', mode)}</span>
                <label className="choice-option">
                  <input type="checkbox" checked={useCase.biometrisch} onChange={() => updateField('biometrisch', !useCase.biometrisch)} />
                  <span>{getFieldLabel('biometrisch', mode)}</span>
                </label>
                <small>{getFieldHelp('biometrisch', mode)}</small>
              </div>
            )}
            {mode === 'normal' && isExpanded && (
              <div className="field-card expanded-card">
                <span>{getFieldLabel('emotionserkennung', mode)}</span>
                <label className="choice-option">
                  <input type="checkbox" checked={useCase.emotionserkennung} onChange={() => updateField('emotionserkennung', !useCase.emotionserkennung)} />
                  <span>{getFieldLabel('emotionserkennung', mode)}</span>
                </label>
                <small>{getFieldHelp('emotionserkennung', mode)}</small>
              </div>
            )}
          </div>
        )}

        {mode === 'normal' && sektionsTexte.sonderfaelle.normal && (
          <p className="helper-note">{sektionsTexte.sonderfaelle.normal}</p>
        )}
      </section>
    )
  }

  return (
    <div className="form-shell">
      <section className="panel">
        <div className="panel-heading">
          <h2>Use-Case erfassen</h2>
          <p>Die Eingaben werden direkt für Exposure und Compliance verwendet.</p>
        </div>
      </section>

      {visibleSections.map((section) => renderSection(section))}

      <section className="panel">
        <div className="action-row">
          <button type="button" className="demo-card demo-card-good" onClick={() => onNavigate?.('exposure')}>
            Zu Exposure
          </button>
          <button type="button" className="demo-card demo-card-bad" onClick={() => onNavigate?.('compliance')}>
            Zu Compliance
          </button>
        </div>
      </section>
    </div>
  )
}
