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
  titel: { normal: string; specialist: string }
  beschreibung: { normal: string; specialist: string }
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
    titel: { normal: 'Grundlegendes KI-Wissen sicherstellen', specialist: 'KI-Kompetenz der eingesetzten Personen' },
    beschreibung: {
      normal: 'Alle, die mit dem System arbeiten, müssen genug über KI wissen, um es sinnvoll und sicher einzusetzen.',
      specialist:
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
    titel: { normal: 'Nach Anleitung verwenden', specialist: 'Verwendung gemäß Betriebsanleitung' },
    beschreibung: {
      normal: 'Setzt das System genau so ein, wie es der Anbieter in der Betriebsanleitung vorgesehen hat.',
      specialist: 'Das Hochrisiko-KI-System ist entsprechend der vom Anbieter beigefügten Betriebsanleitung zu verwenden (Art. 26 Abs. 1).',
    },
    gilt_fuer: ['betreiber'],
    ausgeloest_durch: 'hochrisiko',
    bedingt: false,
    zutreffend: (_uc, klassen) => klassen.has('hochrisiko'),
  },
  {
    id: 'menschliche-aufsicht',
    artikel: 'Art. 26 Abs. 2',
    titel: { normal: 'Menschliche Aufsicht sicherstellen', specialist: 'Menschliche Aufsicht durch kompetente, befugte Personen' },
    beschreibung: {
      normal: 'Es muss immer jemand mit ausreichend Wissen und Befugnis die Entscheidungen der KI im Blick behalten und eingreifen können.',
      specialist:
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
    titel: { normal: 'Passende Eingabedaten verwenden', specialist: 'Eingabedaten zweckgemäß und hinreichend repräsentativ' },
    beschreibung: {
      normal: 'Die Daten, die ihr eingebt, müssen zur Aufgabe passen — soweit ihr das beeinflussen könnt.',
      specialist:
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
    titel: { normal: 'Betrieb überwachen und Vorfälle melden', specialist: 'Überwachung, Aussetzung bei Risiko, Meldung' },
    beschreibung: {
      normal: 'Beobachtet den Betrieb; wird ein Risiko erkennbar, das System stoppen und Anbieter sowie Marktüberwachungsbehörde informieren.',
      specialist:
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
    titel: { normal: 'Protokolle mindestens 6 Monate aufbewahren', specialist: 'Aufbewahrung automatisch erzeugter Logs (≥ 6 Monate)' },
    beschreibung: {
      normal: 'Bewahrt die automatisch erstellten Protokolle des Systems für mindestens sechs Monate auf.',
      specialist:
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
    titel: { normal: 'Beschäftigte vorab informieren', specialist: 'Information der Arbeitnehmervertretung vor Inbetriebnahme' },
    beschreibung: {
      normal: 'Informiert betroffene Mitarbeitende und ihre Vertretung, bevor das System am Arbeitsplatz eingesetzt wird.',
      specialist:
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
    titel: { normal: 'Betroffene bei wichtigen Entscheidungen informieren', specialist: 'Information bei Entscheidungen mit rechtlicher/vergleichbarer Wirkung' },
    beschreibung: {
      normal: 'Trifft die KI eine Entscheidung mit rechtlicher oder ähnlich bedeutsamer Wirkung über eine Person, muss diese informiert werden.',
      specialist:
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
    titel: { normal: 'Grundrechte-Folgenabschätzung (falls betroffen)', specialist: 'Grundrechte-Folgenabschätzung (Art. 27) — bedingte Pflicht' },
    beschreibung: {
      normal: 'Bestimmte Betreiber (u. a. Behörden) müssen vorab die Auswirkungen auf Grundrechte bewerten. Prüft, ob das auf euch zutrifft.',
      specialist:
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
    titel: { normal: 'Offenlegen, dass eine KI antwortet', specialist: 'Offenlegung der KI-Interaktion' },
    beschreibung: {
      normal: 'Nutzende müssen erkennen können, dass sie mit einem KI-System sprechen, nicht mit einem Menschen.',
      specialist:
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
    titel: { normal: 'Deepfakes kennzeichnen', specialist: 'Kennzeichnung von Deepfakes' },
    beschreibung: {
      normal: 'Erzeugt oder verändert ihr mit KI Bilder, Audio oder Video, die wie echte Personen, Orte oder Ereignisse wirken, müsst ihr offenlegen, dass sie künstlich erzeugt sind.',
      specialist:
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
    titel: { normal: 'KI-Texte zu öffentlichen Themen kennzeichnen', specialist: 'Offenlegung bei Texten zu Angelegenheiten von öffentlichem Interesse' },
    beschreibung: {
      normal: 'Veröffentlicht ihr KI-generierte Texte zu Themen von öffentlichem Interesse ohne redaktionelle Gegenprüfung durch einen Menschen, müsst ihr das offenlegen.',
      specialist:
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
    titel: { normal: 'Betroffene über Emotionserkennung informieren', specialist: 'Information der betroffenen Personen (Emotionserkennung)' },
    beschreibung: {
      normal: 'Erkennt die KI Emotionen oder Absichten, müsst ihr die betroffenen Personen darüber informieren.',
      specialist:
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
