import { describe, expect, it } from 'vitest'
import { getNutriScoreSteps } from './nutriScoreLabel'

describe('getNutriScoreSteps', () => {
  it('highlights the current score and dims the others', () => {
    const steps = getNutriScoreSteps('C')

    expect(steps.find((step) => step.letter === 'C')?.active).toBe(true)
    expect(steps.filter((step) => step.active)).toHaveLength(1)
    expect(steps.find((step) => step.letter === 'A')?.opacity).toBe(0.4)
    expect(steps.find((step) => step.letter === 'C')?.opacity).toBe(1)
  })
})
