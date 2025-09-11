'use client'

// biome-ignore assist/source/organizeImports: manual import order preferred
import { useState, useRef, useEffect } from 'react'
import { Upload, Wand2, Download, Play, Loader2, Image as ImageIcon, Film } from 'lucide-react'
import toast from 'react-hot-toast'

type AspectRatio = '16:9' | '9:16'

interface GenerationStep {
  id: string
  label: string
  status: 'pending' | 'active' | 'completed' | 'error'
}

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null)
  const [generatedMime, setGeneratedMime] = useState<string | null>(null)
  const [videoReady, setVideoReady] = useState(false)
  const [videoError, setVideoError] = useState<string | null>(null)
  const [steps, setSteps] = useState<GenerationStep[]>([
    { id: 'upload', label: '画像のアップロード', status: 'pending' },
    { id: 'processing', label: 'AI 処理', status: 'pending' },
    { id: 'generation', label: '動画生成', status: 'pending' },
    { id: 'complete', label: '完了', status: 'pending' }
  ])
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const isHeicByName = /\.(heic|heif)$/i.test(file.name)
    const isImageByType = file.type.startsWith('image/')
    const looksLikeImage = isImageByType || isHeicByName

    if (!looksLikeImage) {
      toast.error('有効な画像ファイルを選択してください（JPG/PNG/HEIC）')
      return
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error('画像サイズは 20MB 未満にしてください')
      return
    }

    setSelectedImage(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      // HEIC/HEIF は一部ブラウザでプレビュー不可のため、その場合はメッセージのみ
      if (isHeicByName || file.type === 'image/heic' || file.type === 'image/heif' || (!file.type && isHeicByName)) {
        // プレビューは期待どおりに表示できない可能性があるが、アップロードは問題なし
        setImagePreview('')
        updateStepStatus('upload', 'completed')
        toast.success('HEIC画像をアップロードしました（プレビューは表示されない場合があります） ✨')
      } else {
        setImagePreview(result)
        updateStepStatus('upload', 'completed')
        toast.success('画像をアップロードしました ✨')
      }
    }
    reader.readAsDataURL(file)
  }

  const updateStepStatus = (stepId: string, status: GenerationStep['status']) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status } : step
    ))
  }

  const inferMimeFromUrl = (url: string | null): string | null => {
    if (!url) return null
    // data URL の先頭を解析
    if (url.startsWith('data:')) {
      const match = /^data:([^;]+);/i.exec(url)
      return match?.[1] ?? null
    }
    // 拡張子からの推測（簡易）
    if (/\.webm(\?|#|$)/i.test(url)) return 'video/webm'
    if (/\.(mp4|m4v)(\?|#|$)/i.test(url)) return 'video/mp4'
    return null
  }

  const generateVideo = async () => {
    if (!selectedImage || !prompt.trim()) {
      toast.error('画像をアップロードし、説明文を入力してください')
      return
    }

    setIsGenerating(true)
    setGeneratedVideo(null)
    setGeneratedMime(null)
    setVideoReady(false)
    setVideoError(null)
    
    try {
      updateStepStatus('processing', 'active')
      
      // Convert image to base64
      let base64Image = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target?.result as string)
        reader.readAsDataURL(selectedImage)
      })

      // 一部環境では HEIC/HEIF の MIME が空 or application/octet-stream になることがあるため補正
      const isHeicByName = /\.(heic|heif)$/i.test(selectedImage.name)
      const hasHeicType = selectedImage.type === 'image/heic' || selectedImage.type === 'image/heif'
      if (isHeicByName && !hasHeicType) {
        // data:application/octet-stream; や data:; を data:image/heic; に置き換える
        base64Image = base64Image.replace(/^data:[^;]*;/, 'data:image/heic;')
      }

      updateStepStatus('processing', 'completed')
      updateStepStatus('generation', 'active')

      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Image,
          prompt: prompt.trim(),
          aspectRatio,
          mimeType: (selectedImage.type && selectedImage.type !== '')
            ? selectedImage.type
            : (/\.(heic|heif)$/i.test(selectedImage.name) ? 'image/heic' : undefined),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate video')
      }

      const data = await response.json() as { videoUrl: string | null; mimeType?: string | null }
      
      updateStepStatus('generation', 'completed')
      updateStepStatus('complete', 'completed')
      
      // リモート URL は同一オリジンのプロキシ経由に変換（再生/シーク/ダウンロードの安定化）
      const finalUrl = data.videoUrl && /^https?:\/\//i.test(data.videoUrl)
        ? `/api/video-proxy?url=${encodeURIComponent(data.videoUrl)}`
        : data.videoUrl
      setGeneratedVideo(finalUrl)
      setGeneratedMime(data.mimeType ?? inferMimeFromUrl(data.videoUrl))
      toast.success('動画の生成が完了しました 🎉')
      
    } catch (error) {
      console.error('Error generating video:', error)
      updateStepStatus('generation', 'error')
      // 日本語の汎用メッセージを表示（詳細はコンソールで確認可能）
      toast.error('動画の生成に失敗しました')
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadVideo = async () => {
    if (!generatedVideo) return

    const filename = `veo-generated-video-${Date.now()}.mp4`
    const link = document.createElement('a')

    try {
      if (generatedVideo.startsWith('data:')) {
        // data URL は一部ブラウザで download 属性が効かないため Blob 化
        const res = await fetch(generatedVideo)
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        setTimeout(() => URL.revokeObjectURL(url), 0)
      } else {
        // プロキシ経由で Content-Disposition: attachment を強制
        const url = `${generatedVideo}${generatedVideo.includes('?') ? '&' : '?'}download=1&filename=${encodeURIComponent(filename)}`
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
      toast.success('動画のダウンロードを開始しました 📥')
    } catch {
      toast.error('動画のダウンロードに失敗しました')
    }
  }

  useEffect(() => {
    // 新しい動画がセットされたら、準備状態をリセット
    setVideoReady(false)
    setVideoError(null)
  }, [generatedVideo])

  const resetForm = () => {
    setSelectedImage(null)
    setImagePreview(null)
    setPrompt('')
    setGeneratedVideo(null)
    setSteps(prev => prev.map(step => ({ ...step, status: 'pending' })))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="min-h-screen py-12 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="w-14 h-14 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Film className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              動画生成AI
            </h1>
          </div>
          <p className="text-slate-400 text-xl font-light">
            AI で画像を魅力的な動画に変換
          </p>
        </div>

        {/* Progress Steps */}
        {(selectedImage || isGenerating) && (
          <div className="modern-card p-8 mb-12">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`progress-step ${
                    step.status === 'completed' 
                      ? 'step-completed' 
                      : step.status === 'active'
                      ? 'step-active animate-pulse'
                      : step.status === 'error'
                      ? 'step-error'
                      : 'step-pending'
                  }`}>
                    {step.status === 'active' ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : step.status === 'completed' ? (
                      <span className="text-sm">✓</span>
                    ) : step.status === 'error' ? (
                      <span className="text-sm">✗</span>
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>
                  <span className={`ml-3 text-sm font-medium ${
                    step.status === 'completed' ? 'text-emerald-400' :
                    step.status === 'active' ? 'text-indigo-400' :
                    step.status === 'error' ? 'text-red-400' :
                    'text-slate-500'
                  }`}>
                    {step.label}
                  </span>
                  {index < steps.length - 1 && (
                    <div className={`w-20 h-0.5 mx-6 rounded-full transition-all duration-300 ${
                      steps[index + 1].status === 'completed' || steps[index + 1].status === 'active'
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500'
                        : 'bg-slate-700'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-8">
            {/* Image Upload */}
            <div className="modern-card p-8">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-3 text-slate-200">
                <ImageIcon className="w-6 h-6 text-indigo-400" />
                画像をアップロード
              </h2>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.heic,.heif"
                onChange={handleImageUpload}
                className="hidden"
              />
              
              {/** biome-ignore lint/a11y/useSemanticElements: upload area needs custom styling */}
              <div
                role="button"
                tabIndex={0}
                className="upload-area w-full text-left"
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    fileInputRef.current?.click()
                  }
                }}
                aria-label="画像をアップロード"
              >
                {selectedImage ? (
                  (/\.(heic|heif)$/i.test(selectedImage.name) || selectedImage.type === 'image/heic' || selectedImage.type === 'image/heif') ? (
                    <div className="relative text-center">
                      <div className="max-h-64 mx-auto rounded-2xl shadow-lg bg-slate-700/50 p-8 text-slate-300">
                        このブラウザでは HEIC プレビューに対応していませんが、
                        画像はアップロードされています。
                      </div>
                      {/** biome-ignore lint/a11y/useSemanticElements: reset form button */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation()
                          resetForm()
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            e.stopPropagation()
                            resetForm()
                          }
                        }}
                        className="absolute top-3 right-3 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm hover:bg-red-600 cursor-pointer shadow-lg transition-all duration-200"
                        aria-label="画像を削除"
                      >
                        ×
                      </div>
                    </div>
                  ) : imagePreview ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {/** biome-ignore lint/performance/noImgElement: preview display needed */}
                      <img 
                        src={imagePreview} 
                        alt="アップロードプレビュー" 
                        className="max-h-64 mx-auto rounded-2xl shadow-2xl"
                      />
                      {/** biome-ignore lint/a11y/useSemanticElements: reset form button */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation()
                          resetForm()
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            e.stopPropagation()
                            resetForm()
                          }
                        }}
                        className="absolute top-3 right-3 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm hover:bg-red-600 cursor-pointer shadow-lg transition-all duration-200"
                        aria-label="画像を削除"
                      >
                        ×
                      </div>
                    </div>
                  ) : (
                    <div className="py-4">
                      <Upload className="w-14 h-14 mx-auto mb-6 text-indigo-400" />
                      <p className="text-slate-300 mb-3 font-medium">クリックして画像をアップロード</p>
                      <p className="text-sm text-slate-500">PNG, JPG, HEIC（最大 20MB）</p>
                    </div>
                  )
                ) : (
                  <div className="py-4">
                    <Upload className="w-14 h-14 mx-auto mb-6 text-indigo-400" />
                    <p className="text-slate-300 mb-3 font-medium">クリックして画像をアップロード</p>
                    <p className="text-sm text-slate-500">PNG, JPG, HEIC（最大 20MB）</p>
                  </div>
                )}
              </div>
            </div>

            {/* Text Prompt */}
            <div className="modern-card p-8">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-3 text-slate-200">
                <Wand2 className="w-6 h-6 text-indigo-400" />
                動画の説明
              </h2>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="動画で起こしたいことを説明してください…（例：『キラキラした光と穏やかな風の中、魔法の森を歩く人』）"
                className="w-full h-36 p-5 bg-slate-800/50 border border-slate-600 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-slate-100 placeholder-slate-400 transition-all duration-300"
                disabled={isGenerating}
              />
              <div className="mt-3 text-sm text-slate-500 flex justify-between">
                <span>動画の内容を詳細に記述してください</span>
                <span>{prompt.length}/1024 文字</span>
              </div>
            </div>

            {/* Aspect Ratio */}
            <div className="modern-card p-8">
              <h2 className="text-xl font-semibold mb-6 text-slate-200">アスペクト比</h2>
              <div className="grid grid-cols-2 gap-6">
                {(['16:9', '9:16'] as AspectRatio[]).map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setAspectRatio(ratio)}
                    disabled={isGenerating}
                    className={`aspect-ratio-selector ${
                      aspectRatio === ratio
                        ? 'aspect-ratio-active'
                        : 'aspect-ratio-inactive'
                    } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                    aria-label={`アスペクト比 ${ratio} を選択`}
                  >
                    <div className={`w-full ${ratio === '16:9' ? 'aspect-video' : 'aspect-[9/16]'} bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl mb-3 border border-slate-600`} />
                    <div className="text-sm font-semibold">{ratio}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button
              type="button"
              onClick={generateVideo}
              disabled={!selectedImage || !prompt.trim() || isGenerating}
              className={`w-full primary-button text-lg font-semibold py-4 ${
                (!selectedImage || !prompt.trim() || isGenerating) 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              {isGenerating ? (
                <div className="flex items-center justify-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  動画を生成中...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <Wand2 className="w-6 h-6" />
                  動画を生成
                </div>
              )}
            </button>
          </div>

          {/* Preview Section */}
          <div className="modern-card p-8">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-3 text-slate-200">
              <Play className="w-6 h-6 text-indigo-400" />
              動画プレビュー
            </h2>
            
            {generatedVideo ? (
              <div className="space-y-4">
                {/** biome-ignore lint/a11y/useMediaCaption: video caption */}
                <video
                  ref={videoRef}
                  controls
                  preload="metadata"
                  crossOrigin="anonymous"
                  className="w-full rounded-2xl shadow-2xl border border-slate-600"
                  style={{ aspectRatio: aspectRatio === '16:9' ? '16/9' : '9/16' }}
                  onLoadedData={() => setVideoReady(true)}
                  onCanPlay={() => setVideoReady(true)}
                  onError={() => {
                    setVideoError('動画を再生できません（未対応の形式または読み込み失敗）')
                    setVideoReady(false)
                    toast.error('動画の読み込みに失敗しました')
                  }}
                >
                  {/* ソースを明示し、ブラウザの判定を助ける */}
                  <source src={generatedVideo} type={generatedMime || undefined} />
                  お使いのブラウザは video タグに対応していません。
                </video>
                {videoError && (
                  <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">{videoError}</p>
                )}
                
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      const v = videoRef.current
                      if (!v) return
                      // 準備できていない/サポートされない場合の安全なガード
                      if (!videoReady || v.readyState < v.HAVE_CURRENT_DATA) {
                        toast.error('動画がまだ読み込まれていません')
                        return
                      }
                      v.play().catch(() => {
                        toast.error('再生に失敗しました')
                      })
                    }}
                    disabled={!videoReady}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Play className="w-5 h-5" />
                    再生
                  </button>
                  
                  <button
                    type="button"
                    onClick={downloadVideo}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-blue-500/25"
                  >
                    <Download className="w-5 h-5" />
                    ダウンロード
                  </button>
                </div>
              </div>
            ) : (
              <div className="aspect-video bg-slate-800/50 border border-slate-700 rounded-2xl flex items-center justify-center">
                <div className="text-center text-slate-500">
                  <Film className="w-20 h-20 mx-auto mb-6 opacity-50" />
                  <p className="text-lg font-medium">生成された動画はここに表示されます</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
