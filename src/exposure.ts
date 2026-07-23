import type { Autonomie, Datenklasse, Deployment, ToolKategorie, UseCase } from './types'

// ---------------------------------------------------------------------------
// Konstanten — bewusst benannt und exportiert, damit der Methodik-Tab sie
// unverändert aus dieser Datei anzeigen kann statt sie zu duplizieren.
// ---------------------------------------------------------------------------

export const GEWICHT_DATEN = 0.25
export const GEWICHT_TOOLS = 0.25
export const GEWICHT_AUTONOMIE = 0.2
export const GEWICHT_DEPLOYMENT = 0.15
export const GEWICHT_REICHWEITE = 0.15

export const DATEN_RISIKO: Record<Datenklasse, number> = {
  oeffentlich: 0.0,
  intern: 0.35,
  vertraulich: 0.6,
  personenbezogen: 0.8,
  besondere_kategorien: 1.0,
}

export const TOOL_RISIKO: Record<ToolKategorie, number> = {
  keine: 0,
  websuche: 0.35,
  dateizugriff: 0.5,
  datenbank_lesen: 0.5,
  api_extern: 0.7,
  email_senden: 0.8,
  datenbank_schreiben: 0.9,
  code_ausfuehren: 1.0,
}

// Schwelle, ab der weitere Tools das Gesamtbild nicht mehr nennenswert
// verschlechtern — die Summe der Toolwerte wird durch diese Zahl geteilt und
// bei 1.0 gedeckelt.
export const TOOL_SAETTIGUNG = 2.5

export const AUTONOMIE_RISIKO: Record<Autonomie, number> = {
  vorschlag: 0.15,
  mit_freigabe: 0.5,
  autonom: 1.0,
}

export const DEPLOYMENT_RISIKO: Record<Deployment, number> = {
  self_hosted: 0.1,
  saas_eu: 0.3,
  saas_us: 0.65,
  consumer: 1.0,
}

// 10^6 = 1 Mio. Betroffene als Obergrenze der logarithmischen Reichweiten-Skala.
export const REICHWEITE_LOG_OBERGRENZE = 6

export const VERSCHAERFUNG_AUTONOM_UNTRUSTED = 0.15
export const VERSCHAERFUNG_BESONDERE_CONSUMER = 0.1

export const STUFE_SCHWELLE_B = 0.2
export const STUFE_SCHWELLE_C = 0.4
export const STUFE_SCHWELLE_D = 0.6
export const STUFE_SCHWELLE_E = 0.8

// Tools, über die injizierte Anweisungen Daten nach außen tragen können.
// Websuche gehört bewusst dazu: Eine injizierte Anweisung kann Daten in eine
// URL kodieren, die das Websuche-Tool anschließend abruft (z. B. "suche nach
// <ausgeleitete-daten>.angreifer.example") — das Tool selbst muss dafür nicht
// kompromittiert sein, es reicht als Transportweg. Das ist nicht offensichtlich
// und wird deshalb im Specialist-Modus explizit ausgewiesen.
export const EXFILTRATION_TOOLS: ToolKategorie[] = [
  'email_senden',
  'api_extern',
  'datenbank_schreiben',
  'websuche',
]

// ---------------------------------------------------------------------------
// Typen
// ---------------------------------------------------------------------------

export type ExposureStufe = 'A' | 'B' | 'C' | 'D' | 'E' | 'KRITISCH'
export type Ampel = 'gruen' | 'gelb' | 'rot'

export interface ExposureFaktor {
  id: string
  label: string
  wert: number
  gewicht: number
  beitrag: number
}

export interface ExposureVerschaerfung {
  id: string
  label: string
  wert: number
  begruendung: string
}

export interface OwaspTreffer {
  id: string
  titel: string
  begruendung: string
}

export interface Massnahme {
  id: string
  ausloeser: string
  normal: string
  specialist: string
  wirksamkeit: 'hoch' | 'mittel' | 'ergaenzend'
}

export interface ExposureErgebnis {
  stufe: ExposureStufe
  ampel: Ampel
  risikoWert: number
  trifecta: ReturnType<typeof pruefeTrifecta>
  faktoren: ExposureFaktor[]
  verschaerfungen: ExposureVerschaerfung[]
  owasp: OwaspTreffer[]
  massnahmen: Massnahme[]
}

// ---------------------------------------------------------------------------
// Hard-Rule: Lethal Trifecta (Simon Willison, 2025)
//
// Zugriff auf private Daten + Verarbeitung nicht vertrauenswürdiger Inhalte +
// ein Kanal nach außen ermöglichen Exfiltration durch Prompt Injection, ohne
// dass der Nutzer es bemerkt. Prompt Injection ist nach aktuellem Stand nicht
// zuverlässig durch Filter lösbar — deshalb hier eine Hard-Rule statt einer
// Gewichtung: Sind alle drei Bedingungen erfüllt, überschreibt das jede
// graduelle Bewertung.
// ---------------------------------------------------------------------------

export function pruefeTrifecta(uc: UseCase): {
  privateDaten: boolean
  untrusted: boolean
  exfiltration: boolean
  erfuellt: boolean
} {
  const privateDaten = uc.datenklasse !== 'oeffentlich'
  const untrusted = uc.untrustedInput === true
  const exfiltration =
    uc.externeKommunikation === true || uc.tools.some((tool) => EXFILTRATION_TOOLS.includes(tool))

  return {
    privateDaten,
    untrusted,
    exfiltration,
    erfuellt: privateDaten && untrusted && exfiltration,
  }
}

// ---------------------------------------------------------------------------
// Graduelle Skala — greift nur inhaltlich, wenn die Trifecta nicht erfüllt
// ist; risikoWert wird aber immer berechnet, damit der Specialist-Modus auch
// bei KRITISCH einen nachvollziehbaren Wert anzeigen kann.
// ---------------------------------------------------------------------------

export function berechneDatenRisiko(datenklasse: Datenklasse): number {
  return DATEN_RISIKO[datenklasse]
}

export function berechneToolRisiko(tools: ToolKategorie[]): number {
  const summe = tools.reduce((acc, tool) => acc + TOOL_RISIKO[tool], 0)
  return Math.min(summe / TOOL_SAETTIGUNG, 1)
}

export function berechneAutonomieRisiko(autonomie: Autonomie): number {
  return AUTONOMIE_RISIKO[autonomie]
}

export function berechneDeploymentRisiko(deployment: Deployment): number {
  return DEPLOYMENT_RISIKO[deployment]
}

export function berechneReichweite(betroffene: number): number {
  return Math.min(Math.log10(Math.max(betroffene, 1)) / REICHWEITE_LOG_OBERGRENZE, 1)
}

function berechneFaktoren(uc: UseCase): ExposureFaktor[] {
  const datenWert = berechneDatenRisiko(uc.datenklasse)
  const toolWert = berechneToolRisiko(uc.tools)
  const autonomieWert = berechneAutonomieRisiko(uc.autonomie)
  const deploymentWert = berechneDeploymentRisiko(uc.deployment)
  const reichweiteWert = berechneReichweite(uc.betroffene)

  return [
    { id: 'daten', label: 'Datenrisiko', wert: datenWert, gewicht: GEWICHT_DATEN, beitrag: datenWert * GEWICHT_DATEN },
    { id: 'tools', label: 'Tool-Risiko', wert: toolWert, gewicht: GEWICHT_TOOLS, beitrag: toolWert * GEWICHT_TOOLS },
    {
      id: 'autonomie',
      label: 'Autonomie-Risiko',
      wert: autonomieWert,
      gewicht: GEWICHT_AUTONOMIE,
      beitrag: autonomieWert * GEWICHT_AUTONOMIE,
    },
    {
      id: 'deployment',
      label: 'Deployment-Risiko',
      wert: deploymentWert,
      gewicht: GEWICHT_DEPLOYMENT,
      beitrag: deploymentWert * GEWICHT_DEPLOYMENT,
    },
    {
      id: 'reichweite',
      label: 'Reichweite',
      wert: reichweiteWert,
      gewicht: GEWICHT_REICHWEITE,
      beitrag: reichweiteWert * GEWICHT_REICHWEITE,
    },
  ]
}

// ---------------------------------------------------------------------------
// Verschärfungen — Kombinationen, die additiv nicht abgebildet werden, aber
// real gefährlicher sind als die Summe ihrer Teile. Fließen nicht still ein,
// sondern werden einzeln mit Begründung ausgewiesen.
// ---------------------------------------------------------------------------

function berechneVerschaerfungen(uc: UseCase): ExposureVerschaerfung[] {
  const verschaerfungen: ExposureVerschaerfung[] = []

  if (uc.autonomie === 'autonom' && uc.untrustedInput === true) {
    verschaerfungen.push({
      id: 'autonom-untrusted',
      label: 'Autonome Aktionen bei nicht vertrauenswürdigem Input',
      wert: VERSCHAERFUNG_AUTONOM_UNTRUSTED,
      begruendung: 'Injection ohne menschliche Zwischenkontrolle.',
    })
  }

  if (uc.datenklasse === 'besondere_kategorien' && uc.deployment === 'consumer') {
    verschaerfungen.push({
      id: 'besondere-consumer',
      label: 'Besondere Kategorien personenbezogener Daten auf Consumer-Deployment',
      wert: VERSCHAERFUNG_BESONDERE_CONSUMER,
      begruendung: 'Art.-9-Daten ohne AVV.',
    })
  }

  return verschaerfungen
}

// ---------------------------------------------------------------------------
// Stufen- und Ampel-Mapping
// ---------------------------------------------------------------------------

export function bestimmeExposureStufe(risikoWert: number): ExposureStufe {
  if (risikoWert >= STUFE_SCHWELLE_E) return 'E'
  if (risikoWert >= STUFE_SCHWELLE_D) return 'D'
  if (risikoWert >= STUFE_SCHWELLE_C) return 'C'
  if (risikoWert >= STUFE_SCHWELLE_B) return 'B'
  return 'A'
}

export function bestimmeAmpel(stufe: ExposureStufe): Ampel {
  if (stufe === 'A' || stufe === 'B') return 'gruen'
  if (stufe === 'C' || stufe === 'D') return 'gelb'
  return 'rot'
}

// ---------------------------------------------------------------------------
// OWASP Top 10 for LLM Applications (2025) — nur Treffer, die die
// Eingabedaten tatsächlich hergeben, keine erfundenen.
// ---------------------------------------------------------------------------

function pruefeOwasp(uc: UseCase): OwaspTreffer[] {
  const treffer: OwaspTreffer[] = []

  if (uc.untrustedInput === true) {
    treffer.push({
      id: 'LLM01',
      titel: 'Prompt Injection',
      begruendung:
        'Der Use-Case verarbeitet nicht vertrauenswürdige Eingaben — der klassische Angriffsvektor, um die KI mit versteckten Anweisungen zu manipulieren.',
    })
  }

  if (uc.datenklasse !== 'oeffentlich' && (uc.externeKommunikation || uc.deployment === 'consumer')) {
    treffer.push({
      id: 'LLM02',
      titel: 'Sensitive Information Disclosure',
      begruendung:
        'Nicht-öffentliche Daten treffen auf einen Weg nach außen — entweder einen aktiven Exfiltrationskanal oder einen Consumer-Dienst ohne vertragliche Kontrolle.',
    })
  }

  if (uc.tools.includes('code_ausfuehren') || uc.tools.includes('datenbank_schreiben')) {
    treffer.push({
      id: 'LLM05',
      titel: 'Improper Output Handling',
      begruendung:
        'Von der KI erzeugte Ausgaben werden direkt ausgeführt oder in eine Datenbank geschrieben, ohne dass das zwingend geprüft wird.',
    })
  }

  if (uc.autonomie === 'autonom' || (uc.tools.length >= 3 && uc.autonomie !== 'vorschlag')) {
    treffer.push({
      id: 'LLM06',
      titel: 'Excessive Agency',
      begruendung:
        uc.autonomie === 'autonom'
          ? 'Die KI handelt vollständig autonom, ohne dass ein Mensch vor der Aktion eingreift.'
          : 'Drei oder mehr Werkzeuge kombiniert mit mindestens „mit Freigabe" vergrößern den Handlungsspielraum deutlich über eine reine Vorschlagsfunktion hinaus.',
    })
  }

  if (uc.tools.includes('datenbank_lesen') && uc.untrustedInput === true) {
    treffer.push({
      id: 'LLM08',
      titel: 'Vector and Embedding Weaknesses',
      begruendung:
        'Datenbankzugriff und nicht vertrauenswürdige Eingaben treffen zusammen — injizierte Anweisungen könnten die Abfrage beeinflussen oder Ergebnisse mit fremdem Kontext vermischen.',
    })
  }

  if (uc.betroffene > 100_000) {
    treffer.push({
      id: 'LLM10',
      titel: 'Unbounded Consumption',
      begruendung: `Mit ${uc.betroffene.toLocaleString('de-DE')} Betroffenen ist die Reichweite groß genug, dass unkontrollierter Verbrauch (Kosten, Last, Datenmenge) ins Gewicht fällt.`,
    })
  }

  return treffer
}

// ---------------------------------------------------------------------------
// Maßnahmen — pro erkanntem Risiko eine konkrete Maßnahme in zwei
// Textvarianten. Bei erfüllter Trifecta muss die erste Maßnahme eine der drei
// Bedingungen entfernen, nicht "Filter einbauen".
// ---------------------------------------------------------------------------

const OWASP_MASSNAHMEN: Record<string, Omit<Massnahme, 'id' | 'ausloeser'>> = {
  LLM01: {
    normal:
      'Kennzeichnet Inhalte aus externen Quellen deutlich und schult Nutzende, ungewöhnliche KI-Antworten zu hinterfragen.',
    specialist:
      'Untrusted Content im Prompt isolieren (Delimiter, separate Rollen/Segmente), Monitoring auffälliger Ausgabemuster. Reduziert das Risiko, löst es aber nicht strukturell — Prompt Injection ist nicht zuverlässig filterbar.',
    wirksamkeit: 'ergaenzend',
  },
  LLM02: {
    normal: 'Beschränkt, welche vertraulichen Daten die KI überhaupt sehen darf, und prüft Ausgaben vor dem Versand nach außen.',
    specialist:
      'Datenminimierung im Kontext, Output-Filterung auf sensible Muster (PII/Geheimnisse) vor Versand über externe Kanäle oder Consumer-Tools.',
    wirksamkeit: 'mittel',
  },
  LLM05: {
    normal: 'Lässt von der KI erzeugten Code oder Datenbankänderungen nicht automatisch ausführen, sondern von einem Menschen prüfen.',
    specialist:
      'Sandboxing/Least-Privilege für code_ausfuehren, parametrisierte Queries statt direkt ausgeführter generierter Statements, Review vor Merge/Deploy.',
    wirksamkeit: 'hoch',
  },
  LLM06: {
    normal: 'Reduziert, wie viel die KI ohne Rückfrage selbst entscheiden darf — etwa durch eine Freigabe vor kritischen Aktionen.',
    specialist:
      'Human-in-the-loop vor irreversiblen Aktionen, Tool-Berechtigungen auf das Nötigste reduzieren, granulare Autorisierung statt globaler Agenten-Rechte.',
    wirksamkeit: 'hoch',
  },
  LLM08: {
    normal: 'Trennt streng, welche Datenbankinhalte die KI durchsuchen darf, wenn sie gleichzeitig nicht vertrauenswürdige Inhalte verarbeitet.',
    specialist:
      'Zugriffskontrolle auf Embedding-/Index-Ebene, Herkunftsprüfung indexierter Inhalte, Trennung von Such- und Ausführungskontext.',
    wirksamkeit: 'mittel',
  },
  LLM10: {
    normal: 'Begrenzt, wie viele Anfragen und wie viel Datenverarbeitung pro Zeiteinheit möglich sind.',
    specialist: 'Rate Limiting, Kontingente pro Nutzer/Mandant, Kostenobergrenzen und Monitoring von Verbrauchsspitzen.',
    wirksamkeit: 'mittel',
  },
}

function baueMassnahmen(
  trifecta: ReturnType<typeof pruefeTrifecta>,
  verschaerfungen: ExposureVerschaerfung[],
  owasp: OwaspTreffer[],
): Massnahme[] {
  const massnahmen: Massnahme[] = []

  if (trifecta.erfuellt) {
    massnahmen.push({
      id: 'trifecta-entschaerfen',
      ausloeser: 'Lethal Trifecta erfüllt',
      normal:
        'Entfernt eine der drei Zutaten: Entweder verzichtet die KI auf den Zugriff auf vertrauliche Daten, oder sie verarbeitet keine Inhalte mehr, die von außen kommen, oder sie verliert den Weg, Daten nach außen zu schicken. Ein Filter reicht hier nicht — die Kombination selbst ist das Problem.',
      specialist:
        'Eine der drei Trifecta-Bedingungen strukturell entfernen: Datenzugriff einschränken (kein Zugriff auf vertrauliche/personenbezogene Daten im Kontext), Vertrauensgrenze durchsetzen (kein untrusted Input im selben Kontextfenster wie privilegierte Aktionen) oder Exfiltrationskanal kappen (keine externe Kommunikation, keine der genannten Tool-Kategorien). Prompt-Injection- oder Output-Filter gelten nicht als hinreichende Kontrolle, da Prompt Injection nach aktuellem Stand nicht zuverlässig filterbar ist.',
      wirksamkeit: 'hoch',
    })
  }

  for (const v of verschaerfungen) {
    if (v.id === 'autonom-untrusted') {
      massnahmen.push({
        id: 'massnahme-autonom-untrusted',
        ausloeser: v.label,
        normal: 'Baut eine menschliche Freigabe vor kritischen Aktionen ein, solange die KI Inhalte von außen verarbeitet.',
        specialist:
          'Autonomiegrad auf „mit Freigabe" absenken, solange untrustedInput = true. Keine autonome Aktionsausführung ohne Kontrollpunkt zwischen Injection-Fläche und privilegierter Aktion.',
        wirksamkeit: 'hoch',
      })
    }

    if (v.id === 'besondere-consumer') {
      massnahmen.push({
        id: 'massnahme-besondere-consumer',
        ausloeser: v.label,
        normal: 'Nutzt für solche Daten keinen kostenlosen oder privaten KI-Zugang, sondern einen geschäftlichen Dienst mit Vertrag.',
        specialist:
          'Wechsel auf saas_eu oder self_hosted mit Auftragsverarbeitungsvertrag (Art. 28 DSGVO). Consumer-Deployments bieten keine vertragliche Grundlage für Art.-9-Daten.',
        wirksamkeit: 'hoch',
      })
    }
  }

  for (const treffer of owasp) {
    const vorlage = OWASP_MASSNAHMEN[treffer.id]
    if (!vorlage) continue
    massnahmen.push({
      id: `massnahme-${treffer.id.toLowerCase()}`,
      ausloeser: `${treffer.id} ${treffer.titel}`,
      ...vorlage,
    })
  }

  return massnahmen
}

// ---------------------------------------------------------------------------
// Haupteinstieg
// ---------------------------------------------------------------------------

export function berechneExposure(uc: UseCase): ExposureErgebnis {
  const trifecta = pruefeTrifecta(uc)
  const faktoren = berechneFaktoren(uc)
  const verschaerfungen = berechneVerschaerfungen(uc)

  const basis = faktoren.reduce((summe, faktor) => summe + faktor.beitrag, 0)
  const zuschlag = verschaerfungen.reduce((summe, v) => summe + v.wert, 0)
  const risikoWert = Math.min(basis + zuschlag, 1)

  const stufe = trifecta.erfuellt ? 'KRITISCH' : bestimmeExposureStufe(risikoWert)
  const ampel = bestimmeAmpel(stufe)
  const owasp = pruefeOwasp(uc)
  const massnahmen = baueMassnahmen(trifecta, verschaerfungen, owasp)

  return { stufe, ampel, risikoWert, trifecta, faktoren, verschaerfungen, owasp, massnahmen }
}
