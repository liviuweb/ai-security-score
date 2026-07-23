import type { UseCase } from '../types'

interface ExposureTabProps {
  useCase: UseCase
}

export function ExposureTab({ useCase }: ExposureTabProps) {
  return (
    <section>
      <h2>Exposure</h2>
      <p>Dieser Bereich wird in späteren Blöcken mit der Risiko-Analyse gefüllt.</p>
      <p>Datenklasse: {useCase.datenklasse}</p>
    </section>
  )
}
