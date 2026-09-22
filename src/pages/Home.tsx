import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SUBJECTS, DIFFICULTY_META, type Subject, type Difficulty } from '../data/subjects';
import type { LearningSession } from '../App';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, BookOpen, Sparkles, Trash2, GraduationCap } from 'lucide-react';

interface HomeProps {
  sessions: LearningSession[];
  addSession: (s: LearningSession) => void;
  deleteSession: (id: string) => void;
}

export default function Home({ sessions, addSession, deleteSession }: HomeProps) {
  const navigate = useNavigate();
  const [view, setView] = useState<'home' | 'name' | 'subject' | 'topic' | 'difficulty'>('home');
  const [studentName, setStudentName] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(
    document.documentElement.classList.contains('dark')
  );

  const toggleDarkMode = () => {
    document.documentElement.classList.toggle('dark');
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('adhyaya_theme', newMode ? 'dark' : 'light');
  };

  const handleStartQuiz = (difficulty: Difficulty) => {
    if (!selectedSubject || !selectedTopicId) return;

    const subjectMeta = SUBJECTS[selectedSubject];
    const topic = subjectMeta.topics.find(t => t.id === selectedTopicId);
    if (!topic) return;

    const session: LearningSession = {
      id: crypto.randomUUID(),
      studentName: studentName.trim() || 'Student',
      subject: selectedSubject,
      topicId: selectedTopicId,
      topicName: topic.name,
      difficulty,
      completedModules: [],
      createdAt: new Date().toISOString(),
    };

    addSession(session);
    navigate(`/learn/${session.id}`);
  };

  const subjectList = Object.keys(SUBJECTS) as Subject[];

  return (
    <div className="min-h-screen flex flex-col items-center p-4 pt-8 relative overflow-hidden"
      style={{ background: 'var(--bg-primary)' }}>

      {/* Ambient background gradient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(253,121,168,0.1) 0%, transparent 70%)' }} />
      </div>

      {/* Top bar */}
      <div className="w-full max-w-5xl flex items-center justify-between mb-8 relative z-10">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
          <GraduationCap size={28} style={{ color: 'var(--accent)' }} />
          <h1 className="text-2xl font-black tracking-tight" style={{ fontFamily: 'Outfit' }}>
            <span className="gradient-text">Adhyaya</span>
            <span style={{ color: 'var(--text-primary)' }}>Sutra</span>
          </h1>
        </div>
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-xl transition-colors"
          style={{ background: 'var(--accent-glow)', color: 'var(--text-secondary)' }}
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>
      </div>

      <div className="max-w-5xl w-full relative z-10">

        {/* HOME VIEW */}
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Hero */}
              <div className="text-center mb-12">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.5 }}
                >
                  <h2 className="text-5xl md:text-6xl font-black mb-4" style={{ fontFamily: 'Outfit' }}>
                    <span className="gradient-text">Learn Smarter,</span>
                    <br />
                    <span style={{ color: 'var(--text-primary)' }}>Not Harder</span>
                  </h2>
                </motion.div>
                <p className="text-lg max-w-2xl mx-auto mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Take a diagnostic quiz. Get an AI-powered personalized learning path
                  with videos, practice exercises, and short notes — all powered by Google Gemini.
                </p>
                <div className="flex items-center justify-center gap-3 mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: 'var(--accent-glow)' }}>
                    <Sparkles size={14} style={{ color: 'var(--accent)' }} /> Gemini AI
                  </span>
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: 'var(--accent-glow)' }}>
                    📹 YouTube Videos
                  </span>
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: 'var(--accent-glow)' }}>
                    📊 Progress Tracking
                  </span>
                </div>
              </div>

              {/* Existing Sessions */}
              {sessions.length > 0 && (
                <div className="mb-10">
                  <h3 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--accent)' }}>
                    Continue Learning
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
                    {sessions.map(session => (
                      <div
                        key={session.id}
                        className="glass-card p-5 cursor-pointer glow-card group relative"
                        onClick={() => navigate(`/learn/${session.id}`)}
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                          className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: 'var(--danger)', background: 'var(--bg-secondary)' }}
                        >
                          <Trash2 size={14} />
                        </button>
                        <div className="text-2xl mb-2">{SUBJECTS[session.subject]?.emoji}</div>
                        <h4 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                          {session.topicName}
                        </h4>
                        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                          {session.subject} • {session.difficulty}
                        </p>
                        <div className="flex items-center gap-2 mt-3">
                          <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--border)' }}>
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${session.learningPath
                                  ? (session.completedModules.length / Math.max(session.learningPath.modules.length, 1)) * 100
                                  : session.quizResults ? 20 : 0
                                }%`,
                                background: 'var(--accent)',
                              }}
                            />
                          </div>
                          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                            {session.completedModules.length}/{session.learningPath?.modules.length || '?'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Start New CTA */}
              <div className="text-center glass-card p-12 glow-card">
                <BookOpen size={48} className="mx-auto mb-4 opacity-50" style={{ color: 'var(--text-secondary)' }} />
                <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                  {sessions.length > 0 ? 'Start a New Learning Path' : 'Start Your Journey'}
                </h3>
                <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
                  Take a diagnostic quiz and get a personalized study plan in minutes.
                </p>
                <button
                  onClick={() => setView('name')}
                  className="px-8 py-3 rounded-full font-semibold text-white transition-all hover:scale-105 hover:shadow-lg inline-flex items-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)' }}
                >
                  <Sparkles size={18} /> Begin Now
                  <ArrowRight size={18} />
                </button>
              </div>
            </motion.div>
          )}

          {/* NAME INPUT */}
          {view === 'name' && (
            <motion.div
              key="name"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
              className="max-w-lg mx-auto"
            >
              <button
                onClick={() => setView('home')}
                className="flex items-center gap-2 mb-6 text-sm font-medium transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                <ArrowLeft size={16} /> Back
              </button>
              <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>
                What's your name? 👋
              </h2>
              <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
                We'll personalize your learning experience.
              </p>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="e.g., Aarav, Priya, John..."
                autoFocus
                className="w-full px-5 py-4 rounded-2xl text-lg font-medium transition-all focus:outline-none focus:ring-2"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '2px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                onKeyDown={(e) => e.key === 'Enter' && studentName.trim() && setView('subject')}
              />
              <button
                onClick={() => studentName.trim() && setView('subject')}
                disabled={!studentName.trim()}
                className="mt-6 w-full py-3.5 rounded-full font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)' }}
              >
                Continue <ArrowRight size={18} />
              </button>
            </motion.div>
          )}

          {/* SUBJECT SELECTION */}
          {view === 'subject' && (
            <motion.div
              key="subject"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
            >
              <button
                onClick={() => setView('name')}
                className="flex items-center gap-2 mb-6 text-sm font-medium transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                <ArrowLeft size={16} /> Back
              </button>
              <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>
                Pick a Subject, {studentName.split(' ')[0]} 📚
              </h2>
              <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
                What do you want to learn today?
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 stagger-children">
                {subjectList.map(subject => {
                  const meta = SUBJECTS[subject];
                  return (
                    <button
                      key={subject}
                      onClick={() => { setSelectedSubject(subject); setView('topic'); }}
                      className="glass-card p-6 text-left glow-card group hover:scale-[1.02] transition-all"
                    >
                      <div className="text-4xl mb-3">{meta.emoji}</div>
                      <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{subject}</h3>
                      <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{meta.description}</p>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* TOPIC SELECTION */}
          {view === 'topic' && selectedSubject && (
            <motion.div
              key="topic"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
            >
              <button
                onClick={() => setView('subject')}
                className="flex items-center gap-2 mb-6 text-sm font-medium transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                <ArrowLeft size={16} /> Back
              </button>
              <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>
                Choose a Topic in {selectedSubject} {SUBJECTS[selectedSubject].emoji}
              </h2>
              <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
                Select the specific area you'd like to master.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
                {SUBJECTS[selectedSubject].topics.map(topic => (
                  <button
                    key={topic.id}
                    onClick={() => { setSelectedTopicId(topic.id); setView('difficulty'); }}
                    className="glass-card p-5 text-left glow-card group hover:scale-[1.02] transition-all flex items-center gap-4"
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-lg font-bold"
                      style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
                      {topic.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>{topic.name}</h3>
                      <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{topic.description}</p>
                    </div>
                    <ArrowRight size={18} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      style={{ color: 'var(--accent)' }} />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* DIFFICULTY SELECTION */}
          {view === 'difficulty' && selectedSubject && selectedTopicId && (
            <motion.div
              key="difficulty"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
            >
              <button
                onClick={() => setView('topic')}
                className="flex items-center gap-2 mb-6 text-sm font-medium transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                <ArrowLeft size={16} /> Back
              </button>
              <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>
                How experienced are you? 🎯
              </h2>
              <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
                This helps us calibrate the quiz and learning path to your level.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger-children">
                {(Object.keys(DIFFICULTY_META) as Difficulty[]).map(diff => {
                  const meta = DIFFICULTY_META[diff];
                  return (
                    <button
                      key={diff}
                      onClick={() => handleStartQuiz(diff)}
                      className={`glass-card p-6 text-left glow-card group hover:scale-[1.02] transition-all border-2 ${meta.color}`}
                    >
                      <div className="text-3xl mb-3">{meta.emoji}</div>
                      <h3 className="font-bold text-xl mb-2" style={{ color: 'var(--text-primary)' }}>{diff}</h3>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{meta.description}</p>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-12 pb-4 text-center text-xs relative z-10" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>
        Built with ❤️ using Google Gemini, YouTube Data API & Google Sheets
      </div>
    </div>
  );
}
