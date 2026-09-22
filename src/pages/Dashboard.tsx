import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import type { LearningSession } from '../App';
import type { DiagnosticQuestion, LearningPath, LearningModule } from '../utils/gemini';
import { generateDiagnosticQuiz, generateLearningPath, generateShortNotes, chatWithTutor, processPDFContent } from '../utils/gemini';
import { searchEducationalVideos, getYouTubeWatchUrl, getYouTubeSearchUrl, type YouTubeVideo } from '../utils/youtube';
import { appendProgressToSheet } from '../utils/sheets';
import { SUBJECTS } from '../data/subjects';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { extractTextFromPDF } from '../utils/pdf';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, CheckCircle2, Play, Send, Bot, User,
  BookOpen, Brain, FileText, Sparkles, ChevronDown, ChevronRight,
  Home, Upload, Lightbulb, Eye, EyeOff, GraduationCap,
  MessageSquare, Youtube, Loader2, Trophy, Clock, Target, Zap
} from 'lucide-react';

interface DashboardProps {
  sessions: LearningSession[];
  updateSession: (s: LearningSession) => void;
  deleteSession: (id: string) => void;
}

type DashboardPhase = 'quiz' | 'results' | 'generating' | 'learning';

export default function Dashboard({ sessions, updateSession }: DashboardProps) {
  const { sessionId, moduleId } = useParams();
  const navigate = useNavigate();
  const session = sessions.find(s => s.id === sessionId);

  // Quiz state
  const [phase, setPhase] = useState<DashboardPhase>('quiz');
  const [questions, setQuestions] = useState<DiagnosticQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [quizLoading, setQuizLoading] = useState(true);
  const [quizError, setQuizError] = useState<string | null>(null);

  // Learning state
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({});
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);

  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([
    { role: 'ai', content: "Hi! I'm Sutra, your AI tutor 🎓 Ask me anything about your current topic!" }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Short notes / PDF state
  const [shortNotes, setShortNotes] = useState<string | null>(null);
  const [notesLoading, setNotesLoading] = useState(false);
  const [pdfText, setPdfText] = useState<string | null>(null);
  const [pdfResult, setPdfResult] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'notes' | 'pdf' | 'exercises'>('content');

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (!session) {
    return <Navigate to="/" replace />;
  }

  // Determine phase based on session state
  useEffect(() => {
    if (session.learningPath && session.learningPath.modules.length > 0) {
      setPhase('learning');
      // Expand all phases by default
      const exp: Record<string, boolean> = {};
      ['critical', 'recommended', 'optional'].forEach(p => { exp[p] = true; });
      setExpandedPhases(exp);
      // Set active module
      if (moduleId) {
        setActiveModuleId(moduleId);
      } else if (session.lastViewedModule) {
        setActiveModuleId(session.lastViewedModule);
      } else {
        setActiveModuleId(session.learningPath.modules[0].id);
      }
    } else if (session.quizResults) {
      setPhase('results');
    } else {
      setPhase('quiz');
    }
  }, [session.id]);

  // Load quiz on mount if needed
  useEffect(() => {
    if (phase === 'quiz' && questions.length === 0) {
      loadQuiz();
    }
  }, [phase]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  // Fetch videos when active module changes
  useEffect(() => {
    if (activeModuleId && session.learningPath) {
      const mod = session.learningPath.modules.find(m => m.id === activeModuleId);
      if (mod) {
        fetchVideos(mod.searchQuery || mod.title);
        // Update last viewed
        updateSession({ ...session, lastViewedModule: activeModuleId });
        // Reset tabs
        setActiveTab('content');
        setShortNotes(null);
        setPdfResult(null);
      }
    }
  }, [activeModuleId]);

  async function loadQuiz() {
    setQuizLoading(true);
    setQuizError(null);
    try {
      const qs = await generateDiagnosticQuiz(session.topicName, session.difficulty, 7);
      setQuestions(qs);
      setAnswers([]);
      setCurrentQ(0);
    } catch (err: any) {
      setQuizError(err.message || 'Failed to generate quiz');
    } finally {
      setQuizLoading(false);
    }
  }

  function handleAnswer(optionIndex: number) {
    if (showExplanation) return;
    const newAnswers = [...answers, optionIndex];
    setAnswers(newAnswers);
    setShowExplanation(true);

    setTimeout(() => {
      setShowExplanation(false);
      if (currentQ < questions.length - 1) {
        setCurrentQ(currentQ + 1);
      } else {
        // Quiz complete — calculate results
        const score = Math.round(
          (newAnswers.filter((a, i) => a === questions[i].correctAnswer).length / questions.length) * 100
        );
        const weak = questions
          .filter((q, i) => newAnswers[i] !== q.correctAnswer)
          .map(q => q.concept);
        const strong = questions
          .filter((q, i) => newAnswers[i] === q.correctAnswer)
          .map(q => q.concept);

        updateSession({
          ...session,
          quizResults: { questions, answers: newAnswers, score, weakConcepts: weak, strongConcepts: strong },
        });
        setPhase('results');
      }
    }, 2000);
  }

  async function handleGeneratePath() {
    if (!session.quizResults) return;
    setPhase('generating');

    try {
      const path = await generateLearningPath(
        session.topicName,
        session.difficulty,
        session.quizResults.score,
        session.quizResults.weakConcepts,
        session.quizResults.strongConcepts
      );
      updateSession({ ...session, learningPath: path });
      setPhase('learning');
      setActiveModuleId(path.modules[0]?.id || null);
      const exp: Record<string, boolean> = {};
      ['critical', 'recommended', 'optional'].forEach(p => { exp[p] = true; });
      setExpandedPhases(exp);
    } catch (err: any) {
      setQuizError(err.message);
      setPhase('results');
    }
  }

  async function fetchVideos(query: string) {
    setVideosLoading(true);
    try {
      const vids = await searchEducationalVideos(query, 3);
      setVideos(vids);
    } catch {
      setVideos([]);
    } finally {
      setVideosLoading(false);
    }
  }

  function toggleModuleComplete(modId: string) {
    const completed = session.completedModules.includes(modId)
      ? session.completedModules.filter(id => id !== modId)
      : [...session.completedModules, modId];

    updateSession({ ...session, completedModules: completed });

    // Log to Google Sheets if newly completed
    if (!session.completedModules.includes(modId) && session.learningPath) {
      const mod = session.learningPath.modules.find(m => m.id === modId);
      appendProgressToSheet({
        studentName: session.studentName,
        subject: session.subject,
        topic: session.topicName,
        moduleName: mod?.title || modId,
        quizScore: session.quizResults?.score || 0,
        completedAt: new Date().toISOString(),
        difficulty: session.difficulty,
      });
    }
  }

  async function handleChat() {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: msg }]);
    setChatLoading(true);

    const aiMsgIndex = chatMessages.length + 1;
    setChatMessages(prev => [...prev, { role: 'ai', content: '▌' }]);

    try {
      const activeModule = session.learningPath?.modules.find(m => m.id === activeModuleId);
      let fullResponse = '';

      await chatWithTutor(
        session.topicName,
        session.difficulty,
        activeModule?.title || session.topicName,
        activeModule?.contentMarkdown || '',
        session.quizResults?.weakConcepts || [],
        chatMessages,
        msg,
        (chunk) => {
          fullResponse += chunk;
          setChatMessages(prev =>
            prev.map((m, i) => i === aiMsgIndex ? { ...m, content: fullResponse + '▌' } : m)
          );
        }
      );

      setChatMessages(prev =>
        prev.map((m, i) => i === aiMsgIndex ? { ...m, content: fullResponse } : m)
      );
    } catch (err: any) {
      setChatMessages(prev =>
        prev.map((m, i) => i === aiMsgIndex ? { ...m, content: `Error: ${err.message}` } : m)
      );
    } finally {
      setChatLoading(false);
    }
  }

  async function handleGenerateNotes() {
    setNotesLoading(true);
    try {
      const activeModule = session.learningPath?.modules.find(m => m.id === activeModuleId);
      const notes = await generateShortNotes(
        activeModule?.title || session.topicName,
        activeModule?.contentMarkdown
      );
      setShortNotes(
        `# 📝 ${notes.title}\n\n` +
        `## Key Points\n${notes.bulletPoints.map(p => `- ${p}`).join('\n')}\n\n` +
        `## Key Terms\n${notes.keyTerms.map(t => `- **${t.term}**: ${t.definition}`).join('\n')}\n\n` +
        `## Summary\n${notes.summary}`
      );
      setActiveTab('notes');
    } catch (err: any) {
      setShortNotes(`Error generating notes: ${err.message}`);
    } finally {
      setNotesLoading(false);
    }
  }


  async function handlePDFUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPdfLoading(true);
    try {
      let text = '';
      if (file.name.toLowerCase().endsWith('.pdf')) {
        text = await extractTextFromPDF(file);
      } else {
        text = await file.text();
      }

      setPdfText(text);
      const result = await processPDFContent(text, 'summarize');
      setPdfResult(result);
      setActiveTab('pdf');
    } catch (err: any) {
      setPdfResult(`Error processing file: ${err.message}`);
    } finally {
      setPdfLoading(false);
    }
  }

  async function handlePDFAction(action: 'summarize' | 'quiz' | 'notes' | 'explain') {
    if (!pdfText) return;
    setPdfLoading(true);
    try {
      const result = await processPDFContent(pdfText, action);
      setPdfResult(result);
    } catch (err: any) {
      setPdfResult(`Error: ${err.message}`);
    } finally {
      setPdfLoading(false);
    }
  }

  const activeModule = session.learningPath?.modules.find(m => m.id === activeModuleId);
  const totalModules = session.learningPath?.modules.length || 0;
  const completedCount = session.completedModules.length;
  const progressPct = totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0;

  // Group modules by priority
  const groupedModules: Record<string, LearningModule[]> = { critical: [], recommended: [], optional: [] };
  session.learningPath?.modules.forEach(m => {
    (groupedModules[m.priority] || groupedModules.recommended).push(m);
  });

  const priorityMeta: Record<string, { label: string; emoji: string; color: string }> = {
    critical: { label: 'Focus Areas', emoji: '🔴', color: '#e17055' },
    recommended: { label: 'Recommended', emoji: '🟡', color: '#fdcb6e' },
    optional: { label: 'Enrichment', emoji: '🟢', color: '#00b894' },
  };

  // ─── QUIZ PHASE ────────────────────────
  if (phase === 'quiz') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
        <div className="max-w-2xl w-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              <Home size={16} /> Home
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
              {SUBJECTS[session.subject]?.emoji} {session.topicName} • {session.difficulty}
            </div>
          </div>

          {quizLoading ? (
            <div className="glass-card p-12 text-center">
              <Loader2 size={48} className="mx-auto mb-4 animate-spin" style={{ color: 'var(--accent)' }} />
              <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                Generating Your Diagnostic Quiz...
              </h3>
              <p style={{ color: 'var(--text-secondary)' }}>
                Gemini AI is creating personalized questions for you
              </p>
            </div>
          ) : quizError ? (
            <div className="glass-card p-12 text-center">
              <p className="text-lg mb-4" style={{ color: 'var(--danger)' }}>⚠️ {quizError}</p>
              <button onClick={loadQuiz} className="px-6 py-2 rounded-full text-white font-medium"
                style={{ background: 'var(--accent)' }}>
                Retry
              </button>
            </div>
          ) : questions.length > 0 ? (
            <motion.div
              key={currentQ}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Progress */}
              <div className="flex items-center gap-3 mb-6">
                <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>
                  {currentQ + 1}/{questions.length}
                </span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(90deg, #6c5ce7, #a29bfe)' }}
                    initial={{ width: `${(currentQ / questions.length) * 100}%` }}
                    animate={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    background: questions[currentQ].difficulty === 'easy' ? 'rgba(0,184,148,0.1)' :
                      questions[currentQ].difficulty === 'medium' ? 'rgba(253,203,110,0.1)' : 'rgba(225,112,85,0.1)',
                    color: questions[currentQ].difficulty === 'easy' ? 'var(--success)' :
                      questions[currentQ].difficulty === 'medium' ? 'var(--warning)' : 'var(--danger)',
                  }}>
                  {questions[currentQ].difficulty}
                </span>
              </div>

              {/* Question */}
              <div className="glass-card p-8 mb-4">
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--accent)' }}>
                  {questions[currentQ].concept}
                </p>
                <h3 className="text-xl font-bold leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                  {questions[currentQ].question}
                </h3>
              </div>

              {/* Options */}
              <div className="space-y-3">
                {questions[currentQ].options.map((opt, i) => {
                  const isAnswered = answers.length > currentQ;
                  const isSelected = isAnswered && answers[currentQ] === i;
                  const isCorrect = i === questions[currentQ].correctAnswer;
                  let optionClass = 'quiz-option';
                  if (showExplanation) {
                    if (isCorrect) optionClass += ' correct';
                    else if (isSelected && !isCorrect) optionClass += ' incorrect';
                  }

                  return (
                    <button
                      key={i}
                      onClick={() => handleAnswer(i)}
                      disabled={showExplanation}
                      className={`${optionClass} w-full glass-card p-4 text-left flex items-center gap-4 transition-all`}
                    >
                      <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                        style={{
                          background: showExplanation && isCorrect ? 'rgba(0,184,148,0.2)' :
                            showExplanation && isSelected && !isCorrect ? 'rgba(225,112,85,0.2)' : 'var(--accent-glow)',
                          color: showExplanation && isCorrect ? 'var(--success)' :
                            showExplanation && isSelected && !isCorrect ? 'var(--danger)' : 'var(--accent)',
                        }}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{opt}</span>
                      {showExplanation && isCorrect && <CheckCircle2 size={20} className="ml-auto" style={{ color: 'var(--success)' }} />}
                    </button>
                  );
                })}
              </div>

              {/* Explanation */}
              <AnimatePresence>
                {showExplanation && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 p-4 rounded-xl"
                    style={{ background: 'var(--accent-glow)', borderLeft: '4px solid var(--accent)' }}
                  >
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      💡 {questions[currentQ].explanation}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : null}
        </div>
      </div>
    );
  }

  // ─── RESULTS PHASE ────────────────────────
  if (phase === 'results' && session.quizResults) {
    const { score, weakConcepts, strongConcepts } = session.quizResults;
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl w-full"
        >
          <div className="glass-card p-10 text-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="text-6xl mb-4"
            >
              {score >= 80 ? '🌟' : score >= 60 ? '👍' : score >= 40 ? '💪' : '📚'}
            </motion.div>
            <h2 className="text-4xl font-black mb-2" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>
              {score}%
            </h2>
            <p className="text-lg mb-6" style={{ color: 'var(--text-secondary)' }}>
              {score >= 80 ? 'Excellent! You have a strong foundation.' :
                score >= 60 ? 'Good job! Some areas need attention.' :
                  score >= 40 ? 'Decent start. Let's build your skills.' :
                    "Don't worry — we'll create a path to help you master this!"}
            </p>

            {/* Concept breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mt-6">
              {strongConcepts.length > 0 && (
                <div className="p-4 rounded-xl" style={{ background: 'rgba(0,184,148,0.08)' }}>
                  <h4 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--success)' }}>
                    <CheckCircle2 size={16} /> Strong Concepts
                  </h4>
                  <ul className="space-y-1">
                    {strongConcepts.map(c => (
                      <li key={c} className="text-sm" style={{ color: 'var(--text-secondary)' }}>✅ {c}</li>
                    ))}
                  </ul>
                </div>
              )}
              {weakConcepts.length > 0 && (
                <div className="p-4 rounded-xl" style={{ background: 'rgba(225,112,85,0.08)' }}>
                  <h4 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--danger)' }}>
                    <Target size={16} /> Needs Work
                  </h4>
                  <ul className="space-y-1">
                    {weakConcepts.map(c => (
                      <li key={c} className="text-sm" style={{ color: 'var(--text-secondary)' }}>📌 {c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleGeneratePath}
            className="w-full py-4 rounded-2xl font-bold text-lg text-white transition-all hover:scale-[1.02] hover:shadow-xl inline-flex items-center justify-center gap-3"
            style={{ background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)' }}
          >
            <Sparkles size={22} /> Generate My Learning Path
            <ArrowRight size={22} />
          </button>
        </motion.div>
      </div>
    );
  }

  // ─── GENERATING PHASE ────────────────────────
  if (phase === 'generating') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
        <div className="glass-card p-12 text-center max-w-md">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Brain size={56} style={{ color: 'var(--accent)' }} />
          </motion.div>
          <h3 className="text-xl font-bold mt-6 mb-2" style={{ color: 'var(--text-primary)' }}>
            Crafting Your Learning Path...
          </h3>
          <p style={{ color: 'var(--text-secondary)' }}>
            Gemini AI is analyzing your strengths and creating a personalized curriculum
          </p>
          {quizError && <p className="mt-4" style={{ color: 'var(--danger)' }}>{quizError}</p>}
        </div>
      </div>
    );
  }

  // ─── LEARNING PHASE ────────────────────────
  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-primary)' }}>

      {/* LEFT SIDEBAR — Learning Path */}
      <aside
        className={`${sidebarOpen ? 'w-[300px]' : 'w-0'} shrink-0 h-screen overflow-hidden transition-all duration-300 border-r flex flex-col`}
        style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
      >
        <div className="p-4 border-b flex items-center gap-3" style={{ borderColor: 'var(--border)' }}>
          <button onClick={() => navigate('/')} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-secondary)' }}>
            <Home size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
              {session.topicName}
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {session.subject} • {session.difficulty}
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Progress</span>
            <span className="text-xs font-bold" style={{ color: 'var(--accent)' }}>{progressPct}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #6c5ce7, #a29bfe)' }}
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <p className="text-xs mt-1.5" style={{ color: 'var(--text-secondary)' }}>
            {completedCount} of {totalModules} modules complete
          </p>
        </div>

        {/* Module List */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-4">
          {Object.entries(groupedModules).map(([priority, modules]) => {
            if (modules.length === 0) return null;
            const meta = priorityMeta[priority];
            const isExpanded = expandedPhases[priority] !== false;

            return (
              <div key={priority}>
                <button
                  onClick={() => setExpandedPhases(prev => ({ ...prev, [priority]: !isExpanded }))}
                  className="flex items-center gap-2 w-full text-left px-2 py-1.5 text-xs font-bold uppercase tracking-widest transition-colors"
                  style={{ color: meta.color }}
                >
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  {meta.emoji} {meta.label}
                  <span className="ml-auto text-[10px] opacity-60">{modules.length}</span>
                </button>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden space-y-1 mt-1"
                    >
                      {modules.map(mod => {
                        const isActive = activeModuleId === mod.id;
                        const isCompleted = session.completedModules.includes(mod.id);
                        return (
                          <button
                            key={mod.id}
                            onClick={() => { setActiveModuleId(mod.id); navigate(`/learn/${session.id}/${mod.id}`); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm transition-all group"
                            style={{
                              background: isActive ? 'var(--accent-glow)' : 'transparent',
                              color: isActive ? 'var(--accent)' : 'var(--text-primary)',
                            }}
                          >
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleModuleComplete(mod.id); }}
                              className="shrink-0 transition-colors"
                              style={{ color: isCompleted ? 'var(--success)' : 'var(--border)' }}
                            >
                              <CheckCircle2 size={18} fill={isCompleted ? 'currentColor' : 'none'} />
                            </button>
                            <div className="flex-1 min-w-0">
                              <span className="block truncate font-medium">{mod.title}</span>
                              <span className="block text-xs opacity-60 flex items-center gap-1">
                                <Clock size={10} /> {mod.estimatedMinutes}m
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>

        {/* Quiz score */}
        {session.quizResults && (
          <div className="p-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-3 text-sm">
              <Trophy size={18} style={{ color: 'var(--warning)' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Quiz Score:</span>
              <span className="font-bold" style={{ color: 'var(--accent)' }}>{session.quizResults.score}%</span>
            </div>
          </div>
        )}
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 h-screen">
        {/* Top bar */}
        <div className="h-14 border-b flex items-center px-4 gap-3 shrink-0"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-lg transition-colors md:hidden"
            style={{ color: 'var(--text-secondary)' }}>
            <BookOpen size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
              {activeModule?.title || 'Select a module'}
            </h3>
          </div>
          {/* Tab buttons */}
          <div className="flex items-center gap-1">
            {(['content', 'notes', 'exercises', 'pdf'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  if (tab === 'notes' && !shortNotes && !notesLoading) handleGenerateNotes();
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
                style={{
                  background: activeTab === tab ? 'var(--accent-glow)' : 'transparent',
                  color: activeTab === tab ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                {tab === 'content' ? '📖 Learn' :
                  tab === 'notes' ? '📝 Notes' :
                    tab === 'exercises' ? '✏️ Practice' : '📄 PDF'}
              </button>
            ))}
          </div>
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className="p-2 rounded-xl transition-colors relative"
            style={{
              background: chatOpen ? 'var(--accent-glow)' : 'transparent',
              color: chatOpen ? 'var(--accent)' : 'var(--text-secondary)',
            }}
          >
            <MessageSquare size={18} />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Content area */}
          <div className="flex-1 overflow-y-auto p-6 md:p-10">
            {activeModule ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${activeModuleId}-${activeTab}`}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="max-w-3xl mx-auto"
                >
                  {activeTab === 'content' && (
                    <>
                      {/* Module header */}
                      <div className="mb-8">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                            style={{
                              background: activeModule.priority === 'critical' ? 'rgba(225,112,85,0.1)' :
                                activeModule.priority === 'recommended' ? 'rgba(253,203,110,0.1)' : 'rgba(0,184,148,0.1)',
                              color: priorityMeta[activeModule.priority].color,
                            }}>
                            {priorityMeta[activeModule.priority].emoji} {activeModule.priority}
                          </span>
                          <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                            <Clock size={12} /> {activeModule.estimatedMinutes} min
                          </span>
                        </div>
                        <h1 className="text-3xl font-black mb-3" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>
                          {activeModule.title}
                        </h1>
                        <p style={{ color: 'var(--text-secondary)' }}>{activeModule.description}</p>
                        {activeModule.learningObjectives.length > 0 && (
                          <div className="mt-4 p-4 rounded-xl" style={{ background: 'var(--accent-glow)' }}>
                            <h4 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--accent)' }}>
                              <Target size={14} /> Learning Objectives
                            </h4>
                            <ul className="space-y-1">
                              {activeModule.learningObjectives.map((obj, i) => (
                                <li key={i} className="text-sm flex items-start gap-2" style={{ color: 'var(--text-secondary)' }}>
                                  <Zap size={12} className="mt-1 shrink-0" style={{ color: 'var(--accent)' }} />
                                  {obj}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Markdown content */}
                      <div className="prose-custom mb-10">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {activeModule.contentMarkdown}
                        </ReactMarkdown>
                      </div>

                      {/* YouTube Videos */}
                      <div className="mb-10">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                          <Youtube size={20} style={{ color: '#FF0000' }} /> Recommended Videos
                        </h3>
                        {videosLoading ? (
                          <div className="flex items-center gap-2 p-4" style={{ color: 'var(--text-secondary)' }}>
                            <Loader2 size={16} className="animate-spin" /> Finding videos...
                          </div>
                        ) : videos.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {videos.map((vid, i) => (
                              <a
                                key={i}
                                href={vid.videoId ? getYouTubeWatchUrl(vid.videoId) : getYouTubeSearchUrl(activeModule.searchQuery || activeModule.title)}
                                target="_blank"
                                rel="noreferrer"
                                className="glass-card overflow-hidden group hover:scale-[1.02] transition-all"
                              >
                                <div className="aspect-video relative overflow-hidden" style={{ background: 'var(--border)' }}>
                                  {vid.thumbnail && (
                                    <img src={vid.thumbnail} alt={vid.title} className="w-full h-full object-cover" />
                                  )}
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Play size={32} className="text-white" fill="white" />
                                  </div>
                                </div>
                                <div className="p-3">
                                  <h4 className="text-sm font-medium line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                                    {vid.title}
                                  </h4>
                                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                                    {vid.channelTitle}
                                  </p>
                                </div>
                              </a>
                            ))}
                          </div>
                        ) : (
                          <a
                            href={getYouTubeSearchUrl(activeModule.searchQuery || activeModule.title)}
                            target="_blank"
                            rel="noreferrer"
                            className="glass-card p-4 flex items-center gap-3 hover:scale-[1.01] transition-all"
                          >
                            <Youtube size={24} style={{ color: '#FF0000' }} />
                            <span style={{ color: 'var(--text-primary)' }}>Search YouTube for videos on "{activeModule.title}"</span>
                            <ArrowRight size={16} className="ml-auto" style={{ color: 'var(--text-secondary)' }} />
                          </a>
                        )}
                      </div>

                      {/* Mark Complete */}
                      <div className="flex items-center gap-4 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
                        <button
                          onClick={() => toggleModuleComplete(activeModule.id)}
                          className="flex-1 py-3 rounded-xl font-semibold text-white transition-all hover:scale-[1.01] flex items-center justify-center gap-2"
                          style={{
                            background: session.completedModules.includes(activeModule.id)
                              ? 'var(--success)' : 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
                          }}
                        >
                          <CheckCircle2 size={18} />
                          {session.completedModules.includes(activeModule.id) ? 'Completed ✓' : 'Mark as Complete'}
                        </button>
                      </div>
                    </>
                  )}

                  {activeTab === 'notes' && (
                    <div>
                      <h2 className="text-2xl font-bold mb-6 flex items-center gap-3" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>
                        <FileText size={24} style={{ color: 'var(--accent)' }} /> Short Notes
                      </h2>
                      {notesLoading ? (
                        <div className="glass-card p-8 text-center">
                          <Loader2 size={32} className="mx-auto animate-spin mb-3" style={{ color: 'var(--accent)' }} />
                          <p style={{ color: 'var(--text-secondary)' }}>Generating concise notes...</p>
                        </div>
                      ) : shortNotes ? (
                        <div className="prose-custom">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{shortNotes}</ReactMarkdown>
                        </div>
                      ) : (
                        <button onClick={handleGenerateNotes} className="glass-card p-8 w-full text-center glow-card">
                          <Sparkles size={32} className="mx-auto mb-3" style={{ color: 'var(--accent)' }} />
                          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                            Click to generate short notes for this module
                          </p>
                        </button>
                      )}
                    </div>
                  )}

                  {activeTab === 'exercises' && (
                    <div>
                      <h2 className="text-2xl font-bold mb-6 flex items-center gap-3" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>
                        ✏️ Practice Exercises
                      </h2>
                      {activeModule.practiceExercises.length > 0 ? (
                        <div className="space-y-4">
                          {activeModule.practiceExercises.map((ex, i) => (
                            <ExerciseCard key={i} index={i} exercise={ex} />
                          ))}
                        </div>
                      ) : (
                        <p style={{ color: 'var(--text-secondary)' }}>No exercises for this module yet.</p>
                      )}
                    </div>
                  )}

                  {activeTab === 'pdf' && (
                    <div>
                      <h2 className="text-2xl font-bold mb-6 flex items-center gap-3" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>
                        <Upload size={24} style={{ color: 'var(--accent)' }} /> PDF / Document Processor
                      </h2>
                      <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
                        Upload a text file or PDF and let Gemini AI summarize, quiz, or explain it.
                      </p>
                      <label className="glass-card p-8 flex flex-col items-center justify-center cursor-pointer glow-card mb-6">
                        <Upload size={32} className="mb-3" style={{ color: 'var(--accent)' }} />
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                          Click to upload a .txt or .md file
                        </span>
                        <span className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                          (PDF text extraction coming soon)
                        </span>
                        <input type="file" accept=".txt,.md,.csv" onChange={handlePDFUpload} className="hidden" />
                      </label>

                      {pdfText && (
                        <div className="flex gap-2 mb-6 flex-wrap">
                          {(['summarize', 'quiz', 'notes', 'explain'] as const).map(action => (
                            <button
                              key={action}
                              onClick={() => handlePDFAction(action)}
                              disabled={pdfLoading}
                              className="px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize disabled:opacity-40"
                              style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}
                            >
                              {action === 'summarize' ? '📋 Summarize' :
                                action === 'quiz' ? '❓ Generate Quiz' :
                                  action === 'notes' ? '📝 Short Notes' : '💡 Explain Simply'}
                            </button>
                          ))}
                        </div>
                      )}

                      {pdfLoading && (
                        <div className="flex items-center gap-2 p-4" style={{ color: 'var(--text-secondary)' }}>
                          <Loader2 size={16} className="animate-spin" /> Processing document...
                        </div>
                      )}

                      {pdfResult && (
                        <div className="prose-custom glass-card p-6">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{pdfResult}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p style={{ color: 'var(--text-secondary)' }}>Select a module from the sidebar to start learning.</p>
              </div>
            )}
          </div>

          {/* RIGHT SIDEBAR — AI Chat */}
          <AnimatePresence>
            {chatOpen && (
              <motion.aside
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 340, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="h-full border-l flex flex-col shrink-0 overflow-hidden"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
              >
                <div className="p-4 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
                  <Bot size={18} style={{ color: 'var(--accent)' }} />
                  <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Sutra AI Tutor</span>
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse ml-auto" />
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                        style={{
                          background: msg.role === 'user' ? 'var(--accent)' : 'var(--accent-glow)',
                          color: msg.role === 'user' ? 'white' : 'var(--accent)',
                        }}>
                        {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                      </div>
                      <div className="text-sm p-3 rounded-2xl max-w-[80%]"
                        style={{
                          background: msg.role === 'user' ? 'var(--accent)' : 'var(--accent-glow)',
                          color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                          borderTopRightRadius: msg.role === 'user' ? '4px' : undefined,
                          borderTopLeftRadius: msg.role === 'ai' ? '4px' : undefined,
                        }}>
                        {msg.role === 'ai' ? (
                          <div className="prose-custom text-sm">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                          </div>
                        ) : msg.content}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                <div className="p-3 border-t" style={{ borderColor: 'var(--border)' }}>
                  <div className="relative">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleChat()}
                      placeholder="Ask Sutra anything..."
                      disabled={chatLoading}
                      className="w-full px-4 pr-10 py-2.5 rounded-2xl text-sm focus:outline-none focus:ring-2 transition-all disabled:opacity-50"
                      style={{
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <button
                      onClick={handleChat}
                      disabled={!chatInput.trim() || chatLoading}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-colors disabled:opacity-30"
                      style={{ color: 'var(--accent)' }}
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Completion celebration */}
      {progressPct === 100 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-card p-10 text-center max-w-md"
          >
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-black mb-2" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>
              Congratulations, {session.studentName}!
            </h2>
            <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
              You've completed all modules in your learning path. Amazing work!
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-8 py-3 rounded-full font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)' }}
            >
              Back to Home
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// Exercise Card component
function ExerciseCard({ index, exercise }: { index: number; exercise: { question: string; hint: string; answer: string } }) {
  const [showHint, setShowHint] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  return (
    <div className="glass-card p-5">
      <h4 className="font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
        <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
          style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
          {index + 1}
        </span>
        {exercise.question}
      </h4>
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => setShowHint(!showHint)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{ background: 'rgba(253,203,110,0.1)', color: 'var(--warning)' }}
        >
          <Lightbulb size={14} /> {showHint ? 'Hide Hint' : 'Show Hint'}
        </button>
        <button
          onClick={() => setShowAnswer(!showAnswer)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{ background: 'rgba(0,184,148,0.1)', color: 'var(--success)' }}
        >
          {showAnswer ? <EyeOff size={14} /> : <Eye size={14} />}
          {showAnswer ? 'Hide Answer' : 'Show Answer'}
        </button>
      </div>
      <AnimatePresence>
        {showHint && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-3 p-3 rounded-lg text-sm overflow-hidden"
            style={{ background: 'rgba(253,203,110,0.08)', color: 'var(--text-secondary)' }}
          >
            💡 {exercise.hint}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showAnswer && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-3 p-3 rounded-lg text-sm overflow-hidden"
            style={{ background: 'rgba(0,184,148,0.08)', color: 'var(--text-secondary)' }}
          >
            ✅ {exercise.answer}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
