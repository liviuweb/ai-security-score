import type { UseCase } from '../types'

interface BibliothekTabProps {
  onLoad: (uc: UseCase) => void
}

export function BibliothekTab({ onLoad }: BibliothekTabProps) {
  return (
    <section>
      <h2>Bibliothek</h2>
      <p>Diese Bibliothek wird in späteren Blöcken mit Beispiel-Use-Cases gefüllt.</p>
      <button
        type="button"
        onClick={() =>
          onLoad({
            id: 'sample-1',
            name: 'Beispiel aus der Bibliothek',
            beschreibung: 'Beispiel-Use-Case für die nächste Iteration.',
            datenklasse: 'vertraulich',
            untrustedInput: true,
            externeKommunikation: true,
            tools: ['websuche', 'api_extern'],
            autonomie: 'mit_freigabe',
            deployment: 'saas_eu',
            betroffene: 10,
            domaene: 'support',
            generiertOeffentlicheInhalte: false,
            biometrisch: false,
            emotionserkennung: false,
            kontrollen: [],
          })
        }
      >
        Beispiel laden
      </button>
    </section>
  )
}
