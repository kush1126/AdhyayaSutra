import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import type { Subject, Difficulty } from './data/subjects';
import type { DiagnosticQuestion, LearningPath } from './utils/gemini';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import './App.css';

export interface LearningSession {
  id: string;
  studentName: string;
  subject: Subject;
  topicId: string;
  topicName: string;
  difficulty: Difficulty;
  quizResults?: {
    questions: DiagnosticQuestion[];
    answers: number[];
    score: number;
    weakConcepts: string[];
    strongConcepts: string[];
  };
  learningPath?: LearningPath;
  completedModules: string[];
  lastViewedModule?: string;
  createdAt: string;
}

// Load sessions from localStorage
function loadSessions(): LearningSession[] {
  try {
    return JSON.parse(localStorage.getItem('adhyaya_sessions') || '[]');
  } catch {
    return [];
  }
}

function saveSessions(sessions: LearningSession[]) {
  localStorage.setItem('adhyaya_sessions', JSON.stringify(sessions));
}

function App() {
  const [sessions, setSessions] = useState<LearningSession[]>(loadSessions);

  useEffect(() => {
    saveSessions(sessions);
  }, [sessions]);

  const addSession = (session: LearningSession) => {
    setSessions(prev => [...prev, session]);
  };

  const updateSession = (session: LearningSession) => {
    setSessions(prev => prev.map(s => s.id === session.id ? session : s));
  };

  const deleteSession = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Home
            sessions={sessions}
            addSession={addSession}
            deleteSession={deleteSession}
          />
        }
      />
      <Route
        path="/learn/:sessionId"
        element={
          <Dashboard
            sessions={sessions}
            updateSession={updateSession}
            deleteSession={deleteSession}
          />
        }
      />
      <Route
        path="/learn/:sessionId/:moduleId"
        element={
          <Dashboard
            sessions={sessions}
            updateSession={updateSession}
            deleteSession={deleteSession}
          />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
