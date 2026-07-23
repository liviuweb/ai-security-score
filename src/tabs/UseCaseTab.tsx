import type { UseCase } from '../types'

interface UseCaseTabProps {
  useCase: UseCase
  onChange: (value: UseCase) => void
}

export function UseCaseTab({ useCase, onChange }: UseCaseTabProps) {
  return (
    <section>
      <h2>Use-Case</h2>
      <p>Dieser Bereich wird in späteren Blöcken mit dem Formular gefüllt.</p>
      <pre>{JSON.stringify(useCase, null, 2)}</pre>
      <button type="button" onClick={() => onChange({ ...useCase, name: 'Beispiel-Use-Case' })}>
        Beispiel setzen
      </button>
    </section>
  )
}
