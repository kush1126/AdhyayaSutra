// Gemini API utilities for AdhyayaSutra
// Handles: diagnostic quiz generation, learning path generation, module content, AI tutor, PDF processing, short notes

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.0-flash';

export interface DiagnosticQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  concept: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface LearningModule {
  id: string;
  title: string;
  description: string;
  priority: 'critical' | 'recommended' | 'optional';
  estimatedMinutes: number;
  concepts: string[];
  learningObjectives: string[];
  contentMarkdown: string;
  searchQuery: string; // for YouTube
  practiceExercises: {
    question: string;
    hint: string;
    answer: string;
  }[];
}

export interface LearningPath {
  pathTitle: string;
  summary: string;
  estimatedTotalMinutes: number;
  modules: LearningModule[];
}

export interface ShortNote {
  title: string;
  bulletPoints: string[];
  keyTerms: { term: string; definition: string }[];
  summary: string;
}

// Helper: call Gemini and get JSON
async function callGemini(prompt: string, systemInstruction: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key is missing. Please set VITE_GEMINI_API_KEY in your .env file.');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          maxOutputTokens: 8192,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gemini API error: HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// Helper: stream Gemini response
export async function streamGemini(
  prompt: string,
  systemInstruction: string,
  onChunk: (text: string) => void
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key is missing.');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?key=${GEMINI_API_KEY}&alt=sse`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gemini API error: HTTP ${response.status}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder('utf-8');
  if (!reader) throw new Error('No response body');

  let fullText = '';
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            fullText += text;
            onChunk(text);
          }
        } catch {
          // ignore parse errors
        }
      }
    }
  }

  return fullText;
}

// Extract JSON from Gemini response (handles markdown code blocks)
function extractJSON(text: string): string {
  // Try to find JSON in code blocks first
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (codeBlockMatch) return codeBlockMatch[1].trim();
  
  // Try to find raw JSON
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0];
  
  return text;
}

// Generate diagnostic quiz questions
export async function generateDiagnosticQuiz(
  topic: string,
  difficulty: string,
  numQuestions: number = 7
): Promise<DiagnosticQuestion[]> {
  const systemPrompt = `You are an expert educational assessment specialist. You create precise, well-calibrated diagnostic questions to identify a student's knowledge gaps. Always return valid JSON.`;

  const userPrompt = `Generate exactly ${numQuestions} multiple-choice diagnostic questions for the topic "${topic}" at the "${difficulty}" level.

Each question should test a DIFFERENT sub-concept within this topic. Mix easy, medium, and hard questions to gauge the student's level accurately.

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "questions": [
    {
      "id": 1,
      "question": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "concept": "The sub-concept being tested",
      "explanation": "Brief explanation of why the answer is correct",
      "difficulty": "easy"
    }
  ]
}`;

  const response = await callGemini(userPrompt, systemPrompt);
  const json = JSON.parse(extractJSON(response));
  return json.questions;
}

// Generate personalized learning path based on quiz results
export async function generateLearningPath(
  topic: string,
  difficulty: string,
  score: number,
  weakConcepts: string[],
  strongConcepts: string[]
): Promise<LearningPath> {
  const systemPrompt = `You are an expert curriculum designer who creates personalized, adaptive learning paths. You prioritize weak areas while reinforcing strengths. Always return valid JSON.`;

  const userPrompt = `Create a personalized learning path for a student studying "${topic}" at the "${difficulty}" level.

Quiz Results:
- Overall Score: ${score}%
- Weak Concepts (needs work): ${weakConcepts.join(', ') || 'None identified'}
- Strong Concepts (mastered): ${strongConcepts.join(', ') || 'None identified'}

Generate 3-5 learning modules prioritized by the student's needs. Each module should have:
- Rich markdown content (explanations with examples)
- Practice exercises with hints
- A YouTube search query for finding relevant videos

Return ONLY valid JSON in this exact format:
{
  "pathTitle": "Your Personalized Algebra Journey",
  "summary": "Based on your quiz, we've created a path focusing on...",
  "estimatedTotalMinutes": 90,
  "modules": [
    {
      "id": "module-1",
      "title": "Module title",
      "description": "Brief description",
      "priority": "critical",
      "estimatedMinutes": 20,
      "concepts": ["concept1", "concept2"],
      "learningObjectives": ["Understand X", "Apply Y"],
      "contentMarkdown": "# Module Title\\n\\nDetailed explanation in markdown with examples, formulas, and step-by-step solutions...\\n\\n## Key Concept\\n\\nExplanation here...\\n\\n## Worked Example\\n\\n**Problem:** ...\\n**Solution:** ...",
      "searchQuery": "algebra linear equations tutorial",
      "practiceExercises": [
        {
          "question": "Solve: 2x + 5 = 15",
          "hint": "Subtract 5 from both sides first",
          "answer": "x = 5. Steps: 2x + 5 = 15 → 2x = 10 → x = 5"
        }
      ]
    }
  ]
}`;

  const response = await callGemini(userPrompt, systemPrompt);
  const json = JSON.parse(extractJSON(response));
  return json;
}

// Generate short notes from content or topic
export async function generateShortNotes(
  topic: string,
  content?: string
): Promise<ShortNote> {
  const systemPrompt = `You are an expert at creating concise, exam-ready short notes. You distill complex topics into key bullet points, important terms, and quick summaries. Always return valid JSON.`;

  const userPrompt = `Create short notes for the topic: "${topic}"
${content ? `\nBased on this content:\n${content.substring(0, 4000)}` : ''}

Return ONLY valid JSON:
{
  "title": "Short Notes: ${topic}",
  "bulletPoints": ["Key point 1", "Key point 2", "...up to 10 points"],
  "keyTerms": [
    { "term": "Important Term", "definition": "Brief definition" }
  ],
  "summary": "A 2-3 sentence summary of the entire topic"
}`;

  const response = await callGemini(userPrompt, systemPrompt);
  return JSON.parse(extractJSON(response));
}

// Process PDF content (text extracted from PDF) for learning
export async function processPDFContent(
  pdfText: string,
  action: 'summarize' | 'quiz' | 'notes' | 'explain'
): Promise<string> {
  const systemPrompt = `You are an AI learning assistant that processes educational documents. You help students understand complex material by creating summaries, quizzes, notes, and explanations.`;

  const actionPrompts: Record<string, string> = {
    summarize: `Summarize the following document in a clear, structured way with headings and bullet points. Focus on key concepts:\n\n${pdfText.substring(0, 8000)}`,
    quiz: `Create a 5-question multiple choice quiz based on this document. Format each question clearly with options A-D and indicate the correct answer:\n\n${pdfText.substring(0, 8000)}`,
    notes: `Create concise, exam-ready short notes from this document. Use bullet points, highlight key terms, and include important formulas/dates:\n\n${pdfText.substring(0, 8000)}`,
    explain: `Explain the main concepts in this document in simple language, as if teaching a beginner. Use analogies and examples:\n\n${pdfText.substring(0, 8000)}`,
  };

  return await callGemini(actionPrompts[action], systemPrompt);
}

// AI Tutor chat with context
export async function chatWithTutor(
  topic: string,
  difficulty: string,
  currentModule: string,
  moduleContent: string,
  weakConcepts: string[],
  chatHistory: { role: 'user' | 'ai'; content: string }[],
  userMessage: string,
  onChunk: (text: string) => void
): Promise<string> {
  const systemPrompt = `You are a friendly, patient AI tutor named "Sutra" helping a ${difficulty}-level student learn about "${topic}".
The student is currently studying: "${currentModule}".
Their diagnostic quiz showed they struggle with: ${weakConcepts.join(', ') || 'nothing specific'}.

Current learning content:
<content>
${moduleContent.substring(0, 3000)}
</content>

Guidelines:
- Be encouraging and supportive
- Use simple language and analogies
- If they ask for practice, create new exercises
- If they're stuck, give hints before full answers
- Use markdown for formatting
- Keep responses concise but thorough`;

  const conversationHistory = chatHistory
    .slice(-6) // Last 6 messages for context
    .map(m => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`)
    .join('\n');

  const userPrompt = `${conversationHistory}\nStudent: ${userMessage}\nTutor:`;

  return await streamGemini(userPrompt, systemPrompt, onChunk);
}
