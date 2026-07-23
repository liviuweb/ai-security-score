import { describe, expect, it } from 'vitest'
import {
  berechneExposure,
  berechneToolRisiko,
  bestimmeExposureStufe,
  pruefeTrifecta,
  STUFE_SCHWELLE_B,
  STUFE_SCHWELLE_C,
  STUFE_SCHWELLE_D,
  STUFE_SCHWELLE_E,
} from './exposure'
import type { UseCase } from './types'

// Maximal harmlose Basis — jedes Feld auf dem jeweils niedrigsten Risikowert,
// damit Tests gezielt nur die Bedingung(en) verändern können, die sie prüfen.
function baseUseCase(overrides: Partial<UseCase> = {}): UseCase {
  return {
    id: 'test',
    name: 'Test',
    beschreibung: '',
    datenklasse: 'oeffentlich',
    untrustedInput: false,
    externeKommunikation: false,
    tools: ['keine'],
    autonomie: 'vorschlag',
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

describe('pruefeTrifecta', () => {
  it('greift, wenn alle drei Bedingungen erfüllt sind — auch bei sonst harmlosem Use-Case', () => {
    const uc = baseUseCase({ datenklasse: 'intern', untrustedInput: true, externeKommunikation: true })
    const trifecta = pruefeTrifecta(uc)
    expect(trifecta.privateDaten).toBe(true)
    expect(trifecta.untrusted).toBe(true)
    expect(trifecta.exfiltration).toBe(true)
    expect(trifecta.erfuellt).toBe(true)
  })

  it('greift NICHT, wenn nur zwei von drei Bedingungen erfüllt sind', () => {
    // privateDaten fehlt: datenklasse ist öffentlich
    const uc = baseUseCase({ datenklasse: 'oeffentlich', untrustedInput: true, externeKommunikation: true })
    expect(pruefeTrifecta(uc).erfuellt).toBe(false)
  })

  it('greift nicht, wenn untrustedInput false ist', () => {
    const uc = baseUseCase({ datenklasse: 'intern', untrustedInput: false, externeKommunikation: true })
    expect(pruefeTrifecta(uc).erfuellt).toBe(false)
  })

  it('greift nicht, wenn weder externeKommunikation noch ein exfiltrationsfähiges Tool vorhanden ist', () => {
    const uc = baseUseCase({ datenklasse: 'intern', untrustedInput: true, externeKommunikation: false, tools: ['dateizugriff'] })
    expect(pruefeTrifecta(uc).erfuellt).toBe(false)
  })

  it('websuche allein löst die Exfiltrations-Bedingung aus', () => {
    const uc = baseUseCase({ tools: ['websuche'], externeKommunikation: false })
    expect(pruefeTrifecta(uc).exfiltration).toBe(true)
  })
})

describe('berechneToolRisiko', () => {
  it("ergibt 0, wenn nur 'keine' als Tool gewählt ist", () => {
    expect(berechneToolRisiko(['keine'])).toBe(0)
  })

  it('mehrere Tools oberhalb der Sättigung ergeben exakt 1.0', () => {
    expect(berechneToolRisiko(['code_ausfuehren', 'datenbank_schreiben', 'email_senden'])).toBe(1)
  })

  it('ein einzelnes Tool unterhalb der Sättigung ergibt den erwarteten Bruchteil', () => {
    expect(berechneToolRisiko(['websuche'])).toBeCloseTo(0.14, 10)
  })
})

describe('Verschärfungen', () => {
  it('werden addiert, der Gesamtwert bleibt aber bei maximal 1.0 gedeckelt', () => {
    const uc = baseUseCase({
      datenklasse: 'besondere_kategorien',
      untrustedInput: true,
      externeKommunikation: false,
      tools: ['code_ausfuehren'],
      autonomie: 'autonom',
      deployment: 'consumer',
      betroffene: 2_000_000,
    })

    const ergebnis = berechneExposure(uc)

    expect(ergebnis.trifecta.erfuellt).toBe(false)
    expect(ergebnis.verschaerfungen.map((v) => v.id)).toEqual(
      expect.arrayContaining(['autonom-untrusted', 'besondere-consumer']),
    )
    expect(ergebnis.verschaerfungen).toHaveLength(2)
    expect(ergebnis.risikoWert).toBeLessThanOrEqual(1)
    expect(ergebnis.risikoWert).toBe(1)
  })
})

describe('bestimmeExposureStufe — Grenzwerte', () => {
  it('liegt exakt an der unteren Grenze jeder Stufe', () => {
    expect(bestimmeExposureStufe(0.199)).toBe('A')
    expect(bestimmeExposureStufe(STUFE_SCHWELLE_B)).toBe('B')
    expect(bestimmeExposureStufe(0.399)).toBe('B')
    expect(bestimmeExposureStufe(STUFE_SCHWELLE_C)).toBe('C')
    expect(bestimmeExposureStufe(0.599)).toBe('C')
    expect(bestimmeExposureStufe(STUFE_SCHWELLE_D)).toBe('D')
    expect(bestimmeExposureStufe(0.799)).toBe('D')
    expect(bestimmeExposureStufe(STUFE_SCHWELLE_E)).toBe('E')
  })
})

describe('berechneExposure — Trifecta überschreibt die Stufe', () => {
  it('setzt die Stufe auf KRITISCH und die Ampel auf rot, unabhängig vom Risikowert', () => {
    const uc = baseUseCase({ datenklasse: 'intern', untrustedInput: true, externeKommunikation: true })
    const ergebnis = berechneExposure(uc)
    expect(ergebnis.stufe).toBe('KRITISCH')
    expect(ergebnis.ampel).toBe('rot')
  })

  it('verlangt als erste Maßnahme das Entfernen einer Trifecta-Bedingung, nicht einen Filter', () => {
    const uc = baseUseCase({ datenklasse: 'intern', untrustedInput: true, externeKommunikation: true })
    const ergebnis = berechneExposure(uc)
    expect(ergebnis.massnahmen[0].id).toBe('trifecta-entschaerfen')
    expect(ergebnis.massnahmen[0].wirksamkeit).toBe('hoch')
    expect(ergebnis.massnahmen[0].normal.toLowerCase()).not.toContain('filter einbauen')
  })
})

describe('OWASP-Mapping', () => {
  it('erfindet keine Treffer, die die Eingabedaten nicht hergeben', () => {
    const uc = baseUseCase()
    const ergebnis = berechneExposure(uc)
    expect(ergebnis.owasp).toHaveLength(0)
  })

  it('LLM10 greift erst oberhalb von 100.000 Betroffenen', () => {
    const unterhalb = berechneExposure(baseUseCase({ betroffene: 100_000 }))
    const oberhalb = berechneExposure(baseUseCase({ betroffene: 100_001 }))
    expect(unterhalb.owasp.some((t) => t.id === 'LLM10')).toBe(false)
    expect(oberhalb.owasp.some((t) => t.id === 'LLM10')).toBe(true)
  })
})
