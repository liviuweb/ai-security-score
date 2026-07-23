export const feldTexte = {
  name: {
    label: {
      normal: 'Wie heißt der Anwendungsfall?',
      specialist: 'Name / Kurzbezeichnung',
    },
    hilfe: {
      normal: 'Ein prägnanter Name hilft später beim Vergleich und in der Bibliothek.',
      specialist: null,
    },
  },
  beschreibung: {
    label: {
      normal: 'Was macht die KI hier konkret?',
      specialist: 'Beschreibung',
    },
    hilfe: {
      normal: 'Beschreibe die Aufgabe in Alltagssprache, nicht nur in Fachbegriffen.',
      specialist: 'Kurzbeschreibung des Use-Cases und der relevanten Aufgabe.',
    },
  },
  domaene: {
    label: {
      normal: 'In welchem Bereich wird das eingesetzt?',
      specialist: 'Domäne',
    },
    hilfe: {
      normal: 'Die Domäne beeinflusst, wie schnell ein Fehler nach außen dringt.',
      specialist: null,
    },
    optionen: {
      redaktion: { normal: 'Redaktion & Content', specialist: 'Redaktion' },
      hr: { normal: 'Personal & Bewerbung', specialist: 'HR' },
      support: { normal: 'Kundenservice', specialist: 'Support' },
      marketing: { normal: 'Marketing', specialist: 'Marketing' },
      entwicklung: { normal: 'Softwareentwicklung', specialist: 'Entwicklung' },
      verwaltung: { normal: 'Interne Verwaltung', specialist: 'Verwaltung' },
      sonstiges: { normal: 'Sonstiges', specialist: 'Sonstiges' },
    },
  },
  datenklasse: {
    label: {
      normal: 'Welche Art von Daten verarbeitet die KI?',
      specialist: 'Datenklasse',
    },
    hilfe: {
      normal: 'Je sensibler die Daten, desto schwerer wiegt ein Fehler — und desto mehr Regeln greifen.',
      specialist: 'Datenklassifikation nach Sensitivität und Schutzbedarf.',
    },
    optionen: {
      oeffentlich: {
        normal: 'Nichts Vertrauliches, z. B. veröffentlichte Texte',
        specialist: 'Öffentlich',
      },
      intern: {
        normal: 'Interne Unterlagen, aber keine Personendaten',
        specialist: 'Intern',
      },
      vertraulich: {
        normal: 'Geschäftsgeheimnisse, Verträge, unveröffentlichte Inhalte',
        specialist: 'Vertraulich',
      },
      personenbezogen: {
        normal: 'Namen, Kontaktdaten, Bewerbungen, Kundendaten',
        specialist: 'Personenbezogen',
      },
      besondere_kategorien: {
        normal: 'Gesundheit, Herkunft, Religion, Gewerkschaft, Sexualleben oder biometrische Daten',
        specialist: 'Besondere Kategorien',
      },
    },
  },
  betroffene: {
    label: {
      normal: 'Wie viele Menschen sind betroffen, wenn hier etwas schiefgeht?',
      specialist: 'Betroffene Personen',
    },
    hilfe: {
      normal: 'Die Zahl hilft später bei der Einordnung von Wirkung und Verantwortung.',
      specialist: 'Anzahl der betroffenen Personen oder Datensätze.',
    },
  },
  untrustedInput: {
    label: {
      normal: 'Verarbeitet die KI Inhalte, die von außen kommen?',
      specialist: 'Untrusted Input im Kontextfenster',
    },
    hilfe: {
      normal: 'Solche Inhalte können versteckte Anweisungen enthalten, die die KI ausführt, ohne dass jemand es merkt.',
      specialist: 'Eingaben aus externen Quellen, die nicht vollständig kontrolliert sind.',
    },
  },
  externeKommunikation: {
    label: {
      normal: 'Kann die KI etwas nach außen schicken?',
      specialist: 'External Communication / Exfiltrationskanal',
    },
    hilfe: {
      normal: 'Damit sind E-Mails, Webaufrufe oder andere Datenströme an Dritte gemeint.',
      specialist: 'Möglichkeit zur Datenweitergabe oder Aktivierung externer Kanäle.',
    },
  },
  tools: {
    label: {
      normal: 'Welche Werkzeuge nutzt die KI?',
      specialist: 'Werkzeuge',
    },
    hilfe: {
      normal: 'Werkzeuge machen einen Use-Case deutlich riskanter, weil sie Daten bewegen oder Aktionen auslösen.',
      specialist: 'Liste der verwendeten Werkzeuge und Integrationen.',
    },
    optionen: {
      websuche: { normal: 'Im Internet suchen', specialist: 'Websuche' },
      dateizugriff: { normal: 'Auf Dateien zugreifen', specialist: 'Dateizugriff' },
      email_senden: { normal: 'E-Mails verschicken', specialist: 'E-Mail senden' },
      code_ausfuehren: { normal: 'Code ausführen', specialist: 'Code ausführen' },
      datenbank_lesen: { normal: 'Datenbank lesen', specialist: 'Datenbank lesen' },
      datenbank_schreiben: { normal: 'Datenbank schreiben', specialist: 'Datenbank schreiben' },
      api_extern: { normal: 'Externe Dienste aufrufen', specialist: 'Externe API' },
      keine: { normal: 'Keine Werkzeuge', specialist: 'Keine' },
    },
  },
  autonomie: {
    label: {
      normal: 'Wie viel Entscheidungsspielraum hat die KI?',
      specialist: 'Autonomie',
    },
    hilfe: {
      normal: 'Je selbstständiger die KI handelt, desto höher sind Risiko und Pflicht.',
      specialist: 'Grad der Handlungsmacht der KI im Workflow.',
    },
    optionen: {
      vorschlag: {
        normal: 'Die KI schlägt nur vor, ein Mensch macht es',
        specialist: 'Vorschlag',
      },
      mit_freigabe: {
        normal: 'Die KI handelt, aber jemand bestätigt vorher',
        specialist: 'Mit Freigabe',
      },
      autonom: {
        normal: 'Die KI handelt selbstständig ohne Rückfrage',
        specialist: 'Autonom',
      },
    },
  },
  deployment: {
    label: {
      normal: 'Wo läuft die Lösung?',
      specialist: 'Deployment',
    },
    hilfe: {
      normal: 'Der Standort und die Betriebsform ändern später die Compliance-Anforderungen.',
      specialist: 'Betriebsmodell und Hosting-Umgebung.',
    },
    optionen: {
      consumer: {
        normal: 'Kostenloser oder privater Zugang (ChatGPT, Claude, Gemini im Browser)',
        specialist: 'Consumer',
      },
      saas_us: {
        normal: 'Geschäftlicher Dienst, Server außerhalb der EU',
        specialist: 'SaaS (US)',
      },
      saas_eu: {
        normal: 'Geschäftlicher Dienst mit EU-Rechenzentrum und Vertrag',
        specialist: 'SaaS (EU)',
      },
      self_hosted: {
        normal: 'Eigene Infrastruktur, Modell läuft bei uns',
        specialist: 'Self-hosted',
      },
    },
  },
  generiertOeffentlicheInhalte: {
    label: {
      normal: 'Entstehen dabei Inhalte, die veröffentlicht werden?',
      specialist: 'Generiert öffentliche Inhalte',
    },
    hilfe: {
      normal: 'Das betrifft Texte, Bilder, Video oder Audio, die nach außen gehen.',
      specialist: 'Die KI erzeugt Inhalte, die öffentlich sichtbar sind.',
    },
  },
  biometrisch: {
    label: {
      normal: 'Biometrische Identifizierung oder Kategorisierung',
      specialist: 'Biometrisch',
    },
    hilfe: {
      normal: null,
      specialist: 'Biometrische Verarbeitung oder Klassifikation.',
    },
  },
  emotionserkennung: {
    label: {
      normal: 'Emotionserkennung',
      specialist: 'Emotionserkennung',
    },
    hilfe: {
      normal: null,
      specialist: 'Erkennen oder ableiten von Emotionen aus Daten.',
    },
  },
} as const

export const sektionsTexte = {
  sonderfaelle: {
    normal:
      'Falls in eurem Fall Gesichtserkennung, biometrische Identifizierung oder Emotionsanalyse eine Rolle spielt: Diese Fälle unterliegen besonderen Regeln. Wechsle dafür in den Specialist-Modus oder wende dich an das AI Security Chapter.',
    specialist: null,
  },
}
