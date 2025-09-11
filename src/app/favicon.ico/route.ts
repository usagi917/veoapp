import { NextResponse } from 'next/server'

export const dynamic = 'force-static'

// 極小の空アイコンを返して 404 を解消（必要なら public/favicon.ico を用意）
export async function GET() {
  const empty = new Uint8Array([])
  return new NextResponse(empty, {
    status: 200,
    headers: {
      'Content-Type': 'image/x-icon',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}

