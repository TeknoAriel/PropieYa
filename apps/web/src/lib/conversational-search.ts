/**
 * Orquestador: intérprete (LLM + heurísticas) + pipeline de validación por catálogo.
 */

import {
  validateConversationalPipeline,
  type ConversationalPipelineDebug,
  type LocalityCatalogEntry,
} from '@propieya/shared'

import {
  extractIntentionFromMessage,
  type ConversationPrior,
  type ExtractedIntention,
} from './llm'

export type ConversationalOrchestratorResult = {
  intention: ExtractedIntention
  amenitiesMatchMode: 'preferred' | 'strict'
  pipelineDebug: ConversationalPipelineDebug
}

export async function runConversationalSearchOrchestrator(
  message: string,
  previous?: ConversationPrior | null,
  options?: { localityCatalog?: readonly LocalityCatalogEntry[] }
): Promise<ConversationalOrchestratorResult> {
  const trimmed = message.trim()
  const preliminary = await extractIntentionFromMessage(trimmed, previous ?? undefined)
  const { extracted, amenitiesMatchMode, debug } = validateConversationalPipeline(
    trimmed,
    preliminary,
    { localityCatalog: options?.localityCatalog }
  )
  return {
    intention: extracted as ExtractedIntention,
    amenitiesMatchMode,
    pipelineDebug: debug,
  }
}
