import { NextResponse } from 'next/server'

/**
 * Estado público del asistente (sin exponer secretos).
 * El cliente usa esto para mostrar si la extracción usa OpenAI o solo reglas locales.
 */
export async function GET() {
  const openAiConfigured = Boolean(process.env.OPENAI_API_KEY?.trim())
  return NextResponse.json({
    openAiConfigured,
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
  })
}
