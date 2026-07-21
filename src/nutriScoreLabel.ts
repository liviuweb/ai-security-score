export type NutriScoreLetter = 'A' | 'B' | 'C' | 'D' | 'E'

export interface NutriScoreStep {
  letter: NutriScoreLetter
  active: boolean
  opacity: number
  color: string
}

export const colors: Record<NutriScoreLetter, string> = {
  A: '#1b5e20',
  B: '#66bb6a',
  C: '#fdd835',
  D: '#fb8c00',
  E: '#e53935',
}

export function getNutriScoreSteps(currentLetter: NutriScoreLetter): NutriScoreStep[] {
  return (['A', 'B', 'C', 'D', 'E'] as NutriScoreLetter[]).map((letter) => ({
    letter,
    active: letter === currentLetter,
    opacity: letter === currentLetter ? 1 : 0.4,
    color: colors[letter],
  }))
}
