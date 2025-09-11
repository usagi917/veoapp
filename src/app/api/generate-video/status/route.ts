import { GoogleGenAI } from '@google/genai'
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

    // Get operation status
    const operation = await client.operations.get(operationId)

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
      // Estimate progress based on elapsed time
      const metadata = operation.metadata
      if (metadata?.createTime) {
        const createTime = new Date(metadata.createTime).getTime()
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
