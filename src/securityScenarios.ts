import type { UseCase } from './types'

export interface SecurityScenario {
  id: string
  titel: string
  kurzbeschreibung: { basis: string; standard: string; experte: string }
  lehrpunkt: { basis: string; standard: string; experte: string } // Warum ist dieser Fall drin?
  useCase: UseCase
}

export const securityScenarios: SecurityScenario[] = [
  {
    id: 'redaktionsassistent',
    titel: 'Redaktionsassistent mit Recherche',
    kurzbeschreibung: {
      basis: 'Eine KI hilft bei der Recherche für Artikel und darf dafür im Internet suchen.',
      standard: 'Recherche-Assistent mit Websuche-Zugriff — die Websuche selbst ist ein Exfiltrationskanal.',
      experte: 'Recherche-Assistent mit Websuche und Dateizugriff auf unveröffentlichte Inhalte.',
    },
    lehrpunkt: {
      basis:
        'Sieht harmlos aus, erfüllt aber alle drei Bedingungen der gefährlichen Kombination — weil die Websuche selbst ein Weg nach außen ist.',
      standard:
        'Alle drei Trifecta-Bedingungen erfüllt: vertrauliche Daten, externe Inhalte und Websuche als Weg nach außen.',
      experte:
        'Trifecta über websuche als Exfiltrationskanal; Datenzugriff auf unveröffentlichte Beiträge; zusätzlich Art. 50 Abs. 4 bei Texten zu Angelegenheiten von öffentlichem Interesse.',
    },
    useCase: {
      id: 'redaktionsassistent',
      name: 'Redaktionsassistent mit Recherche',
      beschreibung:
        'Ein KI-Assistent recherchiert im Web und in internen Dateien, um Redakteur:innen bei unveröffentlichten Beiträgen zu unterstützen.',
      domaene: 'redaktion',
      datenklasse: 'vertraulich',
      untrustedInput: true,
      externeKommunikation: false,
      tools: ['websuche', 'dateizugriff'],
      autonomie: 'mit_freigabe',
      deployment: 'saas_eu',
      betroffene: 50,
      generiertOeffentlicheInhalte: true,
      biometrisch: false,
      emotionserkennung: false,
      kontrollen: [],
    },
  },
  {
    id: 'support-bot',
    titel: 'Zuschauer-Support-Bot',
    kurzbeschreibung: {
      basis: 'Ein Chatbot beantwortet Fragen von Zuschauer:innen automatisch und selbstständig.',
      standard: 'Autonomer Support-Bot mit Datenbankzugriff und externem API-Kanal bei 500.000 Betroffenen.',
      experte: 'Autonomer Support-Bot mit Datenbankzugriff, externer API-Anbindung und aktivem Exfiltrationskanal.',
    },
    lehrpunkt: {
      basis:
        'Ein Support-Bot wirkt harmlos — hier kommen aber alle drei Zutaten der gefährlichen Kombination zusammen, bei einer halben Million Betroffener und ohne dass ein Mensch zwischen KI und Aktion steht.',
      standard:
        'Trifecta erfüllt und hohe Reichweite — trotzdem nur Transparenzpflicht, da Support keine Hochrisiko-Kategorie ist.',
      experte:
        'Trifecta über externeKommunikation und api_extern erfüllt; zusätzlich LLM08 (Datenbankzugriff + untrusted Input) und LLM10 (Reichweite > 100.000). AI Act: Transparenzpflicht nach Art. 50 Abs. 1 — keine Hochrisiko-Einstufung, da Support keine Anhang-III-Kategorie ist, trotz autonomer Handlungsmacht.',
    },
    useCase: {
      id: 'support-bot',
      name: 'Zuschauer-Support-Bot',
      beschreibung:
        'Ein Chatbot beantwortet Zuschauer:innen-Anfragen automatisiert, liest dafür Kundendaten aus der Datenbank und kann externe Dienste ansprechen.',
      domaene: 'support',
      datenklasse: 'personenbezogen',
      untrustedInput: true,
      externeKommunikation: true,
      tools: ['datenbank_lesen', 'api_extern'],
      autonomie: 'autonom',
      deployment: 'saas_us',
      betroffene: 500000,
      generiertOeffentlicheInhalte: false,
      biometrisch: false,
      emotionserkennung: false,
      kontrollen: [],
    },
  },
  {
    id: 'bewerbung-autonom',
    titel: 'Bewerbungs-Vorauswahl (autonom)',
    kurzbeschreibung: {
      basis: 'Eine KI wählt selbstständig aus, welche Bewerbungen weiterkommen.',
      standard: 'Autonome Bewerbungsvorauswahl — die KI entscheidet ohne menschliche Rückfrage.',
      experte: 'Autonome Bewerbungsvorauswahl mit Dateizugriff auf Bewerbungsunterlagen.',
    },
    lehrpunkt: {
      basis:
        'Die KI entscheidet hier ohne Rückfrage mit, wer eine Chance bekommt — genau das macht automatisierte Bewerbungsauswahl zu einem besonders geregelten Fall.',
      standard:
        'Hochrisiko nach Anhang III Nr. 4; autonome Entscheidung schließt die Ausnahme nach Art. 6 Abs. 3 aus.',
      experte:
        'Anhang III Nr. 4 (Beschäftigung); autonome Handlungsmacht schließt die Ausnahme nach Art. 6 Abs. 3 aus. Vergleiche Fall 4 (nur Vorschlag) — der Unterschied in genau einem Feld ändert die Einordnung fundamental.',
    },
    useCase: {
      id: 'bewerbung-autonom',
      name: 'Bewerbungs-Vorauswahl (autonom)',
      beschreibung:
        'Eine KI sichtet Bewerbungsunterlagen und trifft autonom die Vorauswahl, welche Kandidat:innen ins Auswahlverfahren kommen.',
      domaene: 'hr',
      datenklasse: 'personenbezogen',
      untrustedInput: true,
      externeKommunikation: false,
      tools: ['dateizugriff'],
      autonomie: 'autonom',
      deployment: 'saas_eu',
      betroffene: 2000,
      generiertOeffentlicheInhalte: false,
      biometrisch: false,
      emotionserkennung: false,
      kontrollen: [],
    },
  },
  {
    id: 'bewerbung-vorschlag',
    titel: 'Bewerbungs-Screening (nur Vorschlag)',
    kurzbeschreibung: {
      basis: 'Eine KI schlägt eine Reihenfolge vor, ein Mensch entscheidet.',
      standard: 'Bewerbungs-Screening mit reiner Vorschlagsfunktion — identische Daten wie Fall 3.',
      experte: 'Screening mit reiner Vorschlagsfunktion, identische Datenbasis wie Fall 3.',
    },
    lehrpunkt: {
      basis:
        'Der einzige Unterschied zum vorherigen Fall: Hier schlägt die KI nur vor, ein Mensch entscheidet. Das kann die rechtliche Einordnung erheblich verändern — aber nur, wenn die KI dabei kein Persönlichkeitsprofil der Bewerbenden erstellt.',
      standard:
        'Ein Feld (autonomie) unterscheidet sich von Fall 3 — das Ergebnis kippt von Hochrisiko zu Grenzfall.',
      experte:
        'Der Unterschied zu Fall 3 ist ein einziges Feld — und die rechtliche Einordnung ändert sich fundamental. Ob die Ausnahme nach Art. 6 Abs. 3 wirklich greift, hängt daran, ob Profiling stattfindet.',
    },
    useCase: {
      id: 'bewerbung-vorschlag',
      name: 'Bewerbungs-Screening (nur Vorschlag)',
      beschreibung:
        'Eine KI sichtet Bewerbungsunterlagen und schlägt eine Rangfolge vor; die endgültige Entscheidung trifft weiterhin ein Mensch.',
      domaene: 'hr',
      datenklasse: 'personenbezogen',
      untrustedInput: true,
      externeKommunikation: false,
      tools: ['dateizugriff'],
      autonomie: 'vorschlag',
      deployment: 'saas_eu',
      betroffene: 2000,
      generiertOeffentlicheInhalte: false,
      biometrisch: false,
      emotionserkennung: false,
      kontrollen: [],
    },
  },
  {
    id: 'untertitelung',
    titel: 'Untertitelung & Synchronisation',
    kurzbeschreibung: {
      basis: 'Eine KI übersetzt und vertont Sendungen für ein großes Publikum.',
      standard: 'Self-hosted Untertitel-Pipeline für ein großes Publikum, keine externe Kommunikation.',
      experte: 'Self-hosted Untertitel-/Synchronisationspipeline ohne externe Kommunikation.',
    },
    lehrpunkt: {
      basis:
        'Viele Zuschauer:innen bedeuten nicht automatisch hohes Risiko: Weil die Daten intern bleiben und alles selbst betrieben wird, bleibt dieser Fall im grünen Bereich — kennzeichnungspflichtig ist er trotzdem, weil Inhalte veröffentlicht werden.',
      standard:
        'Hohe Reichweite treibt das Risiko nicht automatisch hoch, wenn Datenkontrolle und Deployment sauber sind.',
      experte:
        'Hohe Reichweite (Faktor nahe 1.0) bei self-hosted Deployment und interner Datenklasse ergibt Exposure-Stufe B trotz Art.-50-Transparenzpflicht — Reichweite allein treibt den Risikowert nicht in den kritischen Bereich, wenn Datenkontrolle und Deployment sauber sind.',
    },
    useCase: {
      id: 'untertitelung',
      name: 'Untertitelung & Synchronisation',
      beschreibung:
        'Eine KI erstellt automatisch Untertitel und synchronisierte Sprachfassungen für Sendungen, betrieben auf eigener Infrastruktur.',
      domaene: 'redaktion',
      datenklasse: 'intern',
      untrustedInput: false,
      externeKommunikation: false,
      tools: ['keine'],
      autonomie: 'mit_freigabe',
      deployment: 'self_hosted',
      betroffene: 100000,
      generiertOeffentlicheInhalte: true,
      biometrisch: false,
      emotionserkennung: false,
      kontrollen: [],
    },
  },
  {
    id: 'ki-stimme',
    titel: 'KI-Stimme für Werbespot',
    kurzbeschreibung: {
      basis: 'Eine KI erzeugt eine künstliche Stimme für einen Werbespot.',
      standard: 'Synthetische Werbestimme über einen SaaS-US-Dienst, eine Million Hörer:innen.',
      experte: 'Voice-Synthesis für Werbeinhalte über einen SaaS-US-Dienst.',
    },
    lehrpunkt: {
      basis:
        'Eine künstliche Stimme fällt unter die Deepfake-Kennzeichnungspflicht — auch wenn niemand täuschen will. Das Risiko bleibt trotz einer Million Hörer:innen im mittleren, nicht roten Bereich.',
      standard:
        'Synthetische Audioinhalte lösen die Deepfake-Kennzeichnungspflicht aus — unabhängig von der Absicht.',
      experte:
        'Synthetische Audioinhalte lösen die Deepfake-Kennzeichnungspflicht (Art. 50 Abs. 4 UAbs. 1) aus. Trotz betroffene = 1.000.000 (Reichweite-Faktor 1.0) bleibt der Exposure-Risikowert bei Stufe C, da keine Trifecta-Bedingung erfüllt ist und Autonomie/Deployment moderat bleiben.',
    },
    useCase: {
      id: 'ki-stimme',
      name: 'KI-Stimme für Werbespot',
      beschreibung:
        'Eine KI erzeugt eine synthetische Stimme für einen Werbespot, basierend auf internen Skripten ohne externe Kommunikation.',
      domaene: 'marketing',
      datenklasse: 'intern',
      untrustedInput: false,
      externeKommunikation: false,
      tools: ['keine'],
      autonomie: 'mit_freigabe',
      deployment: 'saas_us',
      betroffene: 1000000,
      generiertOeffentlicheInhalte: true,
      biometrisch: false,
      emotionserkennung: false,
      kontrollen: [],
    },
  },
  {
    id: 'meeting-zusammenfassung',
    titel: 'Meeting-Zusammenfassung',
    kurzbeschreibung: {
      basis: 'Eine KI fasst interne Besprechungen zusammen.',
      standard: 'Self-hosted Meeting-Zusammenfassung, reine Vorschlagsfunktion, kleiner Kreis.',
      experte: 'Self-hosted Meeting-Summary mit reiner Vorschlagsfunktion, kleiner Betroffenenkreis.',
    },
    lehrpunkt: {
      basis:
        'Nicht jeder KI-Einsatz ist kritisch. Dieser Fall zeigt, wie ein unproblematisches Setup aussieht: kleiner Kreis, interne Daten, ein Mensch behält die Kontrolle.',
      standard:
        'Minimal-Klasse und niedriges Risiko — ein Beispiel für einen unkritischen Use-Case.',
      experte:
        'Minimal-Klasse im AI Act (keine Anhang-III-Kategorie, keine Transparenzpflicht ausgelöst) und Exposure-Stufe B — ein Beispiel für einen Use-Case ohne besonderen Regelungsbedarf über Art. 4 hinaus.',
    },
    useCase: {
      id: 'meeting-zusammenfassung',
      name: 'Meeting-Zusammenfassung',
      beschreibung:
        'Eine KI fasst interne Meetings zusammen und schlägt Stichpunkte vor, ohne dass Inhalte das Unternehmen verlassen.',
      domaene: 'verwaltung',
      datenklasse: 'vertraulich',
      untrustedInput: false,
      externeKommunikation: false,
      tools: ['keine'],
      autonomie: 'vorschlag',
      deployment: 'self_hosted',
      betroffene: 20,
      generiertOeffentlicheInhalte: false,
      biometrisch: false,
      emotionserkennung: false,
      kontrollen: [],
    },
  },
  {
    id: 'emotionsanalyse-bewerbung',
    titel: 'Emotionsanalyse in Bewerbungsgesprächen',
    kurzbeschreibung: {
      basis: 'Eine KI wertet die Gefühle von Bewerbenden im Gespräch aus.',
      standard: 'Autonome Emotionserkennung im Bewerbungsgespräch — besondere Kategorien personenbezogener Daten.',
      experte: 'Autonome Emotionserkennung im Beschäftigungskontext, besondere Kategorien personenbezogener Daten.',
    },
    lehrpunkt: {
      basis: 'Dieser Einsatz ist in der EU nicht erlaubt — unabhängig davon, wie gut er technisch abgesichert wäre.',
      standard:
        'Verboten nach Art. 5 Abs. 1 lit. f — unabhängig von technischer Absicherung oder Exposure-Stufe.',
      experte:
        'Art. 5 Abs. 1 lit. f (Emotionserkennung am Arbeitsplatz) — Verbotstatbestand, terminal. Die Exposure-Bewertung (Stufe D, keine Trifecta) ist hier irrelevant: Ein technisch gut abgesichertes verbotenes System bleibt verboten.',
    },
    useCase: {
      id: 'emotionsanalyse-bewerbung',
      name: 'Emotionsanalyse in Bewerbungsgesprächen',
      beschreibung:
        'Eine KI analysiert während Bewerbungsgesprächen automatisch die Emotionen der Kandidat:innen und leitet daraus eine Einschätzung ab.',
      domaene: 'hr',
      datenklasse: 'besondere_kategorien',
      untrustedInput: false,
      externeKommunikation: false,
      tools: ['keine'],
      autonomie: 'autonom',
      deployment: 'saas_us',
      betroffene: 500,
      generiertOeffentlicheInhalte: false,
      biometrisch: false,
      emotionserkennung: true,
      kontrollen: [],
    },
  },
]
