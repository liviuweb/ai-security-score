// Zentrale CO2-Formatierung für die gesamte UI. score.ts exportiert zwar bereits eine
// formatCo2Value(), darf aber laut Vorgabe nicht geändert werden — und ihre Ausgabe fällt für
// sehr kleine Werte auf "µg" zurück, was inkonsistent und für Laien kaum einzuordnen ist.
// Diese Funktion ersetzt formatCo2Value() an allen Anzeige-Stellen: nie µg, sondern
// durchgängig g / kg / t.
export function formatCo2(gram: number): string {
  if (gram <= 0) return '0 g'
  if (gram < 0.0005) return '< 0.01 g' // würde bei 3 Nachkommastellen irreführend "0.000 g" zeigen
  if (gram < 0.01) return `${gram.toFixed(3)} g`
  if (gram < 1000) return `${gram.toFixed(2)} g`
  if (gram < 1_000_000) return `${(gram / 1000).toFixed(2)} kg`
  return `${(gram / 1_000_000).toFixed(2)} t`
}

// score.ts baut den Begründungssatz (ScoreResult.explanation) bereits fertig-formatiert
// zusammen und nutzt dafür intern seine eigene formatCo2Value() — inklusive der "µg"-Fälle.
// Da score.ts nicht geändert werden darf, wird ein bereits fertiger Satz hier nachträglich
// korrigiert: "288 µg" (aus score.ts) wird zu demselben Format wie überall sonst in der UI.
const MICROGRAM_PATTERN = /([\d.]+)\s?µg/g

export function sanitizeCo2Text(text: string): string {
  return text.replace(MICROGRAM_PATTERN, (_match, numberPart: string) => {
    const micrograms = parseFloat(numberPart)
    return formatCo2(micrograms / 1_000_000)
  })
}
