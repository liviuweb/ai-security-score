export type Datenklasse =
  | 'oeffentlich'
  | 'intern'
  | 'vertraulich'
  | 'personenbezogen'
  | 'besondere_kategorien'

export type Deployment = 'consumer' | 'saas_us' | 'saas_eu' | 'self_hosted'

export type Autonomie = 'vorschlag' | 'mit_freigabe' | 'autonom'

export type Domaene =
  | 'redaktion'
  | 'hr'
  | 'support'
  | 'marketing'
  | 'entwicklung'
  | 'verwaltung'
  | 'sonstiges'

export type ToolKategorie =
  | 'websuche'
  | 'dateizugriff'
  | 'email_senden'
  | 'code_ausfuehren'
  | 'datenbank_lesen'
  | 'datenbank_schreiben'
  | 'api_extern'
  | 'keine'

export interface UseCase {
  id: string
  name: string
  beschreibung: string
  datenklasse: Datenklasse
  untrustedInput: boolean
  externeKommunikation: boolean
  tools: ToolKategorie[]
  autonomie: Autonomie
  deployment: Deployment
  betroffene: number
  domaene: Domaene
  generiertOeffentlicheInhalte: boolean
  biometrisch: boolean
  emotionserkennung: boolean
  kontrollen: string[]
}

export function createLeeresUseCase(): UseCase {
  return {
    id: 'new-usecase',
    name: '',
    beschreibung: '',
    datenklasse: 'intern',
    untrustedInput: true,
    externeKommunikation: false,
    tools: ['keine'],
    autonomie: 'mit_freigabe',
    deployment: 'saas_us',
    betroffene: 1,
    domaene: 'sonstiges',
    generiertOeffentlicheInhalte: false,
    biometrisch: false,
    emotionserkennung: false,
    kontrollen: [],
  }
}
