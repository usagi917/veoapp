import { GoogleGenAI } from '@google/genai'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const client = new GoogleGenAI({
  apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''
})

export async function POST(request: NextRequest) {
  try {
    const { image, prompt, aspectRatio, mimeType: bodyMimeType } = await request.json()

    if (!image || !prompt) {
      return NextResponse.json(
        { error: 'Image and prompt are required' },
        { status: 400 }
      )
    }

    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured' },
        { status: 500 }
      )
    }

    // Parse Data URL and determine mimeType robustly
    const dataUrlMatch = /^data:([^;]*);base64,(.*)$/.exec(image)
    const base64Data = dataUrlMatch?.[2] ?? image.split(',')[1]
    let mimeType = bodyMimeType || dataUrlMatch?.[1]

    if (!base64Data) {
      return NextResponse.json(
        { error: 'Invalid image payload' },
        { status: 400 }
      )
    }

    // Fallback: inspect first bytes to guess mime
    const buffer = Buffer.from(base64Data, 'base64')
    if (!mimeType || mimeType === '' || mimeType === 'application/octet-stream') {
      const header = buffer.subarray(0, 12)
      const isPng = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47
      const isJpeg = header[0] === 0xFF && header[1] === 0xD8
      const isHeic = header.includes(0x66) && header.includes(0x74) && header.includes(0x79) && header.includes(0x70) // 'ftyp'
      mimeType = isPng ? 'image/png' : isJpeg ? 'image/jpeg' : isHeic ? 'image/heic' : 'image/jpeg'
    }

    // Enhanced prompt with aspect ratio and quality settings
    const enhancedPrompt = `${prompt}. Create a high-quality 8-second video with smooth motion and realistic details. Aspect ratio: ${aspectRatio}.`

    console.log('Generating video with Veo 3...')

    // Generate video using Veo 3
    let operation = await client.models.generateVideos({
      model: 'veo-3.0-generate-001',
      source: {
        prompt: enhancedPrompt,
        image: {
          imageBytes: base64Data,
          mimeType,
        },
      },
      config: {
        numberOfVideos: 1,
        durationSeconds: 8,
        aspectRatio,
      },
    })

    console.log('Video generation started, operation ID:', operation.name)

    // Poll the operation status until the video is ready
    let attempts = 0
    const maxAttempts = 60 // 10 minutes max (60 * 10 seconds)
    
    while (!operation.done && attempts < maxAttempts) {
      console.log(`Polling attempt ${attempts + 1}/${maxAttempts}...`)
      await new Promise(resolve => setTimeout(resolve, 10000)) // Wait 10 seconds
      
      operation = await client.operations.getVideosOperation({
        operation: operation,
      })
      
      attempts++
    }

    if (!operation.done) {
      throw new Error('Video generation timed out. Please try again.')
    }

    if (operation.error) {
      throw new Error(`Video generation failed: ${operation.error.message}`)
    }

    // Download the generated video
    const generatedVideo = operation.response?.generatedVideos?.[0]
    if (!generatedVideo) {
      throw new Error('No generated video returned from the operation')
    }

    // Build a client-usable video URL
    let videoUrl: string | null = null
    const v = generatedVideo.video
    if (v?.videoBytes) {
      const outMime = v.mimeType || 'video/mp4'
      videoUrl = `data:${outMime};base64,${v.videoBytes}`
    } else if (v?.uri) {
      videoUrl = v.uri
    }

    console.log('Video generation completed successfully')

    // No temporary uploads used; nothing to clean up

    return NextResponse.json({
      videoUrl,
      mimeType: v?.mimeType || (videoUrl?.startsWith('data:') ? (videoUrl.split(':')[1]?.split(';')[0] || null) : null),
      status: 'completed',
      duration: 8,
      aspectRatio: aspectRatio,
    })

  } catch (error) {
    console.error('Error generating video:', error)
    
    let errorMessage = 'Failed to generate video'
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        errorMessage = 'Invalid API key configuration'
      } else if (error.message.includes('quota')) {
        errorMessage = 'API quota exceeded. Please try again later.'
      } else if (error.message.includes('safety')) {
        errorMessage = 'Content was blocked by safety filters. Please try a different prompt.'
      } else if (error.message.toLowerCase().includes('mime') || error.message.toLowerCase().includes('mimetype')) {
        errorMessage = 'Can not determine mimeType. Please provide mimeType in the config.'
      } else if (error.message.toLowerCase().includes('not supported') || error.message.toLowerCase().includes('update @google/genai')) {
        errorMessage = '現在の SDK では動画生成 API が未対応です。@google/genai のアップデートをご検討ください。'
      } else {
        errorMessage = error.message
      }
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
