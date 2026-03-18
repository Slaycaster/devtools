// Model pricing per 1M tokens (input)
export const MODEL_PRICES: Record<string, { label: string; inputPer1M: number; outputPer1M: number }> = {
  'gpt-4o': { label: 'GPT-4o', inputPer1M: 2.5, outputPer1M: 10 },
  'gpt-4o-mini': { label: 'GPT-4o Mini', inputPer1M: 0.15, outputPer1M: 0.6 },
  'gpt-4-turbo': { label: 'GPT-4 Turbo', inputPer1M: 10, outputPer1M: 30 },
  'claude-3-5-sonnet': { label: 'Claude 3.5 Sonnet', inputPer1M: 3, outputPer1M: 15 },
  'claude-3-5-haiku': { label: 'Claude 3.5 Haiku', inputPer1M: 0.8, outputPer1M: 4 },
  'claude-3-opus': { label: 'Claude 3 Opus', inputPer1M: 15, outputPer1M: 75 },
  'gemini-1-5-pro': { label: 'Gemini 1.5 Pro', inputPer1M: 1.25, outputPer1M: 5 },
  'gemini-1-5-flash': { label: 'Gemini 1.5 Flash', inputPer1M: 0.075, outputPer1M: 0.3 },
}

export function estimateCost(tokenCount: number, modelKey: string): { input: string; output: string } {
  const model = MODEL_PRICES[modelKey]
  if (!model) return { input: '—', output: '—' }
  const inputCost = (tokenCount / 1_000_000) * model.inputPer1M
  const outputCost = (tokenCount / 1_000_000) * model.outputPer1M
  const fmt = (n: number) => n < 0.001 ? '<$0.001' : `$${n.toFixed(4)}`
  return { input: fmt(inputCost), output: fmt(outputCost) }
}
