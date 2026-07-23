import { describe, expect, it } from 'vitest'
import { berechneAiAct } from './aiact'
import type { UseCase } from './types'

function baseUseCase(overrides: Partial<UseCase> = {}): UseCase {
  return {
    id: 'test',
    name: 'Test',
    beschreibung: '',
    datenklasse: 'oeffentlich',
    untrustedInput: false,
    externeKommunikation: false,
    tools: ['keine'],
    autonomie: 'mit_freigabe',
    deployment: 'self_hosted',
    betroffene: 1,
    domaene: 'sonstiges',
    generiertOeffentlicheInhalte: false,
    biometrisch: false,
    emotionserkennung: false,
    kontrollen: [],
    ...overrides,
  }
}

describe('Stufe 2 — Hochrisiko im Beschäftigungskontext (Art. 6 Abs. 2 i.V.m. Anhang III Nr. 4)', () => {
  it('HR + autonome Verwendung → hochrisiko', () => {
    const uc = baseUseCase({ domaene: 'hr', autonomie: 'autonom' })
    expect(berechneAiAct(uc).primaerklasse).toBe('hochrisiko')
  })

  it('HR + rein vorschlagende Funktion → grenzfall (Art. 6 Abs. 3 Ausnahme)', () => {
    const uc = baseUseCase({ domaene: 'hr', autonomie: 'vorschlag' })
    const ergebnis = berechneAiAct(uc)
    expect(ergebnis.primaerklasse).toBe('grenzfall')
    expect(ergebnis.begruendungen.some((b) => b.artikel === 'Art. 6 Abs. 3')).toBe(true)
  })
})

describe('Stufe 1 — verbotene Praktiken (Art. 5)', () => {
  it('Emotionserkennung + HR → verboten', () => {
    const uc = baseUseCase({ domaene: 'hr', emotionserkennung: true })
    const ergebnis = berechneAiAct(uc)
    expect(ergebnis.primaerklasse).toBe('verboten')
    expect(ergebnis.zusatzklassen).toHaveLength(0)
  })
})

describe('Stufe 3 — Transparenzpflichten (Art. 50)', () => {
  it('Redaktion + generiert öffentliche Inhalte → transparenzpflicht', () => {
    const uc = baseUseCase({ domaene: 'redaktion', generiertOeffentlicheInhalte: true })
    expect(berechneAiAct(uc).primaerklasse).toBe('transparenzpflicht')
  })

  it('Support ohne weitere Merkmale → transparenzpflicht (Art. 50 Abs. 1)', () => {
    const uc = baseUseCase({ domaene: 'support' })
    const ergebnis = berechneAiAct(uc)
    expect(ergebnis.primaerklasse).toBe('transparenzpflicht')
    expect(ergebnis.begruendungen.some((b) => b.artikel === 'Art. 50 Abs. 1')).toBe(true)
  })
})

describe('Mehrfachzuordnung', () => {
  it('HR + generiert öffentliche Inhalte → hochrisiko primär, transparenzpflicht als Zusatzklasse, mit Pflichten aus beiden Klassen', () => {
    const uc = baseUseCase({ domaene: 'hr', autonomie: 'mit_freigabe', generiertOeffentlicheInhalte: true })
    const ergebnis = berechneAiAct(uc)

    expect(ergebnis.primaerklasse).toBe('hochrisiko')
    expect(ergebnis.zusatzklassen).toContain('transparenzpflicht')

    const ausgeloestDurch = new Set(ergebnis.pflichten.map((p) => p.ausgeloest_durch))
    expect(ausgeloestDurch.has('hochrisiko')).toBe(true)
    expect(ausgeloestDurch.has('transparenzpflicht')).toBe(true)
  })
})

describe('Stufe 4 — minimal', () => {
  it('Harmloser interner Use-Case → minimal, aber Art. 4 in der Pflichtenliste', () => {
    const uc = baseUseCase({ domaene: 'verwaltung' })
    const ergebnis = berechneAiAct(uc)
    expect(ergebnis.primaerklasse).toBe('minimal')
    expect(ergebnis.pflichten.some((p) => p.id === 'ki-kompetenz' && p.artikel === 'Art. 4')).toBe(true)
  })
})

describe('Erfüllungsgrad', () => {
  it("bei Klasse 'verboten' wird kein Erfüllungsgrad ausgegeben", () => {
    const uc = baseUseCase({ domaene: 'hr', emotionserkennung: true })
    const ergebnis = berechneAiAct(uc)
    expect(ergebnis.erfuellungsgrad).toBeNull()
    expect(ergebnis.pflichten).toHaveLength(0)
  })

  it('rechnet nur über Pflichten der aktuellen Rolle', () => {
    // Art. 50 Abs. 1 (ki-interaktion-offenlegung) gilt nur für den Anbieter und
    // taucht deshalb in der Betreiber-Pflichtenliste gar nicht erst auf.
    const uc = baseUseCase({ domaene: 'support', kontrollen: ['ki-interaktion-offenlegung'] })

    const betreiber = berechneAiAct(uc, 'betreiber')
    const anbieter = berechneAiAct(uc, 'anbieter')

    expect(betreiber.pflichten.some((p) => p.id === 'ki-interaktion-offenlegung')).toBe(false)
    expect(anbieter.pflichten.some((p) => p.id === 'ki-interaktion-offenlegung')).toBe(true)
    expect(betreiber.erfuellungsgrad).toBe(0)
    expect(anbieter.erfuellungsgrad).toBe(0.5)
  })
})
