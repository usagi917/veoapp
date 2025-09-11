import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// Node.js ランタイムで実行（fetch ストリームを素直に扱うため）
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isHttpUrl(url: string) {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const target = searchParams.get('url')
    const forceDownload = searchParams.get('download') === '1'
    const filename = (searchParams.get('filename') || 'video.mp4').replace(/[^\w.-]/g, '_')

    if (!target || !isHttpUrl(target)) {
      return NextResponse.json({ error: 'Invalid or missing url' }, { status: 400 })
    }

    const range = request.headers.get('range') || undefined
    const targetUrl = new URL(target)
    const isGenerativeFilesDownload =
      /(^|\.)generativelanguage\.googleapis\.com$/i.test(targetUrl.hostname) &&
      /\/v\d+(beta)?\/files\/.+:download$/i.test(targetUrl.pathname)

    // 上流に付与するヘッダーを構築（Range 転送 + 必要に応じて API キー）
    const upstreamHeaders: Record<string, string> = {}
    if (range) upstreamHeaders['Range'] = range
    upstreamHeaders['Accept'] = '*/*'

    // Google Generative Language の files:download は API キーが必要
    if (isGenerativeFilesDownload) {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY
      if (apiKey && apiKey.trim() !== '') {
        upstreamHeaders['x-goog-api-key'] = apiKey.trim()
      }
    }

    // リモートに Range を転送（シーク対応） + 認証が必要なら付与
    const upstreamRes = await fetch(target, {
      method: 'GET',
      headers: Object.keys(upstreamHeaders).length ? upstreamHeaders : undefined,
    })

    // エラーはそのまま返却
    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      return NextResponse.json(
        { error: `Upstream error: ${upstreamRes.status}` },
        { status: 502 }
      )
    }

    // ヘッダーを選別して転送
    const resHeaders = new Headers()
    const ct = upstreamRes.headers.get('content-type') || 'video/mp4'
    const cl = upstreamRes.headers.get('content-length')
    const cr = upstreamRes.headers.get('content-range')

    resHeaders.set('Content-Type', ct)
    if (cl) resHeaders.set('Content-Length', cl)
    if (cr) resHeaders.set('Content-Range', cr)

    // シーク可能にする
    resHeaders.set('Accept-Ranges', 'bytes')

    // ダウンロードを強制する場合
    if (forceDownload) {
      resHeaders.set('Content-Disposition', `attachment; filename="${filename}"`)
    } else {
      resHeaders.set('Content-Disposition', `inline; filename="${filename}"`)
    }

    // キャッシュは無効化（用途に応じて調整可能）
    resHeaders.set('Cache-Control', 'no-store')

    // ボディをストリーム転送
    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: resHeaders,
    })
  } catch (error) {
    console.error('video-proxy error:', error)
    return NextResponse.json({ error: 'Failed to proxy video' }, { status: 500 })
  }
}
