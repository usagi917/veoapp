import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest) {
  try {
    // Generate a simple placeholder video using canvas and WebM
    // This is a fallback for demo purposes when API key is not available

    // Return a simple response for demo
    return new NextResponse(
      JSON.stringify({
        message: 'This is a placeholder video endpoint. In production, this would return the actual generated video.',
        videoUrl: '/api/demo-video.mp4',
        note: 'Please configure your Gemini API key to use the real Veo 3 video generation.'
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

  } catch (error) {
    console.error('Error serving placeholder video:', error)
    return NextResponse.json(
      { error: 'Failed to serve placeholder video' },
      { status: 500 }
    )
  }
}
