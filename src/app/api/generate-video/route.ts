import { GoogleGenAI } from '@google/genai'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const client = new GoogleGenAI({
  apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''
})

export async function POST(request: NextRequest) {
  try {
    const { image, prompt, aspectRatio } = await request.json()

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

    // Convert base64 image to blob for upload
    const base64Data = image.split(',')[1]
    const mimeType = image.split(';')[0].split(':')[1]
    const buffer = Buffer.from(base64Data, 'base64')

    // Upload image to Files API first
    const uploadedFile = await client.files.upload({
      file: {
        data: buffer,
        mimeType: mimeType
      },
      displayName: `input-image-${Date.now()}`
    })

    console.log('Image uploaded:', uploadedFile.file.name)

    // Enhanced prompt with aspect ratio and quality settings
    const enhancedPrompt = `${prompt}. Create a high-quality 8-second video with smooth motion and realistic details. Aspect ratio: ${aspectRatio}.`

    console.log('Generating video with Veo 3...')

    // Generate video using Veo 3
    let operation = await client.models.generateVideos({
      model: 'veo-3.0-generate-001',
      prompt: enhancedPrompt,
      image: uploadedFile.file
    })

    console.log('Video generation started, operation ID:', operation.name)

    // Poll the operation status until the video is ready
    let attempts = 0
    const maxAttempts = 60 // 10 minutes max (60 * 10 seconds)
    
    while (!operation.done && attempts < maxAttempts) {
      console.log(`Polling attempt ${attempts + 1}/${maxAttempts}...`)
      await new Promise(resolve => setTimeout(resolve, 10000)) // Wait 10 seconds
      
      operation = await client.operations.getVideosOperation({
        operation: operation
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
    const generatedVideo = operation.response.generatedVideos[0]
    
    // Create a temporary URL for the video
    const videoData = await client.files.download({
      file: generatedVideo.video
    })

    // Convert to base64 for client-side handling
    const videoBase64 = `data:video/mp4;base64,${Buffer.from(videoData).toString('base64')}`

    console.log('Video generation completed successfully')

    // Clean up uploaded image
    try {
      await client.files.delete({ file: uploadedFile.file })
    } catch (cleanupError) {
      console.warn('Failed to cleanup uploaded image:', cleanupError)
    }

    return NextResponse.json({
      videoUrl: videoBase64,
      status: 'completed',
      duration: 8,
      aspectRatio: aspectRatio
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
