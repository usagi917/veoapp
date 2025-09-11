import { GoogleGenAI, GenerateVideosOperation } from '@google/genai'
export const dynamic = 'force-dynamic'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const client = new GoogleGenAI({
  apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const operationId = searchParams.get('operationId')

    if (!operationId) {
      return NextResponse.json(
        { error: 'Operation ID is required' },
        { status: 400 }
      )
    }

    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured' },
        { status: 500 }
      )
    }

    // Get operation status (typed)
    const op = new GenerateVideosOperation()
    op.name = operationId
    const operation = await client.operations.getVideosOperation({ operation: op })

    let status = 'processing'
    let progress = 50

    if (operation.done) {
      if (operation.error) {
        status = 'error'
        progress = 0
      } else {
        status = 'completed'
        progress = 100
      }
    } else {
      // Estimate progress based on elapsed time (best-effort)
      const metadata = operation.metadata as Record<string, unknown> | undefined
      const createTimeStr = typeof metadata?.createTime === 'string' ? metadata.createTime : undefined
      if (createTimeStr) {
        const createTime = new Date(createTimeStr).getTime()
        const now = Date.now()
        const elapsed = now - createTime
        const estimatedTotal = 5 * 60 * 1000 // 5 minutes estimated
        progress = Math.min(95, Math.max(10, (elapsed / estimatedTotal) * 100))
      }
    }

    return NextResponse.json({
      status,
      progress: Math.round(progress),
      done: operation.done,
      error: operation.error?.message || null
    })

  } catch (error) {
    console.error('Error checking operation status:', error)
    return NextResponse.json(
      { error: 'Failed to check operation status' },
      { status: 500 }
    )
  }
}
