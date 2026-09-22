export type Subject =
  | 'Mathematics'
  | 'Science'
  | 'Computer Science'
  | 'History'
  | 'Geography'
  | 'English';

export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export interface SubjectTopic {
  id: string;
  name: string;
  description: string;
  searchKeywords: string; // used for YouTube queries
}

export interface SubjectMeta {
  emoji: string;
  color: string;
  gradient: string;
  description: string;
  topics: SubjectTopic[];
}

export const SUBJECTS: Record<Subject, SubjectMeta> = {
  Mathematics: {
    emoji: '🧮',
    color: 'from-blue-500 to-indigo-600',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    description: 'Numbers, equations, geometry & logic',
    topics: [
      { id: 'algebra-basics', name: 'Algebra Basics', description: 'Variables, expressions, and equations', searchKeywords: 'algebra basics tutorial' },
      { id: 'geometry', name: 'Geometry', description: 'Shapes, angles, area, and volume', searchKeywords: 'geometry fundamentals tutorial' },
      { id: 'trigonometry', name: 'Trigonometry', description: 'Sin, cos, tan and their applications', searchKeywords: 'trigonometry basics tutorial' },
      { id: 'statistics', name: 'Statistics & Probability', description: 'Data analysis and probability theory', searchKeywords: 'statistics probability tutorial' },
      { id: 'calculus', name: 'Calculus', description: 'Limits, derivatives, and integrals', searchKeywords: 'calculus tutorial beginners' },
    ],
  },
  Science: {
    emoji: '🔬',
    color: 'from-emerald-500 to-teal-600',
    gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    description: 'Physics, chemistry, biology & earth science',
    topics: [
      { id: 'physics-fundamentals', name: 'Physics Fundamentals', description: 'Forces, motion, and energy', searchKeywords: 'physics fundamentals tutorial' },
      { id: 'chemistry-basics', name: 'Chemistry Basics', description: 'Elements, compounds, and reactions', searchKeywords: 'chemistry basics tutorial' },
      { id: 'biology-101', name: 'Biology 101', description: 'Cells, genetics, and evolution', searchKeywords: 'biology basics tutorial' },
      { id: 'photosynthesis', name: 'Photosynthesis', description: 'How plants convert sunlight to energy', searchKeywords: 'photosynthesis explained' },
      { id: 'human-body', name: 'Human Body Systems', description: 'Organs, circulation, and nervous system', searchKeywords: 'human body systems tutorial' },
    ],
  },
  'Computer Science': {
    emoji: '💻',
    color: 'from-orange-500 to-red-600',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    description: 'Programming, algorithms & data structures',
    topics: [
      { id: 'python-basics', name: 'Python Basics', description: 'Variables, loops, and functions', searchKeywords: 'python programming basics tutorial' },
      { id: 'data-structures', name: 'Data Structures', description: 'Arrays, linked lists, trees, and graphs', searchKeywords: 'data structures tutorial' },
      { id: 'web-development', name: 'Web Development', description: 'HTML, CSS, JavaScript fundamentals', searchKeywords: 'web development basics tutorial' },
      { id: 'algorithms', name: 'Algorithms', description: 'Sorting, searching, and problem solving', searchKeywords: 'algorithms tutorial beginners' },
      { id: 'databases', name: 'Databases', description: 'SQL, NoSQL, and data modeling', searchKeywords: 'database fundamentals tutorial' },
    ],
  },
  History: {
    emoji: '📖',
    color: 'from-amber-500 to-orange-600',
    gradient: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
    description: 'Ancient civilizations to modern world',
    topics: [
      { id: 'ancient-civilizations', name: 'Ancient Civilizations', description: 'Mesopotamia, Egypt, Greece, Rome', searchKeywords: 'ancient civilizations history' },
      { id: 'medieval-history', name: 'Medieval History', description: 'Dark Ages, feudalism, and Crusades', searchKeywords: 'medieval history tutorial' },
      { id: 'indian-history', name: 'Indian History', description: 'Vedic period to modern India', searchKeywords: 'indian history overview' },
      { id: 'world-wars', name: 'World Wars', description: 'WWI, WWII, causes, and aftermath', searchKeywords: 'world wars history explained' },
      { id: 'modern-world', name: 'Modern World History', description: 'Cold War to present day', searchKeywords: 'modern world history' },
    ],
  },
  Geography: {
    emoji: '🌍',
    color: 'from-cyan-500 to-blue-600',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    description: 'Earth, climate, maps & cultures',
    topics: [
      { id: 'physical-geography', name: 'Physical Geography', description: 'Landforms, rivers, and mountains', searchKeywords: 'physical geography tutorial' },
      { id: 'climate-weather', name: 'Climate & Weather', description: 'Atmospheric systems and climate zones', searchKeywords: 'climate weather geography' },
      { id: 'indian-geography', name: 'Indian Geography', description: 'Rivers, states, and natural resources', searchKeywords: 'indian geography overview' },
      { id: 'world-maps', name: 'World Maps & Continents', description: 'Countries, capitals, and regions', searchKeywords: 'world geography continents' },
      { id: 'environment', name: 'Environment & Ecology', description: 'Ecosystems, biodiversity, and conservation', searchKeywords: 'environment ecology basics' },
    ],
  },
  English: {
    emoji: '📝',
    color: 'from-violet-500 to-purple-600',
    gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    description: 'Grammar, literature & comprehension',
    topics: [
      { id: 'grammar-basics', name: 'Grammar Basics', description: 'Parts of speech, tenses, and sentence structure', searchKeywords: 'english grammar basics tutorial' },
      { id: 'reading-comprehension', name: 'Reading Comprehension', description: 'Understanding texts, inference, and analysis', searchKeywords: 'reading comprehension strategies' },
      { id: 'creative-writing', name: 'Creative Writing', description: 'Storytelling, essays, and poetry', searchKeywords: 'creative writing tips tutorial' },
      { id: 'vocabulary', name: 'Vocabulary Building', description: 'Word roots, synonyms, and usage', searchKeywords: 'vocabulary building techniques' },
      { id: 'literature', name: 'Literature Studies', description: 'Classic works, themes, and literary devices', searchKeywords: 'literature analysis tutorial' },
    ],
  },
};

export const DIFFICULTY_META: Record<Difficulty, { emoji: string; color: string; description: string }> = {
  Beginner: {
    emoji: '🌱',
    color: 'text-emerald-500 border-emerald-500/30 bg-emerald-500/5',
    description: "I'm new to this topic — start from the foundations",
  },
  Intermediate: {
    emoji: '🌿',
    color: 'text-amber-500 border-amber-500/30 bg-amber-500/5',
    description: "I know the basics — take me deeper",
  },
  Advanced: {
    emoji: '🌳',
    color: 'text-red-500 border-red-500/30 bg-red-500/5',
    description: "I want mastery — challenge me with advanced problems",
  },
};
