import type { UseCase } from './types'

// ---------------------------------------------------------------------------
// GRUNDHALTUNG
//
// Der AI Act lässt sich nicht vollständig algorithmisch abbilden. Diese Datei
// liefert eine VORLÄUFIGE EINORDNUNG, keine Rechtsauskunft. Überall dort, wo
// die Zuordnung Ermessen erfordert, weist das Ergebnis das explizit über
// 'grenzfall' bzw. den unschaerfe-Block aus, statt eine Klasse zu behaupten.
//
// RTL ist in den allermeisten Fällen BETREIBER (Deployer), nicht Anbieter
// (Provider) — deshalb ist 'betreiber' der Default für die Rollenwahl.
// ---------------------------------------------------------------------------

export const AIACT_VERORDNUNG = 'Verordnung (EU) 2024/1689'

export type Rolle = 'betreiber' | 'anbieter'

export type AiActKlasse = 'verboten' | 'hochrisiko' | 'transparenzpflicht' | 'minimal' | 'grenzfall'

// Priorität für die Bestimmung der primaerklasse, wenn mehrere Klassen
// gleichzeitig ausgelöst werden (Mehrfachzuordnung ist möglich und erwünscht,
// es braucht aber eine eindeutige primaerklasse).
const KLASSEN_PRIORITAET: AiActKlasse[] = ['verboten', 'hochrisiko', 'grenzfall', 'transparenzpflicht', 'minimal']

export interface Pflicht {
  id: string
  artikel: string // z.B. 'Art. 26 Abs. 1'
  titel: { basis: string; standard: string; experte: string }
  beschreibung: { basis: string; standard: string; experte: string }
  gilt_fuer: Rolle[]
  ausgeloest_durch: AiActKlasse
  // Bedingte Pflichten (z.B. Art. 27) zählen nur in den Erfüllungsgrad-Nenner,
  // wenn zusätzlich per Kontrolle "<id>:zutreffend" bestätigt wurde, dass sie
  // im konkreten Fall greifen. Nicht Teil der ursprünglichen Spezifikation,
  // aber ohne dieses Feld ließe sich "zählen nicht in den Nenner, solange
  // nicht bestätigt" nicht abbilden.
  bedingt: boolean
  erfuellt: boolean // aus useCase.kontrollen abgeleitet
}

export interface AiActErgebnis {
  primaerklasse: AiActKlasse
  zusatzklassen: AiActKlasse[]
  begruendungen: { klasse: AiActKlasse; artikel: string; text: string }[]
  unschaerfe: { grund: string; empfehlung: string }[]
  pflichten: Pflicht[]
  // 0–1, nur über die anwendbaren Pflichten. null bei Klasse 'verboten' —
  // dort gibt es nichts zu erfüllen (Einsatz ist unzulässig). Weicht von der
  // ursprünglichen Typangabe (number) ab, weil "kein Erfüllungsgrad
  // ausgegeben" sich sonst nicht ehrlich abbilden lässt.
  erfuellungsgrad: number | null
  rolle: Rolle
  selbstpruefung: string[] // die nicht ableitbaren Verbotstatbestände
}

// ---------------------------------------------------------------------------
// Fristen — die Verordnung ist in Änderung begriffen (Digital-Omnibus-
// Diskussion um Verschiebungen). Kein Datum hier gilt als endgültig gesichert.
// ---------------------------------------------------------------------------

export interface AiActFrist {
  datum: string // ISO-Datum
  bezeichnung: string
}

export const AIACT_FRISTEN: AiActFrist[] = [
  { datum: '2025-02-02', bezeichnung: 'Verbote (Art. 5) und KI-Kompetenz (Art. 4) anwendbar' },
  { datum: '2025-08-02', bezeichnung: 'GPAI-Pflichten, Governance und Sanktionen anwendbar' },
  { datum: '2026-08-02', bezeichnung: 'Allgemeine Anwendbarkeit, u. a. Art. 50 und Anhang-III-Hochrisiko' },
  { datum: '2027-08-02', bezeichnung: 'Hochrisiko nach Art. 6 Abs. 1 (Produktsicherheit)' },
]

export const AIACT_FRISTEN_HINWEIS =
  'Die Verordnung ist in Änderung begriffen (Diskussion um Verschiebungen im Rahmen des Digital-Omnibus). Kein Datum hier ist als endgültig gesichert zu betrachten — vor einer Entscheidung aktuellen Stand prüfen.'

// ---------------------------------------------------------------------------
// Selbstprüfung — Verbotstatbestände (Art. 5), die sich aus dem Datenmodell
// NICHT erkennen lassen. Statt sie zu ignorieren, werden sie hier aufgelistet.
// ---------------------------------------------------------------------------

export const SELBSTPRUEFUNG_VERBOTSTATBESTAENDE: string[] = [
  'Social Scoring durch oder im Auftrag von Behörden (Art. 5 Abs. 1 lit. c)',
  'Manipulation durch unterschwellige, täuschende oder gezielt ausnutzende Techniken (Art. 5 Abs. 1 lit. a, b)',
  'Biometrische Echtzeit-Fernidentifizierung im öffentlichen Raum zu Strafverfolgungszwecken (Art. 5 Abs. 1 lit. h)',
  'Predictive Policing auf Basis von Profiling einzelner Personen (Art. 5 Abs. 1 lit. d)',
  'Ungezieltes Scraping von Gesichtsbildern zum Aufbau oder zur Erweiterung von Gesichtserkennungsdatenbanken (Art. 5 Abs. 1 lit. e)',
]

// ---------------------------------------------------------------------------
// Entscheidungsbaum (Art. 5, Art. 6 Abs. 2 i.V.m. Anhang III, Art. 50)
// ---------------------------------------------------------------------------

interface KlassifikationsErgebnis {
  primaerklasse: AiActKlasse
  zusatzklassen: AiActKlasse[]
  begruendungen: AiActErgebnis['begruendungen']
  unschaerfe: AiActErgebnis['unschaerfe']
}

function klassifiziere(uc: UseCase): KlassifikationsErgebnis {
  const klassen = new Set<AiActKlasse>()
  const begruendungen: AiActErgebnis['begruendungen'] = []
  const unschaerfe: AiActErgebnis['unschaerfe'] = []

  // ---- STUFE 1: Verbotene Praktiken (Art. 5) --------------------------------
  if (uc.emotionserkennung === true && uc.domaene === 'hr') {
    klassen.add('verboten')
    begruendungen.push({
      klasse: 'verboten',
      artikel: 'Art. 5 Abs. 1 lit. f',
      text: 'Emotionserkennung am Arbeitsplatz ist verboten.',
    })
  }

  if (klassen.has('verboten')) {
    // Terminal: Bei einem Verbotstatbestand ist der Einsatz unzulässig —
    // weitere Stufen (Hochrisiko/Transparenz) sind für die Klassifikation
    // dann irrelevant.
    return {
      primaerklasse: 'verboten',
      zusatzklassen: [],
      begruendungen,
      unschaerfe,
    }
  }

  if (uc.biometrisch === true && uc.domaene === 'hr') {
    klassen.add('grenzfall')
    begruendungen.push({
      klasse: 'grenzfall',
      artikel: 'Art. 5 / Anhang III Nr. 4',
      text: 'Biometrische Kategorisierung am Arbeitsplatz kann je nach Ausgestaltung unter das Verbot der biometrischen Kategorisierung (Art. 5) oder unter Anhang III Nr. 4 (Beschäftigung) fallen.',
    })
    unschaerfe.push({
      grund: 'Biometrische Verarbeitung im Beschäftigungskontext',
      empfehlung: 'Konkreten Einsatzzweck (Kategorisierung vs. reine Identifikation) juristisch prüfen lassen.',
    })
  }

  // ---- STUFE 2: Hochrisiko (Art. 6 Abs. 2 i.V.m. Anhang III) ----------------
  if (uc.domaene === 'hr') {
    if (uc.autonomie === 'vorschlag') {
      klassen.add('grenzfall')
      begruendungen.push({
        klasse: 'grenzfall',
        artikel: 'Art. 6 Abs. 3',
        text: 'Die Ausnahme für Systeme mit lediglich vorbereitender oder eng begrenzter Aufgabe könnte greifen. Sie gilt jedoch nicht, sobald das System ein Profiling der betroffenen Personen vornimmt.',
      })
      unschaerfe.push({
        grund: 'Art. 6 Abs. 3 Ausnahme bei rein vorschlagender Funktion im Beschäftigungskontext',
        empfehlung: 'Prüfen, ob das System personenbezogenes Profiling durchführt — falls ja, greift die Ausnahme nicht und es bleibt bei Hochrisiko.',
      })
    } else {
      klassen.add('hochrisiko')
      begruendungen.push({
        klasse: 'hochrisiko',
        artikel: 'Art. 6 Abs. 2 i. V. m. Anhang III Nr. 4',
        text: 'Einsatz im Beschäftigungskontext (u. a. Auswahl und Filterung von Bewerbungen, Beförderungsentscheidungen) gilt als Hochrisiko.',
      })
    }
  }

  if (uc.biometrisch === true) {
    klassen.add('grenzfall')
    begruendungen.push({
      klasse: 'grenzfall',
      artikel: 'Anhang III Nr. 1',
      text: 'Biometrische Systeme fallen abhängig vom konkreten Einsatzzweck unter Anhang III Nr. 1 — Einzelfallprüfung erforderlich.',
    })
    unschaerfe.push({
      grund: 'Biometrische Verarbeitung',
      empfehlung: 'Einsatzzweck mit Anhang III Nr. 1 lit. a–c abgleichen.',
    })
  }

  if (uc.emotionserkennung === true && uc.domaene !== 'hr') {
    klassen.add('grenzfall')
    begruendungen.push({
      klasse: 'grenzfall',
      artikel: 'Anhang III Nr. 1 lit. c / Art. 50 Abs. 3',
      text: 'Emotionserkennung außerhalb des Beschäftigungskontexts kann je nach Einsatzbereich unter Anhang III Nr. 1 fallen oder es bleibt bei der Transparenzpflicht nach Art. 50 Abs. 3.',
    })
    unschaerfe.push({
      grund: 'Emotionserkennung außerhalb HR',
      empfehlung: 'Einsatzbereich mit Anhang III Nr. 1 abgleichen; unabhängig vom Ergebnis greift Art. 50 Abs. 3.',
    })
  }

  // ---- STUFE 3: Transparenzpflichten (Art. 50) -------------------------------
  if (uc.generiertOeffentlicheInhalte === true) {
    klassen.add('transparenzpflicht')
    begruendungen.push({
      klasse: 'transparenzpflicht',
      artikel: 'Art. 50 Abs. 2, Abs. 4',
      text: 'Synthetische Inhalte müssen maschinenlesbar gekennzeichnet werden (Anbieterpflicht). Bei Deepfakes bzw. Texten zu Angelegenheiten von öffentlichem Interesse besteht zusätzlich eine Offenlegungspflicht des Betreibers.',
    })
  }

  if (uc.domaene === 'support') {
    klassen.add('transparenzpflicht')
    begruendungen.push({
      klasse: 'transparenzpflicht',
      artikel: 'Art. 50 Abs. 1',
      text: 'Betroffene Personen müssen offengelegt bekommen, dass sie mit einem KI-System interagieren.',
    })
  }

  if (uc.emotionserkennung === true) {
    klassen.add('transparenzpflicht')
    begruendungen.push({
      klasse: 'transparenzpflicht',
      artikel: 'Art. 50 Abs. 3',
      text: 'Betroffene Personen sind über den Betrieb eines Emotionserkennungssystems zu informieren — zusätzlich zu einer eventuellen Hochrisiko-Einstufung.',
    })
  }

  // ---- STUFE 4: sonst minimal -------------------------------------------------
  if (klassen.size === 0) {
    klassen.add('minimal')
  }

  const sortiert = KLASSEN_PRIORITAET.filter((klasse) => klassen.has(klasse))

  return {
    primaerklasse: sortiert[0],
    zusatzklassen: sortiert.slice(1),
    begruendungen,
    unschaerfe,
  }
}

// ---------------------------------------------------------------------------
// Pflichtenkatalog
// ---------------------------------------------------------------------------

type PflichtDefinition = Omit<Pflicht, 'erfuellt'> & {
  // Feingranularer als ausgeloest_durch allein: manche Pflichten hängen nicht
  // nur an der Klasse, sondern zusätzlich an einem konkreten Feld (z.B. gilt
  // die Deepfake-Kennzeichnung nur, wenn tatsächlich Inhalte generiert werden).
  zutreffend: (uc: UseCase, aktiveKlassen: Set<AiActKlasse>) => boolean
}

const PFLICHTEN_KATALOG: PflichtDefinition[] = [
  // -- Übergreifend: gilt unabhängig von der Risikoklasse ---------------------
  {
    id: 'ki-kompetenz',
    artikel: 'Art. 4',
    titel: {
      basis: 'Grundlegendes KI-Wissen sicherstellen',
      standard: 'KI-Kompetenz sicherstellen',
      experte: 'KI-Kompetenz der eingesetzten Personen',
    },
    beschreibung: {
      basis: 'Alle, die mit dem System arbeiten, müssen genug über KI wissen, um es sinnvoll und sicher einzusetzen.',
      standard: 'Personal und Nutzende müssen über ausreichende KI-Kompetenz verfügen, um das System sicher zu betreiben.',
      experte:
        'Anbieter und Betreiber ergreifen Maßnahmen, um nach bestem Wissen sicherzustellen, dass ihr Personal und andere mit Betrieb und Nutzung befasste Personen über ein ausreichendes Maß an KI-Kompetenz verfügen (Art. 4).',
    },
    gilt_fuer: ['betreiber', 'anbieter'],
    ausgeloest_durch: 'minimal',
    bedingt: false,
    zutreffend: () => true,
  },

  // -- Hochrisiko — Betreiber (Art. 26) ---------------------------------------
  {
    id: 'betriebsanleitung',
    artikel: 'Art. 26 Abs. 1',
    titel: {
      basis: 'Nach Anleitung verwenden',
      standard: 'Betriebsanleitung befolgen',
      experte: 'Verwendung gemäß Betriebsanleitung',
    },
    beschreibung: {
      basis: 'Setzt das System genau so ein, wie es der Anbieter in der Betriebsanleitung vorgesehen hat.',
      standard: 'Das Hochrisiko-System ist gemäß der vom Anbieter beigefügten Betriebsanleitung zu verwenden.',
      experte: 'Das Hochrisiko-KI-System ist entsprechend der vom Anbieter beigefügten Betriebsanleitung zu verwenden (Art. 26 Abs. 1).',
    },
    gilt_fuer: ['betreiber'],
    ausgeloest_durch: 'hochrisiko',
    bedingt: false,
    zutreffend: (_uc, klassen) => klassen.has('hochrisiko'),
  },
  {
    id: 'menschliche-aufsicht',
    artikel: 'Art. 26 Abs. 2',
    titel: {
      basis: 'Menschliche Aufsicht sicherstellen',
      standard: 'Menschliche Aufsicht sicherstellen',
      experte: 'Menschliche Aufsicht durch kompetente, befugte Personen',
    },
    beschreibung: {
      basis: 'Es muss immer jemand mit ausreichend Wissen und Befugnis die Entscheidungen der KI im Blick behalten und eingreifen können.',
      standard: 'Eine Person mit ausreichender Kompetenz und Befugnis muss die KI-Entscheidungen beaufsichtigen und eingreifen können.',
      experte:
        'Zuweisung der menschlichen Aufsicht an natürliche Personen mit der erforderlichen Kompetenz, Ausbildung, Autorität und Unterstützung (Art. 26 Abs. 2).',
    },
    gilt_fuer: ['betreiber'],
    ausgeloest_durch: 'hochrisiko',
    bedingt: false,
    zutreffend: (_uc, klassen) => klassen.has('hochrisiko'),
  },
  {
    id: 'eingabedaten-repraesentativ',
    artikel: 'Art. 26 Abs. 4',
    titel: {
      basis: 'Passende Eingabedaten verwenden',
      standard: 'Eingabedaten prüfen',
      experte: 'Eingabedaten zweckgemäß und hinreichend repräsentativ',
    },
    beschreibung: {
      basis: 'Die Daten, die ihr eingebt, müssen zur Aufgabe passen — soweit ihr das beeinflussen könnt.',
      standard: 'Soweit ihr Kontrolle über die Eingabedaten habt, müssen sie zum Zweck des Systems passen und repräsentativ sein.',
      experte:
        'Soweit der Betreiber Kontrolle über die Eingabedaten ausübt, müssen diese im Hinblick auf den Zweck des Hochrisiko-KI-Systems relevant und hinreichend repräsentativ sein (Art. 26 Abs. 4).',
    },
    gilt_fuer: ['betreiber'],
    ausgeloest_durch: 'hochrisiko',
    bedingt: false,
    zutreffend: (_uc, klassen) => klassen.has('hochrisiko'),
  },
  {
    id: 'ueberwachung-meldung',
    artikel: 'Art. 26 Abs. 5',
    titel: {
      basis: 'Betrieb überwachen und Vorfälle melden',
      standard: 'Betrieb überwachen und melden',
      experte: 'Überwachung, Aussetzung bei Risiko, Meldung',
    },
    beschreibung: {
      basis: 'Beobachtet den Betrieb; wird ein Risiko erkennbar, das System stoppen und Anbieter sowie Marktüberwachungsbehörde informieren.',
      standard: 'Der Betrieb ist zu überwachen; bei erkennbarem Risiko das System aussetzen und Anbieter sowie Marktüberwachungsbehörde informieren.',
      experte:
        'Überwachung des Betriebs anhand der Betriebsanleitung; bei Anhaltspunkten für ein Risiko Aussetzung der Nutzung und Information von Anbieter, Vertreiber und Marktüberwachungsbehörde (Art. 26 Abs. 5).',
    },
    gilt_fuer: ['betreiber'],
    ausgeloest_durch: 'hochrisiko',
    bedingt: false,
    zutreffend: (_uc, klassen) => klassen.has('hochrisiko'),
  },
  {
    id: 'log-aufbewahrung',
    artikel: 'Art. 26 Abs. 6',
    titel: {
      basis: 'Protokolle mindestens 6 Monate aufbewahren',
      standard: 'Protokolle aufbewahren (≥ 6 Monate)',
      experte: 'Aufbewahrung automatisch erzeugter Logs (≥ 6 Monate)',
    },
    beschreibung: {
      basis: 'Bewahrt die automatisch erstellten Protokolle des Systems für mindestens sechs Monate auf.',
      standard: 'Automatisch erzeugte Protokolle sind mindestens sechs Monate aufzubewahren.',
      experte:
        'Aufbewahrung der vom Hochrisiko-KI-System automatisch erzeugten Protokolle, soweit sie der Kontrolle des Betreibers unterliegen, für einen der Zweckbestimmung angemessenen Zeitraum von mindestens sechs Monaten (Art. 26 Abs. 6).',
    },
    gilt_fuer: ['betreiber'],
    ausgeloest_durch: 'hochrisiko',
    bedingt: false,
    zutreffend: (_uc, klassen) => klassen.has('hochrisiko'),
  },
  {
    id: 'information-arbeitnehmer',
    artikel: 'Art. 26 Abs. 7',
    titel: {
      basis: 'Beschäftigte vorab informieren',
      standard: 'Beschäftigte informieren',
      experte: 'Information der Arbeitnehmervertretung vor Inbetriebnahme',
    },
    beschreibung: {
      basis: 'Informiert betroffene Mitarbeitende und ihre Vertretung, bevor das System am Arbeitsplatz eingesetzt wird.',
      standard: 'Beschäftigte und ihre Vertretung sind vor Einsatz des Systems am Arbeitsplatz zu informieren.',
      experte:
        'Information der Arbeitnehmer und ihrer Vertretung darüber, dass sie am Arbeitsplatz Gegenstand der Verwendung eines Hochrisiko-KI-Systems sein werden, vor Inbetriebnahme (Art. 26 Abs. 7). Nur relevant, sofern der Einsatz am Arbeitsplatz erfolgt.',
    },
    gilt_fuer: ['betreiber'],
    ausgeloest_durch: 'hochrisiko',
    bedingt: false,
    zutreffend: (_uc, klassen) => klassen.has('hochrisiko'),
  },
  {
    id: 'information-betroffene',
    artikel: 'Art. 26 Abs. 11',
    titel: {
      basis: 'Betroffene bei wichtigen Entscheidungen informieren',
      standard: 'Betroffene informieren',
      experte: 'Information bei Entscheidungen mit rechtlicher/vergleichbarer Wirkung',
    },
    beschreibung: {
      basis: 'Trifft die KI eine Entscheidung mit rechtlicher oder ähnlich bedeutsamer Wirkung über eine Person, muss diese informiert werden.',
      standard: 'Personen, über die das System rechtlich bedeutsame Entscheidungen trifft oder wesentlich beeinflusst, sind darüber zu informieren.',
      experte:
        'Betreiber, die über die Verwendung eines Hochrisiko-KI-Systems entscheiden, das Entscheidungen mit rechtlicher Wirkung oder ähnlich erheblicher Auswirkung auf natürliche Personen trifft oder wesentlich unterstützt, informieren die betroffene Person hierüber (Art. 26 Abs. 11).',
    },
    gilt_fuer: ['betreiber'],
    ausgeloest_durch: 'hochrisiko',
    bedingt: false,
    zutreffend: (_uc, klassen) => klassen.has('hochrisiko'),
  },
  {
    id: 'grundrechte-folgenabschaetzung',
    artikel: 'Art. 27',
    titel: {
      basis: 'Grundrechte-Folgenabschätzung (falls betroffen)',
      standard: 'Grundrechte-Folgenabschätzung prüfen',
      experte: 'Grundrechte-Folgenabschätzung (Art. 27) — bedingte Pflicht',
    },
    beschreibung: {
      basis: 'Bestimmte Betreiber (u. a. Behörden) müssen vorab die Auswirkungen auf Grundrechte bewerten. Prüft, ob das auf euch zutrifft.',
      standard: 'Bestimmte Betreiber müssen vor Inbetriebnahme eine Grundrechte-Folgenabschätzung durchführen — prüft, ob das auf euch zutrifft.',
      experte:
        'Öffentliche Einrichtungen und Betreiber bestimmter in Anhang III genannter Hochrisiko-Systeme (u. a. Kreditwürdigkeitsprüfung, Versicherungsrisiko) müssen vor Inbetriebnahme eine Grundrechte-Folgenabschätzung durchführen (Art. 27). Ob dies zutrifft, hängt vom Betreibertyp ab und muss einzeln geprüft werden.',
    },
    gilt_fuer: ['betreiber'],
    ausgeloest_durch: 'hochrisiko',
    bedingt: true,
    zutreffend: (_uc, klassen) => klassen.has('hochrisiko'),
  },

  // -- Transparenzpflicht (Art. 50) --------------------------------------------
  {
    id: 'ki-interaktion-offenlegung',
    artikel: 'Art. 50 Abs. 1',
    titel: {
      basis: 'Offenlegen, dass eine KI antwortet',
      standard: 'KI-Interaktion offenlegen',
      experte: 'Offenlegung der KI-Interaktion',
    },
    beschreibung: {
      basis: 'Nutzende müssen erkennen können, dass sie mit einem KI-System sprechen, nicht mit einem Menschen.',
      standard: 'Betroffene müssen erkennen können, dass sie mit einem KI-System interagieren (Anbieterpflicht, hier als Kontext ausgewiesen).',
      experte:
        'Anbieterpflicht: Natürliche Personen müssen darüber informiert werden, dass sie mit einem KI-System interagieren (Art. 50 Abs. 1). Für Betreiber als Kontextinformation ausgewiesen.',
    },
    gilt_fuer: ['anbieter'],
    ausgeloest_durch: 'transparenzpflicht',
    bedingt: false,
    zutreffend: (_uc, klassen) => klassen.has('transparenzpflicht'),
  },
  {
    id: 'deepfake-kennzeichnung',
    artikel: 'Art. 50 Abs. 4',
    titel: {
      basis: 'Deepfakes kennzeichnen',
      standard: 'Deepfakes kennzeichnen',
      experte: 'Kennzeichnung von Deepfakes',
    },
    beschreibung: {
      basis: 'Erzeugt oder verändert ihr mit KI Bilder, Audio oder Video, die wie echte Personen, Orte oder Ereignisse wirken, müsst ihr offenlegen, dass sie künstlich erzeugt sind.',
      standard: 'KI-generierte oder -veränderte Bild-, Audio- oder Videoinhalte, die einen Deepfake darstellen, müssen als künstlich erzeugt gekennzeichnet werden.',
      experte:
        'Betreiber eines KI-Systems, das Bild-, Audio- oder Videoinhalte erzeugt oder manipuliert, die einen Deepfake darstellen, legen offen, dass die Inhalte künstlich erzeugt oder manipuliert wurden (Art. 50 Abs. 4 UAbs. 1).',
    },
    gilt_fuer: ['betreiber'],
    ausgeloest_durch: 'transparenzpflicht',
    bedingt: false,
    zutreffend: (uc, klassen) => klassen.has('transparenzpflicht') && uc.generiertOeffentlicheInhalte === true,
  },
  {
    id: 'text-oeffentliches-interesse-offenlegung',
    artikel: 'Art. 50 Abs. 4',
    titel: {
      basis: 'KI-Texte zu öffentlichen Themen kennzeichnen',
      standard: 'Texte zu öffentlichem Interesse kennzeichnen',
      experte: 'Offenlegung bei Texten zu Angelegenheiten von öffentlichem Interesse',
    },
    beschreibung: {
      basis: 'Veröffentlicht ihr KI-generierte Texte zu Themen von öffentlichem Interesse ohne redaktionelle Gegenprüfung durch einen Menschen, müsst ihr das offenlegen.',
      standard: 'KI-generierte Texte zu Angelegenheiten von öffentlichem Interesse sind offenzulegen, sofern keine redaktionelle Prüfung durch einen Menschen stattfand.',
      experte:
        'Betreiber, die einen Text veröffentlichen, der KI-generiert wurde, um die Öffentlichkeit über Angelegenheiten von öffentlichem Interesse zu informieren, legen dies offen — außer eine natürliche Person hat die redaktionelle Verantwortung übernommen und den Inhalt überprüft (Art. 50 Abs. 4 UAbs. 2).',
    },
    gilt_fuer: ['betreiber'],
    ausgeloest_durch: 'transparenzpflicht',
    bedingt: false,
    zutreffend: (uc, klassen) => klassen.has('transparenzpflicht') && uc.generiertOeffentlicheInhalte === true,
  },
  {
    id: 'emotionserkennung-information',
    artikel: 'Art. 50 Abs. 3',
    titel: {
      basis: 'Betroffene über Emotionserkennung informieren',
      standard: 'Über Emotionserkennung informieren',
      experte: 'Information der betroffenen Personen (Emotionserkennung)',
    },
    beschreibung: {
      basis: 'Erkennt die KI Emotionen oder Absichten, müsst ihr die betroffenen Personen darüber informieren.',
      standard: 'Von Emotionserkennung betroffene Personen sind über den Betrieb des Systems zu informieren.',
      experte:
        'Betreiber eines Systems zur Emotionserkennung oder biometrischen Kategorisierung informieren die davon betroffenen natürlichen Personen über den Betrieb des Systems (Art. 50 Abs. 3).',
    },
    gilt_fuer: ['betreiber'],
    ausgeloest_durch: 'transparenzpflicht',
    bedingt: false,
    zutreffend: (uc) => uc.emotionserkennung === true,
  },
]

// ---------------------------------------------------------------------------
// Haupteinstieg
// ---------------------------------------------------------------------------

export function berechneAiAct(uc: UseCase, rolle: Rolle = 'betreiber'): AiActErgebnis {
  const { primaerklasse, zusatzklassen, begruendungen, unschaerfe } = klassifiziere(uc)

  if (primaerklasse === 'verboten') {
    return {
      primaerklasse,
      zusatzklassen,
      begruendungen,
      unschaerfe,
      pflichten: [],
      erfuellungsgrad: null,
      rolle,
      selbstpruefung: SELBSTPRUEFUNG_VERBOTSTATBESTAENDE,
    }
  }

  const aktiveKlassen = new Set<AiActKlasse>([primaerklasse, ...zusatzklassen])

  const pflichten: Pflicht[] = PFLICHTEN_KATALOG.filter((p) => p.gilt_fuer.includes(rolle))
    .filter((p) => p.zutreffend(uc, aktiveKlassen))
    .map(({ zutreffend: _zutreffend, ...rest }) => ({
      ...rest,
      erfuellt: uc.kontrollen.includes(rest.id),
    }))

  const nenner = pflichten.filter((p) => !p.bedingt || uc.kontrollen.includes(`${p.id}:zutreffend`))
  const zaehler = nenner.filter((p) => p.erfuellt)
  const erfuellungsgrad = nenner.length === 0 ? null : zaehler.length / nenner.length

  return {
    primaerklasse,
    zusatzklassen,
    begruendungen,
    unschaerfe,
    pflichten,
    erfuellungsgrad,
    rolle,
    selbstpruefung: SELBSTPRUEFUNG_VERBOTSTATBESTAENDE,
  }
}
