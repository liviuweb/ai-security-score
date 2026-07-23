import type { UseCase } from '../types'

interface ComplianceTabProps {
  useCase: UseCase
}

export function ComplianceTab({ useCase }: ComplianceTabProps) {
  return (
    <section>
      <h2>Compliance</h2>
      <p>Dieser Bereich wird in späteren Blöcken mit der EU-AI-Act-Auswertung gefüllt.</p>
      <p>Autonomie: {useCase.autonomie}</p>
    </section>
  )
}
