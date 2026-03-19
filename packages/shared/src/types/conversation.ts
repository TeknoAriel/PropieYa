import { type UUID, type Timestamp } from './common'
import { type SearchFilters } from './search'

/**
 * Estado de la conversación
 */
export type ConversationStatus =
  | 'active' // En curso
  | 'completed' // Terminada (usuario encontró lo que buscaba)
  | 'abandoned' // Abandonada (timeout)
  | 'converted' // Convertida a lead

/**
 * Rol en el mensaje
 */
export type MessageRole = 'user' | 'assistant' | 'system'

/**
 * Tipo de mensaje del asistente
 */
export type AssistantMessageType =
  | 'greeting' // Saludo inicial
  | 'clarification' // Pidiendo aclaración
  | 'confirmation' // Confirmando interpretación
  | 'results' // Mostrando resultados
  | 'refinement' // Proponiendo refinamiento
  | 'explanation' // Explicando match
  | 'fallback' // No entendió, ofreciendo alternativas
  | 'goodbye' // Despedida

/**
 * Intención extraída del usuario
 */
export interface ExtractedIntent {
  // Filtros estructurados extraídos
  filters: Partial<SearchFilters>

  // Confianza de la extracción (0-1)
  confidence: number

  // Atributos cualitativos no mapeables a filtros directamente
  qualitative: QualitativeAttribute[]

  // Lo que el sistema entendió en lenguaje natural
  summary: string

  // Campos ambiguos que requieren clarificación
  ambiguous?: AmbiguousField[]
}

/**
 * Atributos cualitativos (no discretizables en filtros)
 */
export interface QualitativeAttribute {
  attribute: string // "luminoso", "tranquilo", "moderno", etc.
  importance: 'must_have' | 'nice_to_have' | 'preference'
  originalText: string // Texto original del usuario
}

/**
 * Campo ambiguo que necesita clarificación
 */
export interface AmbiguousField {
  field: string
  possibleValues: string[]
  question: string // Pregunta para clarificar
}

/**
 * Mensaje de conversación
 */
export interface ConversationMessage {
  id: UUID
  conversationId: UUID
  role: MessageRole
  content: string
  messageType?: AssistantMessageType
  extractedIntent?: ExtractedIntent
  searchId?: string // Si este mensaje disparó una búsqueda
  metadata?: Record<string, unknown>
  createdAt: Timestamp
}

/**
 * Conversación completa
 */
export interface Conversation {
  id: UUID
  userId: UUID | null // null si es anónimo
  sessionId: UUID
  status: ConversationStatus

  // Estado actual de la búsqueda derivada de la conversación
  currentFilters: SearchFilters
  currentIntent?: ExtractedIntent

  // Contexto acumulado
  context: ConversationContext

  // Métricas
  messageCount: number
  searchCount: number
  refinementCount: number

  // Timestamps
  createdAt: Timestamp
  updatedAt: Timestamp
  completedAt?: Timestamp
}

/**
 * Contexto acumulado de la conversación
 */
export interface ConversationContext {
  // Preferencias explícitas detectadas
  preferences: {
    mustHave: string[]
    niceToHave: string[]
    dealBreakers: string[]
  }

  // Propiedades mencionadas/vistas en esta conversación
  mentionedListings: string[]
  viewedListings: string[]
  likedListings: string[]
  dislikedListings: string[]

  // Zonas mencionadas
  mentionedNeighborhoods: string[]

  // Rangos de precio discutidos
  priceDiscussions: Array<{
    min?: number
    max?: number
    flexibility?: 'strict' | 'flexible'
  }>

  // Resumen de lo que sabemos del usuario
  userSummary?: string
}

/**
 * Sugerencia de refinamiento
 */
export interface RefinementSuggestion {
  id: string
  type: 'add_filter' | 'modify_filter' | 'remove_filter' | 'expand_search'
  label: string // Texto para mostrar al usuario
  description?: string
  filter: Partial<SearchFilters>
  impact?: {
    currentCount: number
    newCount: number
  }
}

/**
 * Chips de sugerencia para la UI
 */
export interface ConversationChip {
  id: string
  text: string
  action: 'send_message' | 'apply_filter' | 'view_results'
  payload: string | Partial<SearchFilters>
}

/**
 * Response del motor conversacional
 */
export interface ConversationResponse {
  message: ConversationMessage
  searchResults?: {
    searchId: string
    totalCount: number
    topResults: number // Cuántos mostrar inline
  }
  refinements?: RefinementSuggestion[]
  chips?: ConversationChip[]
  shouldShowFilters?: boolean
  nextAction?: 'wait_input' | 'show_results' | 'ask_clarification'
}

/**
 * Request al motor conversacional
 */
export interface ConversationRequest {
  conversationId?: string // null para nueva conversación
  message: string
  userId?: string
  sessionId: string
  context?: {
    currentUrl?: string
    viewingListing?: string
    previousSearchId?: string
  }
}
