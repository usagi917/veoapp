# 🎬 Veo Video Generator

A beautiful, modern web application that transforms your images into amazing videos using Google's Veo 3 AI model.

## ✨ Features

- **Image to Video**: Upload any image and transform it into an 8-second high-quality video
- **Smart Prompting**: Describe what you want to happen in your video with natural language
- **Aspect Ratio Control**: Choose between 16:9 (landscape) or 9:16 (portrait) formats
- **Real-time Progress**: Watch the generation process with beautiful step indicators
- **Instant Preview**: Play your generated video immediately in the browser
- **Easy Download**: Save your videos as MP4 files with one click
- **Error Handling**: Friendly error messages and toast notifications
- **Responsive Design**: Works perfectly on desktop and mobile devices

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd veo
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   # or
   yarn install
   ```

3. **Set up your environment**
   ```bash
   cp env.example .env.local
   ```
   
   Edit `.env.local` and add your Google Gemini API key:
   ```env
   NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   # or
   pnpm dev
   # or
   yarn dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔑 Getting a Gemini API Key

1. Visit the [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key and add it to your `.env.local` file

## 🎨 How to Use

1. **Upload an Image**: Click the upload area and select an image (PNG, JPG, HEIC up to 20MB). Note: HEIC preview may not display in some browsers but upload works.
2. **Write Your Prompt**: Describe what you want to happen in the video
3. **Choose Aspect Ratio**: Select 16:9 for landscape or 9:16 for portrait
4. **Generate Video**: Click the "Generate Video" button and wait for the magic!
5. **Preview & Download**: Watch your video and download it when ready

## 📝 Example Prompts

- "A person walking through a magical forest with sparkles and gentle wind"
- "The camera slowly zooms into the subject while soft music plays"
- "Rain starts falling gently on the scene with dramatic lighting"
- "A butterfly lands on the flower and flies away gracefully"

## 🛠️ Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom components
- **AI Model**: Google Veo 3 via Gemini API
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **Deployment**: Vercel-ready

## 📦 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── generate-video/
│   │   │   ├── route.ts          # Main video generation endpoint
│   │   │   └── status/
│   │   │       └── route.ts      # Progress checking endpoint
│   │   └── placeholder-video/
│   │       └── route.ts          # Demo/fallback endpoint
│   ├── globals.css               # Global styles and Tailwind config
│   ├── layout.tsx                # Root layout with toast provider
│   └── page.tsx                  # Main application component
└── ...
```

## 🎯 Key Features Implementation

### Image Upload
- Drag & drop or click to upload
- File type validation (images only)
- Size limit validation (20MB max)
- Instant preview with thumbnail

### Video Generation
- Real-time progress tracking
- Step-by-step status updates
- Automatic polling for completion
- Error handling with retry logic

### User Experience
- Beautiful glassmorphism design
- Smooth animations and transitions
- Loading states and progress indicators
- Responsive layout for all devices

## 🔧 API Endpoints

- `POST /api/generate-video` - Generate video from image and prompt
- `GET /api/generate-video/status` - Check generation progress
- `GET /api/placeholder-video` - Demo endpoint for testing

## 🚀 Deployment

This app is ready to deploy on Vercel:

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add your `NEXT_PUBLIC_GEMINI_API_KEY` environment variable
4. Deploy!

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Made with 💜 using Google's Veo 3 AI model
