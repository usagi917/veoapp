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
      
      setGeneratedVideo(data.videoUrl)
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

  const downloadVideo = () => {
    if (!generatedVideo) return
    
    const link = document.createElement('a')
    link.href = generatedVideo
    link.download = `veo-generated-video-${Date.now()}.mp4`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('動画のダウンロードを開始しました 📥')
  }

  useEffect(() => {
    // 新しい動画がセットされたら、準備状態をリセット
    setVideoReady(false)
    setVideoError(null)
  }, [])

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
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
              <Film className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              動画生成AI
            </h1>
          </div>
          <p className="text-gray-600 text-lg">
            AI で画像を魅力的な動画に変換 ✨
          </p>
        </div>

        {/* Progress Steps */}
        {(selectedImage || isGenerating) && (
          <div className="glass-card p-6 mb-8">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                    step.status === 'completed' 
                      ? 'bg-green-500 border-green-500 text-white' 
                      : step.status === 'active'
                      ? 'bg-purple-500 border-purple-500 text-white animate-pulse'
                      : step.status === 'error'
                      ? 'bg-red-500 border-red-500 text-white'
                      : 'bg-gray-100 border-gray-300 text-gray-500'
                  }`}>
                    {step.status === 'active' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : step.status === 'completed' ? (
                      <span>✓</span>
                    ) : step.status === 'error' ? (
                      <span>✗</span>
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>
                  <span className={`ml-2 text-sm font-medium ${
                    step.status === 'completed' ? 'text-green-600' :
                    step.status === 'active' ? 'text-purple-600' :
                    step.status === 'error' ? 'text-red-600' :
                    'text-gray-500'
                  }`}>
                    {step.label}
                  </span>
                  {index < steps.length - 1 && (
                    <div className={`w-16 h-0.5 mx-4 ${
                      steps[index + 1].status === 'completed' || steps[index + 1].status === 'active'
                        ? 'bg-purple-500'
                        : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-6">
            {/* Image Upload */}
            <div className="glass-card p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
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
                      <div className="max-h-64 mx-auto rounded-lg shadow-lg bg-gray-50 p-6 text-gray-600">
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
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 cursor-pointer"
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
                        className="max-h-64 mx-auto rounded-lg shadow-lg"
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
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 cursor-pointer"
                        aria-label="画像を削除"
                      >
                        ×
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-12 h-12 mx-auto mb-4 text-purple-400" />
                      <p className="text-gray-600 mb-2">クリックして画像をアップロード</p>
                      <p className="text-sm text-gray-400">PNG, JPG, HEIC（最大 20MB）</p>
                    </div>
                  )
                ) : (
                  <div>
                    <Upload className="w-12 h-12 mx-auto mb-4 text-purple-400" />
                    <p className="text-gray-600 mb-2">クリックして画像をアップロード</p>
                    <p className="text-sm text-gray-400">PNG, JPG, HEIC（最大 20MB）</p>
                  </div>
                )}
              </div>
            </div>

            {/* Text Prompt */}
            <div className="glass-card p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Wand2 className="w-5 h-5" />
                動画の説明
              </h2>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="動画で起こしたいことを説明してください…（例：『キラキラした光と穏やかな風の中、魔法の森を歩く人』）"
                className="w-full h-32 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                disabled={isGenerating}
              />
              <div className="mt-2 text-sm text-gray-500">
                {prompt.length}/1024 文字
              </div>
            </div>

            {/* Aspect Ratio */}
            <div className="glass-card p-6">
              <h2 className="text-xl font-semibold mb-4">アスペクト比</h2>
              <div className="grid grid-cols-2 gap-4">
                {(['16:9', '9:16'] as AspectRatio[]).map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setAspectRatio(ratio)}
                    disabled={isGenerating}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                      aspectRatio === ratio
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    } ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    aria-label={`アスペクト比 ${ratio} を選択`}
                  >
                    <div className={`w-full ${ratio === '16:9' ? 'aspect-video' : 'aspect-[9/16]'} bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg mb-2`} />
                    <div className="text-sm font-medium">{ratio}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button
              type="button"
              onClick={generateVideo}
              disabled={!selectedImage || !prompt.trim() || isGenerating}
              className={`w-full gradient-button ${
                (!selectedImage || !prompt.trim() || isGenerating) 
                  ? 'opacity-50 cursor-not-allowed transform-none' 
                  : ''
              }`}
            >
              {isGenerating ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  動画を生成中...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Wand2 className="w-5 h-5" />
                  動画を生成
                </div>
              )}
            </button>
          </div>

          {/* Preview Section */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Play className="w-5 h-5" />
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
                  className="w-full rounded-xl shadow-lg"
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
                  <p className="text-sm text-red-600">{videoError}</p>
                )}
                
                <div className="flex gap-3">
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
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    再生
                  </button>
                  
                  <button
                    type="button"
                    onClick={downloadVideo}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    ダウンロード
                  </button>
                </div>
              </div>
            ) : (
              <div className="aspect-video bg-gray-100 rounded-xl flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <Film className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>生成された動画はここに表示されます</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
