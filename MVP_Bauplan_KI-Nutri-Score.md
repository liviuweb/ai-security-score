# KI-Nutri-Score — MVP-Bauplan für VS Code (Claude Code)

> **Zweck dieses Dokuments:** In einem neuen Chat mit der Claude-Erweiterung in VS Code direkt loslegen können, ohne Kontext neu zu erklären. Enthält Projektkontext, exakte Produktdefinition, Tech-Stack, Architektur, Datenmodell, Build-Reihenfolge und die ethischen Leitplanken.

---

## 0. So nutzt du dieses Dokument

1. Lege einen neuen Projektordner an, z. B. `ki-nutri-score/`.
2. Speichere dieses Dokument als `BAUPLAN.md` im Projektordner.
3. Starte Claude Code in VS Code und sag sinngemäß:
   *„Lies BAUPLAN.md. Wir bauen den MVP Abschnitt für Abschnitt. Fang mit Schritt 1 (Projekt-Setup) an und halte dich an den definierten Scope — keine Features, die unter ‚Bewusst NICHT im MVP' stehen."*
4. Geh die Build-Reihenfolge (Abschnitt 7) der Reihe nach durch. Lass dir nach jedem Schritt zeigen, dass es läuft, bevor ihr weitermacht.

---

## 1. Projektkontext (Kurzfassung)

- **Studienprojekt** „Der blinde Fleck" (Interactive Media Products, TH Köln). Team 11: Joash Koshan, Christian Dedy, Livius Kahlo.
- **Kernthese des Projekts:** Generative KI erzeugt eine Oberfläche, die etwas vortäuscht, während die Realität (z. B. Umweltkosten) verborgen bleibt. Das Produkt soll sichtbar machen, was KI verbirgt.
- **Produkt:** **KI-Nutri-Score** — ein Label, das nicht nur zeigt, *ob* KI genutzt wurde, sondern *ob die Nutzung im Verhältnis stand* (**Angemessenheit**, nicht nur Effizienz).
- **Abgrenzung zur Recherche:** Der „AI Energy Score" (Hugging Face / Salesforce) bewertet Modell-Effizienz für Entwickler. **Unsere Lücke:** Bewertung der **Angemessenheit einer einzelnen Nutzung** für **Endnutzer:innen**.
- **MVP-Fokus (für diesen Build):** der Strang **CO₂/Energie**. Die anderen Dimensionen (KI-Stimme, emotionale Bindung) bleiben konzeptionell, werden aber NICHT gebaut.

---

## 2. Was der MVP können muss (Kernfunktionen)

Aus den User Stories, die wir festgelegt haben:

1. **Score auf einen Blick:** Nutzerin sieht für eine KI-Nutzung einen Angemessenheits-Score (z. B. A–E, wie beim Lebensmittel-Nutri-Score).
2. **Score aufschlüsseln:** Nutzerin kann antippen/aufklappen, wie der Score zustande kommt (Energieaufwand, Aufgabentyp, Verhältnis) — Nachvollziehbarkeit statt Blackbox.
3. **Mit/ohne-KI-Vergleich:** Nutzerin sieht denselben Anwendungsfall mit und ohne (bzw. mit kleinem vs. großem Modell) — macht „Angemessenheit" greifbar.

**Leitidee des Scores:** Angemessenheit = **Verhältnis von Aufwand zu Nutzen der Aufgabe.** Eine Trivialfrage (»Wie spät ist es?«) an ein riesiges Modell ist *unangemessen* (schlechter Score), auch wenn das Modell „effizient" ist. Eine komplexe Analyse, die das große Modell wirklich braucht, kann *angemessen* sein (besserer Score) — gleicher Energieverbrauch, anderer Score. **Das ist der Kern, der uns vom AI Energy Score unterscheidet.**

---

## 3. Bewusst NICHT im MVP (Scope-Schutz)

Diese Punkte sind tabu für den ersten Build — sie verwässern den Test oder kosten zu viel Zeit:

- ❌ Echte Live-Messung von CO₂ pro Anfrage (gibt es nicht öffentlich → wir schätzen transparent, siehe Abschnitt 5).
- ❌ Login / Nutzerkonten / Verlauf über Zeit.
- ❌ Anbieter-Self-Service / automatische Label-Erzeugung aus echten Modelldaten.
- ❌ Die Dimensionen Stimme & emotionale Bindung.
- ❌ Datenbank-Backend, Cloud, Deployment-Pipeline. (Erst lokal lauffähig machen.)
- ❌ Gamification, Punkte sammeln, Social Sharing.

> Wenn im Bau die Versuchung aufkommt, eins davon „schnell mitzunehmen": nicht. Lieber Kernfunktion solide.

---

## 4. Tech-Stack (bewusst einfach gehalten)

Ziel: in begrenzter Zeit lauffähig, gut demonstrierbar, ohne Backend-Komplexität.

- **Framework:** React + Vite (schnelles Setup, lokal lauffähig mit `npm run dev`).
- **Sprache:** TypeScript (Typsicherheit hilft beim sauberen Score-Modell; falls Team JS bevorzugt, ist JS auch ok).
- **Styling:** Tailwind CSS (schnell, konsistent) — oder einfache CSS-Module, falls Team das lieber mag.
- **State:** lokaler React-State (useState/useReducer). Keine externe State-Library nötig.
- **Daten:** statische JSON/TS-Datei mit Beispiel-Szenarien und den Schätz-Parametern. Kein Server.
- **Charts (optional):** nur wenn nötig, leichtgewichtig (z. B. ein einfacher Balken in reinem CSS statt Charting-Library).

> Begründung im Doku festhalten, falls die Dozierenden fragen: Der MVP testet die **Nutzer-Reaktion auf den Score**, nicht die technische Skalierung. Deshalb bewusst kein Backend.

---

## 5. Der Score: wie „Angemessenheit" berechnet wird

**Wichtig (Ehrlichkeitsprinzip):** Wir messen nicht live. Wir **schätzen transparent** aus veröffentlichten Größen und **deklarieren das offen** im UI („Schätzung auf Basis von …"). So ist der Score *echt berechnet* (kein Fake) und trotzdem machbar.

### 5.1 Eingangsgrößen pro Szenario
- `aufgabentyp` — z. B. Trivialfrage, Faktenfrage, kreatives Schreiben, komplexe Analyse, Code.
- `modellklasse` — z. B. klein / mittel / groß (stellvertretend für Parameterzahl).
- `geschaetzte_tokens` — grobe Ausgabelänge.
- `energie_pro_1k_tokens_wh` — Schätzwert aus Literatur/öffentlichen Angaben (als Parameter, klar als Schätzung markiert).

### 5.2 Zwei Achsen
- **Aufwand (Kosten):** abgeleitet aus Modellklasse × Tokens × Energie-pro-Token → grobe Wh- bzw. CO₂-Schätzung (Wh × Emissionsfaktor Strommix).
- **Nutzen (Wert der Aufgabe):** wie sehr die Aufgabe das gewählte Modell *rechtfertigt*. Trivialfrage = niedriger Nutzen-Score; komplexe Analyse, die das Modell wirklich braucht = hoher Nutzen-Score.

### 5.3 Angemessenheit = Verhältnis
- Score = Funktion von (Nutzen relativ zum Aufwand).
- **Hoher Aufwand bei niedrigem Nutzen → schlechter Score (z. B. E).**
- **Aufwand passend zum Nutzen → guter Score (z. B. A/B).**
- Mapping auf Buchstaben A–E (analog Lebensmittel-Nutri-Score) mit zugehöriger Farbe.

> Konkrete Formel im neuen Chat gemeinsam festlegen — sie muss simpel und nachvollziehbar sein, nicht wissenschaftlich perfekt. Wichtig ist, dass man im UI **sieht, warum** ein Score so ausfällt. Alle Faktoren als gut dokumentierte Konstanten in einer Datei, mit Quellenkommentar.

### 5.4 Quellen-Hinweis
Energie-/CO₂-Schätzwerte aus öffentlich zugänglichen Angaben (z. B. AI Energy Score als Referenz, publizierte Studien zu Energie pro Token). **Im neuen Chat zu Beginn die aktuellen Zahlen recherchieren und als Quelle hinterlegen** — nicht aus dem Gedächtnis raten. Im UI ein sichtbarer „Methodik / Quellen"-Hinweis.

---

## 6. Aufbau der Oberfläche (Screens & Komponenten)

Eine einzige Seite (Single-Page), drei logische Bereiche:

### 6.1 Eingabe / Szenario-Auswahl
- Nutzerin wählt ein vorbereitetes **Szenario** (Dropdown oder Karten): z. B. „Wie spät ist es?", „Fasse diesen 20-Seiten-Bericht zusammen", „Schreib mir ein Gedicht", „Analysiere diesen Datensatz".
- Optional: Modellklasse umschaltbar (klein/mittel/groß), damit der Vergleich erlebbar wird.

### 6.2 Score-Anzeige (Kernfunktion 1)
- Großes **Nutri-Score-Label A–E** mit Farbskala (grün → rot).
- Kurztext: was dieser Score bedeutet.

### 6.3 Aufschlüsselung (Kernfunktion 2)
- Aufklappbar: die zwei Achsen (Aufwand / Nutzen) sichtbar, dazu die Schätz-Faktoren.
- Klartext-Erklärung: „Großes Modell für eine Trivialfrage → viel Aufwand, wenig Nutzen → Score E."
- Sichtbarer Methodik-/Quellen-Hinweis (Schätzung deklarieren).

### 6.4 Vergleich (Kernfunktion 3)
- Gleiche Aufgabe nebeneinander: **kleines vs. großes Modell** (oder mit/ohne KI).
- Zeigt: gleicher Output-Zweck, aber unterschiedlicher Score → macht „Angemessenheit" greifbar.

### Komponentenstruktur (Vorschlag)
```
App
├─ ScenarioPicker        // Auswahl Szenario + Modellklasse
├─ ScoreCard             // großes A–E Label + Farbe
├─ ScoreBreakdown        // Aufwand/Nutzen-Achsen + Erklärung + Quellenhinweis
└─ ComparisonView        // zwei ScoreCards nebeneinander
```

### Datenmodell (Vorschlag)
```
type Aufgabentyp = 'trivial' | 'fakten' | 'kreativ' | 'analyse' | 'code';
type Modellklasse = 'klein' | 'mittel' | 'gross';

interface Szenario {
  id: string;
  titel: string;
  beispielPrompt: string;
  aufgabentyp: Aufgabentyp;
  geschaetzteTokens: number;
}

interface ScoreErgebnis {
  buchstabe: 'A'|'B'|'C'|'D'|'E';
  aufwandWh: number;       // geschätzt
  co2Gramm: number;        // geschätzt
  nutzenIndex: number;     // 0..1
  angemessenheit: number;  // 0..1, Basis für Buchstabe
  erklaerung: string;
}
```

---

## 7. Build-Reihenfolge (Schritt für Schritt im neuen Chat)

Jeder Schritt sollte lauffähig sein, bevor der nächste beginnt.

1. **Setup:** Vite-React-TS-Projekt anlegen, Tailwind einrichten, `npm run dev` läuft, leere App-Seite sichtbar.
2. **Daten & Score-Logik (ohne UI):** `scenarios.ts` mit 4–5 Szenarien + `score.ts` mit der Berechnungsfunktion. Mit ein paar `console.log`-Tests prüfen, dass die Buchstaben plausibel rauskommen.
3. **ScoreCard:** das A–E-Label visuell bauen (Farben, groß, klar). Statisch mit einem Beispielergebnis testen.
4. **ScenarioPicker:** Auswahl verdrahten → Score aktualisiert sich live.
5. **ScoreBreakdown:** Aufschlüsselung + Methodik-/Quellenhinweis.
6. **ComparisonView:** zwei Szenarien/Modellklassen nebeneinander.
7. **Feinschliff:** Texte, Farben am TH-/Projekt-Stil ausrichten, Responsivität, „Über die Methodik"-Hinweis.
8. **(Optional, falls Zeit) Demo-Politur:** ein, zwei besonders eindrückliche Szenarien für die Präsentation kuratieren.

> Erst wenn 1–6 stehen, über Optionales reden. Wenn die Zeit knapp wird: Schritte 1–4 ergeben schon einen vorführbaren Kern.

---

## 8. Ethische Leitplanken (müssen sichtbar eingehalten werden)

Das Produkt *ist* die Gegenbewegung zu dem, was es kritisiert. Im Code und UI konsequent:

- **Keine Dark Patterns:** keine manipulativen CTAs, kein künstlicher Druck, keine versteckten Voreinstellungen.
- **Kein Attention Capture:** keine Endlos-Scrolls, keine Suchtmechaniken, keine Benachrichtigungs-Tricks.
- **Transparente Daten:** der MVP sammelt **keine** Nutzerdaten. Falls später doch etwas erhoben wird, offen deklarieren.
- **Ehrlichkeit über den Score selbst:** der Score ist eine **transparente Schätzung**, kein gemessener Wert — das muss im UI stehen. Sonst wären wir genau die Blackbox, die wir kritisieren.
- **Nachvollziehbarkeit:** jede:r muss sehen können, *warum* ein Score so ausfällt (Kernfunktion 2 ist daher nicht optional).

---

## 9. Offene Punkte, die ihr im neuen Chat zuerst klären solltet

1. **Score-Formel konkret:** Wie genau wird aus Aufwand + Nutzen der Buchstabe? (gemeinsam festlegen, simpel halten)
2. **Aktuelle Energie-/CO₂-Schätzwerte recherchieren** und als Quelle hinterlegen (nicht raten).
3. **Zielgruppen-Entscheidung final?** (Nutzer = Endnutzer:innen, Kunde = Anbieter/Institutionen — Annahme aus Vorarbeit, bestätigen.)
4. **TS oder JS?** und **Tailwind oder CSS-Module?** — kurz im Team abstimmen.
5. **Welche 4–5 Szenarien** wollt ihr zeigen? Mindestens eins „klar unangemessen" (Trivialfrage + großes Modell) und eins „angemessen" (komplexe Aufgabe), damit der Kontrast sitzt.

---

## 10. Erster Satz für den neuen Chat (zum Kopieren)

> „Ich baue mit dir den MVP aus BAUPLAN.md (liegt im Projektordner) — einen funktionsfähigen KI-Nutri-Score in React/Vite. Lies zuerst BAUPLAN.md. Dann lass uns die offenen Punkte aus Abschnitt 9 klären (v. a. Score-Formel und aktuelle CO₂-Schätzwerte recherchieren), und danach gehen wir die Build-Reihenfolge aus Abschnitt 7 Schritt für Schritt durch. Halte dich strikt an den Scope — nichts aus ‚Bewusst NICHT im MVP'."
