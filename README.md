# AI Security Score

Ein Browser-Tool, das für einen geplanten KI-Anwendungsfall zwei Dinge einschätzt:

1. **Exposure** — wie riskant der Einsatz aus Security-Sicht ist (Prompt-Injection-Angriffsfläche, Lethal-Trifecta-Kombination, OWASP-Top-10-für-LLM-Treffer).
2. **AI Act** — welche EU-AI-Act-Klasse (verboten / Hochrisiko / Transparenzpflicht / minimal / Grenzfall) wahrscheinlich zutrifft und welche Pflichten daraus folgen.

Alle Angaben werden ausschließlich im Browser verarbeitet. Es gibt keine Server- oder Datenbank-Persistenz für Use-Case-Inhalte (siehe Datenschutzhinweis in der App).

## Was das Tool nicht ist

- **Keine Rechtsberatung.** Die AI-Act-Klassifikation ist eine vorläufige Einordnung auf Basis der eingegebenen Angaben, keine juristische Prüfung. Grenzfälle werden explizit als solche ausgewiesen statt als sichere Antwort behauptet.
- **Keine Bedrohungsmodellierung, kein Penetrationstest, keine Risikoanalyse nach ISO 27005.** Die Exposure-Bewertung ist eine Heuristik mit fachlich gesetzten, nicht empirisch validierten Gewichten.
- **Keine vollständige Abdeckung des AI Act.** GPAI-Pflichten (Art. 53 ff.), Konformitätsbewertungsverfahren, Anhang-I-Produkte sowie mehrere Verbotstatbestände (Social Scoring, Manipulation, Echtzeit-Fernidentifizierung, Predictive Policing, ungezieltes Gesichtsbild-Scraping) lassen sich aus den erfassten Feldern nicht ableiten und werden im Specialist-Modus als Selbstprüfungs-Hinweis aufgelistet, nicht automatisch bewertet.

Bei Unsicherheit: AI Security Chapter konsultieren, bevor auf Basis dieses Tools entschieden wird.

## Lokal starten

Voraussetzung: Node.js (aktuelle LTS-Version) und npm.

```bash
npm install
npm run dev       # Entwicklungsserver mit Hot Reload
```

Weitere Skripte:

```bash
npm run build      # Typprüfung (tsc -b) + Produktions-Build (vite build)
npm run test        # Tests einmalig ausführen (vitest run)
npm run lint         # ESLint
npm run preview      # Produktions-Build lokal ansehen
```

## Aufbau

- `src/types.ts` — `UseCase`-Datenmodell, das durch die gesamte App gereicht wird.
- `src/exposure.ts` — Sicherheits-Bewertungslogik (Lethal-Trifecta-Hard-Rule, gewichtete Faktoren, OWASP-Mapping).
- `src/aiact.ts` — EU-AI-Act-Klassifikation (Entscheidungsbaum, Pflichtenkatalog, Erfüllungsgrad).
- `src/securityScenarios.ts` — acht durchgerechnete Beispiel-Use-Cases für die Bibliothek.
- `src/tabs/` — je Tab eine Komponente (`StartTab`, `UseCaseTab`, `ExposureTab`, `ComplianceTab`, `BibliothekTab`, `MethodikTab`).
- `src/*.test.ts` — Tests für die Bewertungslogik (`vitest`).

Jeder Tab hat einen **Normal**- und einen **Specialist**-Modus (Umschalter in der Sidebar): Normal zeigt Ampel/Klartext ohne Fachbegriffe, Specialist zeigt die vollständige Herleitung inklusive aller Gewichte, Schwellen und Artikelverweise. Die komplette Methodik — alle Konstanten live aus `exposure.ts` und `aiact.ts` ausgelesen, nicht dupliziert — steht im Methodik-Tab.

## Stand

Die AI-Act-Bewertung bezieht sich auf Verordnung (EU) 2024/1689. Die Verordnung ist in Änderung begriffen (Digital-Omnibus-Diskussion um Fristverschiebungen) — Fristen vor einer Entscheidung stets aktuell prüfen.
