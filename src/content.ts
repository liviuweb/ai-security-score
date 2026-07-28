export const feldTexte = {
  name: {
    label: {
      basis: 'Wie heißt der Anwendungsfall?',
      standard: 'Name des Anwendungsfalls',
      experte: 'Name / Kurzbezeichnung',
    },
    hilfe: {
      basis: 'Ein prägnanter Name hilft später beim Vergleich und in der Bibliothek.',
      standard: null,
      experte: null,
    },
  },
  beschreibung: {
    label: {
      basis: 'Was macht die KI hier konkret?',
      standard: 'Beschreibung der Aufgabe',
      experte: 'Beschreibung',
    },
    hilfe: {
      basis: 'Beschreibe die Aufgabe in Alltagssprache, nicht nur in Fachbegriffen.',
      standard: 'Beschreibt kurz, was die KI in diesem Use-Case konkret tut.',
      experte: 'Kurzbeschreibung des Use-Cases und der relevanten Aufgabe.',
    },
  },
  domaene: {
    label: {
      basis: 'In welchem Bereich wird das eingesetzt?',
      standard: 'In welchem Bereich (Domäne) wird die KI eingesetzt?',
      experte: 'Domäne',
    },
    hilfe: {
      basis: 'Der Bereich beeinflusst, wie schnell ein Fehler nach außen dringt.',
      standard: 'Die Domäne beeinflusst, wie schnell ein Vorfall nach außen sichtbar wird.',
      experte: null,
    },
    optionen: {
      redaktion: { basis: 'Redaktion & Content', standard: 'Redaktion & Content', experte: 'Redaktion' },
      hr: { basis: 'Personal & Bewerbung', standard: 'HR / Personal', experte: 'HR' },
      support: { basis: 'Kundenservice', standard: 'Kundenservice / Support', experte: 'Support' },
      marketing: { basis: 'Marketing', standard: 'Marketing', experte: 'Marketing' },
      entwicklung: { basis: 'Softwareentwicklung', standard: 'Softwareentwicklung', experte: 'Entwicklung' },
      verwaltung: { basis: 'Interne Verwaltung', standard: 'Interne Verwaltung', experte: 'Verwaltung' },
      sonstiges: { basis: 'Sonstiges', standard: 'Sonstiges', experte: 'Sonstiges' },
    },
  },
  datenklasse: {
    label: {
      basis: 'Welche Art von Daten verarbeitet die KI?',
      standard: 'Welche Art von Daten (Datenklasse) verarbeitet die KI?',
      experte: 'Datenklasse',
    },
    hilfe: {
      basis: 'Je sensibler die Daten, desto schwerer wiegt ein Fehler — und desto mehr Regeln greifen.',
      standard: 'Die Datenklassifikation bestimmt, wie streng die Anforderungen sind — von öffentlich bis besonders sensibel.',
      experte: 'Datenklassifikation nach Sensitivität und Schutzbedarf.',
    },
    optionen: {
      oeffentlich: {
        basis: 'Nichts Vertrauliches, z. B. veröffentlichte Texte',
        standard: 'Öffentlich — nichts Vertrauliches, z. B. veröffentlichte Texte',
        experte: 'Öffentlich',
      },
      intern: {
        basis: 'Interne Unterlagen, aber keine Personendaten',
        standard: 'Intern — interne Unterlagen ohne Personendaten',
        experte: 'Intern',
      },
      vertraulich: {
        basis: 'Geschäftsgeheimnisse, Verträge, unveröffentlichte Inhalte',
        standard: 'Vertraulich — Geschäftsgeheimnisse, Verträge, unveröffentlichte Inhalte',
        experte: 'Vertraulich',
      },
      personenbezogen: {
        basis: 'Namen, Kontaktdaten, Bewerbungen, Kundendaten',
        standard: 'Personenbezogen — Namen, Kontaktdaten, Bewerbungen, Kundendaten',
        experte: 'Personenbezogen',
      },
      besondere_kategorien: {
        basis: 'Gesundheit, Herkunft, Religion, Gewerkschaft, Sexualleben oder biometrische Daten',
        standard: 'Besondere Kategorien — Gesundheit, Herkunft, Religion, Gewerkschaft, Sexualleben oder biometrische Daten',
        experte: 'Besondere Kategorien',
      },
    },
  },
  betroffene: {
    label: {
      basis: 'Wie viele Menschen sind betroffen, wenn hier etwas schiefgeht?',
      standard: 'Wie viele Personen sind betroffen (Reichweite)?',
      experte: 'Betroffene Personen',
    },
    hilfe: {
      basis: 'Die Zahl hilft später bei der Einordnung von Wirkung und Verantwortung.',
      standard: 'Die Reichweite beeinflusst, wie schwer ein Vorfall wiegt.',
      experte: 'Anzahl der betroffenen Personen oder Datensätze.',
    },
  },
  untrustedInput: {
    label: {
      basis: 'Verarbeitet die KI Inhalte, die von außen kommen?',
      standard: 'Verarbeitet die KI nicht vertrauenswürdige Inhalte (Untrusted Input)?',
      experte: 'Untrusted Input im Kontextfenster',
    },
    hilfe: {
      basis: 'Solche Inhalte können versteckte Anweisungen enthalten, die die KI ausführt, ohne dass jemand es merkt.',
      standard: 'Untrusted Input kann versteckte Anweisungen enthalten — Stichwort Prompt Injection.',
      experte: 'Eingaben aus externen Quellen, die nicht vollständig kontrolliert sind.',
    },
  },
  externeKommunikation: {
    label: {
      basis: 'Kann die KI etwas nach außen schicken?',
      standard: 'Hat die KI einen Kanal nach außen (externe Kommunikation)?',
      experte: 'External Communication / Exfiltrationskanal',
    },
    hilfe: {
      basis: 'Damit sind E-Mails, Webaufrufe oder andere Datenströme an Dritte gemeint.',
      standard: 'Ein Exfiltrationskanal — z. B. E-Mail oder Webaufruf — kann Daten unbemerkt nach außen tragen.',
      experte: 'Möglichkeit zur Datenweitergabe oder Aktivierung externer Kanäle.',
    },
  },
  tools: {
    label: {
      basis: 'Welche Werkzeuge nutzt die KI?',
      standard: 'Welche Werkzeuge (Tools) nutzt die KI?',
      experte: 'Werkzeuge',
    },
    hilfe: {
      basis: 'Werkzeuge machen einen Use-Case deutlich riskanter, weil sie Daten bewegen oder Aktionen auslösen.',
      standard: 'Tools erhöhen das Risiko, weil sie Daten bewegen oder Aktionen auslösen können.',
      experte: 'Liste der verwendeten Werkzeuge und Integrationen.',
    },
    optionen: {
      websuche: { basis: 'Im Internet suchen', standard: 'Websuche — im Internet suchen', experte: 'Websuche' },
      dateizugriff: { basis: 'Auf Dateien zugreifen', standard: 'Dateizugriff — auf Dateien zugreifen', experte: 'Dateizugriff' },
      email_senden: { basis: 'E-Mails verschicken', standard: 'E-Mail senden — E-Mails verschicken', experte: 'E-Mail senden' },
      code_ausfuehren: { basis: 'Code ausführen', standard: 'Code ausführen', experte: 'Code ausführen' },
      datenbank_lesen: { basis: 'Datenbank lesen', standard: 'Datenbank lesen', experte: 'Datenbank lesen' },
      datenbank_schreiben: { basis: 'Datenbank schreiben', standard: 'Datenbank schreiben', experte: 'Datenbank schreiben' },
      api_extern: { basis: 'Externe Dienste aufrufen', standard: 'Externe API — externe Dienste aufrufen', experte: 'Externe API' },
      keine: { basis: 'Keine Werkzeuge', standard: 'Keine Werkzeuge', experte: 'Keine' },
    },
  },
  autonomie: {
    label: {
      basis: 'Wie viel Entscheidungsspielraum hat die KI?',
      standard: 'Wie viel Autonomie hat die KI?',
      experte: 'Autonomie',
    },
    hilfe: {
      basis: 'Je selbstständiger die KI handelt, desto höher sind Risiko und Pflicht.',
      standard: 'Der Autonomiegrad bestimmt, wie viel Risiko und Pflicht auf euch zukommen.',
      experte: 'Grad der Handlungsmacht der KI im Workflow.',
    },
    optionen: {
      vorschlag: {
        basis: 'Die KI schlägt nur vor, ein Mensch macht es',
        standard: 'Vorschlag — die KI schlägt nur vor, ein Mensch entscheidet',
        experte: 'Vorschlag',
      },
      mit_freigabe: {
        basis: 'Die KI handelt, aber jemand bestätigt vorher',
        standard: 'Mit Freigabe — die KI handelt nach Bestätigung',
        experte: 'Mit Freigabe',
      },
      autonom: {
        basis: 'Die KI handelt selbstständig ohne Rückfrage',
        standard: 'Autonom — die KI handelt ohne Rückfrage',
        experte: 'Autonom',
      },
    },
  },
  deployment: {
    label: {
      basis: 'Wo läuft die Lösung?',
      standard: 'Wo läuft die Lösung (Deployment)?',
      experte: 'Deployment',
    },
    hilfe: {
      basis: 'Der Standort und die Betriebsform ändern später die Compliance-Anforderungen.',
      standard: 'Deployment-Art und Standort ändern, welche Compliance-Anforderungen greifen.',
      experte: 'Betriebsmodell und Hosting-Umgebung.',
    },
    optionen: {
      consumer: {
        basis: 'Kostenloser oder privater Zugang (ChatGPT, Claude, Gemini im Browser)',
        standard: 'Consumer — kostenloser oder privater Zugang (ChatGPT, Claude, Gemini im Browser)',
        experte: 'Consumer',
      },
      saas_us: {
        basis: 'Geschäftlicher Dienst, Server außerhalb der EU',
        standard: 'SaaS (US) — geschäftlicher Dienst, Server außerhalb der EU',
        experte: 'SaaS (US)',
      },
      saas_eu: {
        basis: 'Geschäftlicher Dienst mit EU-Rechenzentrum und Vertrag',
        standard: 'SaaS (EU) — geschäftlicher Dienst mit EU-Rechenzentrum und Vertrag',
        experte: 'SaaS (EU)',
      },
      self_hosted: {
        basis: 'Eigene Infrastruktur, Modell läuft bei uns',
        standard: 'Self-hosted — eigene Infrastruktur, Modell läuft bei uns',
        experte: 'Self-hosted',
      },
    },
  },
  generiertOeffentlicheInhalte: {
    label: {
      basis: 'Entstehen dabei Inhalte, die veröffentlicht werden?',
      standard: 'Generiert die KI Inhalte, die veröffentlicht werden?',
      experte: 'Generiert öffentliche Inhalte',
    },
    hilfe: {
      basis: 'Das betrifft Texte, Bilder, Video oder Audio, die nach außen gehen.',
      standard: 'Gemeint sind Texte, Bilder, Video oder Audio, die veröffentlicht werden.',
      experte: 'Die KI erzeugt Inhalte, die öffentlich sichtbar sind.',
    },
  },
  biometrisch: {
    label: {
      basis: 'Werden Gesichter oder andere biometrische Merkmale erkannt?',
      standard: 'Biometrische Identifizierung oder Kategorisierung',
      experte: 'Biometrisch',
    },
    hilfe: {
      basis: null,
      standard: 'Biometrische Verarbeitung unterliegt besonders strengen Regeln.',
      experte: 'Biometrische Verarbeitung oder Klassifikation.',
    },
  },
  emotionserkennung: {
    label: {
      basis: 'Erkennt oder wertet die KI Emotionen aus?',
      standard: 'Emotionserkennung',
      experte: 'Emotionserkennung',
    },
    hilfe: {
      basis: null,
      standard: 'Emotionserkennung ist in vielen Kontexten gesetzlich eingeschränkt.',
      experte: 'Erkennen oder ableiten von Emotionen aus Daten.',
    },
  },
} as const

export const sektionsTexte = {
  sonderfaelle: {
    basis:
      'Falls in eurem Fall Gesichtserkennung, biometrische Identifizierung oder Emotionsanalyse eine Rolle spielt: Diese Fälle unterliegen besonderen Regeln. Wechsle dafür in den Experte-Modus oder wende dich an das AI Security Chapter.',
    standard:
      'Bei Gesichtserkennung, biometrischer Identifizierung oder Emotionsanalyse gelten besondere Regeln — wechselt dafür in den Experte-Modus oder fragt das AI Security Chapter.',
    experte: null,
  },
}
