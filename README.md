<div align="center">

# 🎓 AdhyayaSutra

**AI-Powered Personalized Student Learning Path Generator**

[![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

*"अध्याय" (Adhyaya) means "Chapter" and "सूत्र" (Sutra) means "Thread/Formula" — Together: The Thread Through Your Learning Chapters*

</div>

---

## 🌟 What is AdhyayaSutra?

AdhyayaSutra is a **personalized AI learning companion** that adapts to each student's unique knowledge level. Instead of one-size-fits-all content, it:

1. **Diagnoses** your current knowledge with a Gemini-generated quiz
2. **Maps** your strengths and weaknesses
3. **Generates** a tailored learning path prioritizing your weak areas
4. **Provides** rich content, YouTube videos, practice exercises, and short notes
5. **Tracks** your progress via Google Sheets

## 🛠️ Google Tools Stack

| Tool | Usage |
|---|---|
| **Gemini API** | Diagnostic quiz generation, learning path creation, AI tutor chat, PDF processing, short notes |
| **YouTube Data API v3** | Fetching relevant educational videos for each learning module |
| **Google Sheets API** | Storing student progress data for teacher dashboards |
| **Firebase / Vercel** | Web app hosting |

## ✨ Features

- 📚 **6 Subject Areas**: Mathematics, Science, Computer Science, History, Geography, English
- 🧠 **Diagnostic Quiz**: 7 AI-generated questions calibrated to your level
- 🗺️ **Personalized Learning Path**: 3-5 modules prioritized by your weak concepts
- 📹 **YouTube Video Integration**: Curated educational videos per module
- 📝 **Short Notes Generator**: AI-generated concise study notes
- ✏️ **Practice Exercises**: Interactive problems with hints and answers
- 🤖 **AI Tutor (Sutra)**: Context-aware chat assistant powered by Gemini
- 📄 **PDF Processor**: Upload documents for AI summarization, quizzing, and explanation
- 📊 **Progress Tracker**: Checkboxes + Google Sheets sync
- 🌙 **Dark Mode**: Beautiful light and dark themes
- 🎨 **Premium UI**: Glassmorphism, gradient animations, Framer Motion transitions

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Set up your API keys in .env
# VITE_GEMINI_API_KEY=your_key
# VITE_YOUTUBE_API_KEY=your_key (optional)
# VITE_SHEETS_API_KEY=your_key (optional)
# VITE_SPREADSHEET_ID=your_id (optional)

# Start the dev server
npm run dev
```

## 📐 Architecture

```
src/
├── App.tsx                  # Router + LearningSession state
├── data/
│   └── subjects.ts          # Subject definitions, topics, difficulty levels
├── pages/
│   ├── Home.tsx             # Onboarding wizard (Name → Subject → Topic → Difficulty)
│   └── Dashboard.tsx        # Quiz engine, learning path, content, chat
└── utils/
    ├── gemini.ts            # Gemini API (quiz, path, notes, PDF, chat)
    ├── youtube.ts           # YouTube Data API search
    └── sheets.ts            # Google Sheets progress logging
```

---

<div align="center">
  <i>Built for the Google IAR Hackathon 2026 ❤️</i>
</div>
