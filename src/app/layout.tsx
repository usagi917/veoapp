import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'Veo 動画ジェネレーター',
  description: 'AI で画像を魅力的な動画に変換',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className="antialiased">
        {children}
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#ffffff',
              color: '#374151',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            },
          }}
        />
      </body>
    </html>
  )
}
