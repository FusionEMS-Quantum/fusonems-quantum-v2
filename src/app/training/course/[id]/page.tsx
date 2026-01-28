'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlayCircle,
  PauseCircle,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Maximize,
  FileText,
  Bookmark,
  BookmarkCheck,
  CheckCircle,
  Circle,
  Clock,
  Download,
  Share2,
  ChevronRight,
  ChevronLeft,
  Settings,
  PictureInPicture,
  Menu,
  X,
  Edit3,
  Save,
  FileDown,
  Award,
  Target,
  TrendingUp,
  Book,
  HelpCircle,
  Zap,
  MousePointer,
} from 'lucide-react';

interface Chapter {
  id: string;
  title: string;
  duration: number;
  startTime: number;
  completed: boolean;
  hasQuiz: boolean;
}

interface Note {
  id: string;
  timestamp: number;
  content: string;
  isHighlight: boolean;
  createdAt: Date;
}

interface Quiz {
  id: string;
  timestamp: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface Resource {
  id: string;
  title: string;
  type: 'pdf' | 'doc' | 'link' | 'scenario';
  url: string;
  size?: string;
}

export default function CoursePlayerPage({ params }: { params: { id: string } }) {
  const [courseId] = useState(params.id);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(3600);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showResources, setShowResources] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showQuizResult, setShowQuizResult] = useState(false);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [isPiPMode, setIsPiPMode] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const [chapters] = useState<Chapter[]>([
    {
      id: '1',
      title: 'Introduction to Patient Assessment',
      duration: 600,
      startTime: 0,
      completed: true,
      hasQuiz: false,
    },
    {
      id: '2',
      title: 'Primary Assessment Protocol',
      duration: 900,
      startTime: 600,
      completed: true,
      hasQuiz: true,
    },
    {
      id: '3',
      title: 'Vital Signs Monitoring',
      duration: 720,
      startTime: 1500,
      completed: false,
      hasQuiz: true,
    },
    {
      id: '4',
      title: 'Secondary Assessment',
      duration: 840,
      startTime: 2220,
      completed: false,
      hasQuiz: false,
    },
    {
      id: '5',
      title: 'Documentation Best Practices',
      duration: 540,
      startTime: 3060,
      completed: false,
      hasQuiz: true,
    },
  ]);

  const [quizzes] = useState<Quiz[]>([
    {
      id: 'q1',
      timestamp: 1400,
      question: 'What is the first step in the primary assessment?',
      options: [
        'Check breathing',
        'Scene safety assessment',
        'Check pulse',
        'Call for backup',
      ],
      correctAnswer: 1,
      explanation:
        'Scene safety must always be assessed first to ensure the safety of both the responder and the patient.',
    },
    {
      id: 'q2',
      timestamp: 2100,
      question: 'Normal adult respiratory rate range is:',
      options: ['8-12 breaths/min', '12-20 breaths/min', '20-30 breaths/min', '30-40 breaths/min'],
      correctAnswer: 1,
      explanation:
        'Normal adult respiratory rate is 12-20 breaths per minute at rest.',
    },
  ]);

  const [resources] = useState<Resource[]>([
    {
      id: 'r1',
      title: 'Patient Assessment Checklist',
      type: 'pdf',
      url: '/resources/assessment-checklist.pdf',
      size: '2.4 MB',
    },
    {
      id: 'r2',
      title: 'Vital Signs Reference Chart',
      type: 'pdf',
      url: '/resources/vital-signs.pdf',
      size: '1.8 MB',
    },
    {
      id: 'r3',
      title: 'Interactive Scenario: Cardiac Arrest',
      type: 'scenario',
      url: '/scenarios/cardiac-arrest',
    },
    {
      id: 'r4',
      title: 'Documentation Templates',
      type: 'doc',
      url: '/resources/templates.docx',
      size: '856 KB',
    },
  ]);

  const courseProgress = Math.round(
    (chapters.filter((c) => c.completed).length / chapters.length) * 100
  );

  const getCurrentChapter = () => {
    return chapters.find(
      (ch, idx) =>
        currentTime >= ch.startTime &&
        (idx === chapters.length - 1 || currentTime < chapters[idx + 1].startTime)
    );
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (progressBarRef.current) {
      const rect = progressBarRef.current.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      setCurrentTime(pos * duration);
    }
  };

  const skipForward = () => {
    setCurrentTime(Math.min(currentTime + 10, duration));
  };

  const skipBackward = () => {
    setCurrentTime(Math.max(currentTime - 10, 0));
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const addBookmark = () => {
    if (!bookmarks.includes(currentTime)) {
      setBookmarks([...bookmarks, currentTime].sort((a, b) => a - b));
    }
  };

  const removeBookmark = (time: number) => {
    setBookmarks(bookmarks.filter((b) => b !== time));
  };

  const addNote = () => {
    if (newNote.trim()) {
      const note: Note = {
        id: Date.now().toString(),
        timestamp: currentTime,
        content: newNote,
        isHighlight: false,
        createdAt: new Date(),
      };
      setNotes([...notes, note].sort((a, b) => a.timestamp - b.timestamp));
      setNewNote('');
    }
  };

  const toggleHighlight = (noteId: string) => {
    setNotes(
      notes.map((n) => (n.id === noteId ? { ...n, isHighlight: !n.isHighlight } : n))
    );
  };

  const deleteNote = (noteId: string) => {
    setNotes(notes.filter((n) => n.id !== noteId));
  };

  const exportNotes = () => {
    const notesText = notes
      .map((n) => `[${formatTime(n.timestamp)}] ${n.content}`)
      .join('\n\n');
    const blob = new Blob([notesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `course-notes-${courseId}.txt`;
    a.click();
  };

  const jumpToChapter = (startTime: number) => {
    setCurrentTime(startTime);
  };

  const submitQuizAnswer = () => {
    if (activeQuiz && selectedAnswer !== null) {
      setShowQuizResult(true);
    }
  };

  const closeQuiz = () => {
    setActiveQuiz(null);
    setSelectedAnswer(null);
    setShowQuizResult(false);
    setIsPlaying(true);
  };

  const togglePiP = async () => {
    if (videoRef.current) {
      if (!document.pictureInPictureElement) {
        await videoRef.current.requestPictureInPicture();
        setIsPiPMode(true);
      } else {
        await document.exitPictureInPicture();
        setIsPiPMode(false);
      }
    }
  };

  useEffect(() => {
    const checkForQuiz = () => {
      const quiz = quizzes.find(
        (q) => Math.abs(q.timestamp - currentTime) < 1 && !activeQuiz
      );
      if (quiz) {
        setIsPlaying(false);
        setActiveQuiz(quiz);
      }
    };

    checkForQuiz();
  }, [currentTime, quizzes, activeQuiz]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (activeQuiz) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'ArrowRight':
          skipForward();
          break;
        case 'ArrowLeft':
          skipBackward();
          break;
        case 'm':
          toggleMute();
          break;
        case 'b':
          addBookmark();
          break;
        case 'n':
          setShowNotes(!showNotes);
          break;
        case 't':
          setShowTranscript(!showTranscript);
          break;
        case 's':
          setShowSidebar(!showSidebar);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isPlaying, showNotes, showTranscript, showSidebar, activeQuiz]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= duration) {
            setIsPlaying(false);
            return duration;
          }
          return prev + 0.1;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold">Advanced Patient Assessment</h1>
              <p className="text-sm text-slate-400">NREMT Paramedic Certification</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${courseProgress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <span className="text-sm font-medium">{courseProgress}%</span>
            </div>
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors">
              Mark Complete
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Sidebar */}
        <AnimatePresence>
          {showSidebar && (
            <motion.aside
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: 'spring', damping: 25 }}
              className="w-80 border-r border-slate-800 bg-slate-950/50 backdrop-blur-sm overflow-y-auto"
            >
              <div className="p-6 space-y-6">
                {/* Progress Overview */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-400">
                    Course Progress
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800">
                      <div className="flex items-center gap-2 text-blue-400 mb-1">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-xs font-medium">Completed</span>
                      </div>
                      <p className="text-2xl font-bold">
                        {chapters.filter((c) => c.completed).length}/{chapters.length}
                      </p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800">
                      <div className="flex items-center gap-2 text-purple-400 mb-1">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs font-medium">Time Left</span>
                      </div>
                      <p className="text-2xl font-bold">{formatTime(duration - currentTime)}</p>
                    </div>
                  </div>
                </div>

                {/* Chapters */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-400">
                    Course Modules
                  </h3>
                  <div className="space-y-2">
                    {chapters.map((chapter, idx) => {
                      const isCurrent = getCurrentChapter()?.id === chapter.id;
                      return (
                        <motion.button
                          key={chapter.id}
                          whileHover={{ x: 4 }}
                          onClick={() => jumpToChapter(chapter.startTime)}
                          className={`w-full text-left p-3 rounded-lg transition-all ${
                            isCurrent
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-900/50 hover:bg-slate-800 border border-slate-800'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5">
                              {chapter.completed ? (
                                <CheckCircle className="w-5 h-5 text-green-400" />
                              ) : (
                                <Circle className="w-5 h-5 text-slate-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-slate-400">
                                  Module {idx + 1}
                                </span>
                                {chapter.hasQuiz && (
                                  <HelpCircle className="w-3.5 h-3.5 text-yellow-400" />
                                )}
                              </div>
                              <p className="font-medium text-sm mb-1 line-clamp-2">
                                {chapter.title}
                              </p>
                              <p className="text-xs text-slate-400">
                                {formatTime(chapter.duration)}
                              </p>
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Bookmarks */}
                {bookmarks.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-400">
                      Bookmarks
                    </h3>
                    <div className="space-y-2">
                      {bookmarks.map((time, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 bg-slate-900/50 rounded-lg border border-slate-800"
                        >
                          <button
                            onClick={() => setCurrentTime(time)}
                            className="flex items-center gap-2 flex-1 text-left hover:text-blue-400 transition-colors"
                          >
                            <Bookmark className="w-4 h-4 text-yellow-400" />
                            <span className="text-sm font-medium">{formatTime(time)}</span>
                          </button>
                          <button
                            onClick={() => removeBookmark(time)}
                            className="p-1 hover:bg-slate-800 rounded transition-colors"
                          >
                            <X className="w-4 h-4 text-slate-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-6 space-y-6">
            {/* Video Player */}
            <div className="relative bg-black rounded-xl overflow-hidden shadow-2xl">
              {/* Video Placeholder */}
              <div className="aspect-video bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center relative">
                <div className="text-center space-y-4">
                  <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                    <PlayCircle className="w-12 h-12 text-slate-400" />
                  </div>
                  <p className="text-slate-400">Video Player</p>
                  <p className="text-sm text-slate-500">
                    Chapter: {getCurrentChapter()?.title}
                  </p>
                </div>

                {/* Chapter Indicator */}
                <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-sm px-4 py-2 rounded-lg">
                  <p className="text-sm font-medium">{getCurrentChapter()?.title}</p>
                </div>

                {/* Bookmark Button */}
                <button
                  onClick={addBookmark}
                  className="absolute top-4 right-4 p-2 bg-black/80 backdrop-blur-sm hover:bg-black/90 rounded-lg transition-colors"
                  title="Add Bookmark (B)"
                >
                  {bookmarks.includes(Math.floor(currentTime)) ? (
                    <BookmarkCheck className="w-5 h-5 text-yellow-400" />
                  ) : (
                    <Bookmark className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Controls */}
              <div className="bg-gradient-to-t from-black/95 via-black/80 to-transparent absolute bottom-0 left-0 right-0 p-4 space-y-3">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div
                    ref={progressBarRef}
                    className="h-2 bg-slate-800 rounded-full cursor-pointer relative overflow-visible group"
                    onClick={handleProgressClick}
                  >
                    {/* Chapter Markers */}
                    {chapters.map((ch) => (
                      <div
                        key={ch.id}
                        className="absolute top-0 bottom-0 w-0.5 bg-slate-600"
                        style={{ left: `${(ch.startTime / duration) * 100}%` }}
                      />
                    ))}

                    {/* Bookmarks */}
                    {bookmarks.map((time, idx) => (
                      <div
                        key={idx}
                        className="absolute -top-1 w-1 h-4 bg-yellow-400 rounded-full"
                        style={{ left: `${(time / duration) * 100}%` }}
                      />
                    ))}

                    {/* Progress */}
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full relative"
                      style={{ width: `${(currentTime / duration) * 100}%` }}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.div>
                  </div>

                  {/* Time Display */}
                  <div className="flex items-center justify-between text-sm">
                    <span>{formatTime(currentTime)}</span>
                    <span className="text-slate-400">{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={skipBackward}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      title="Skip Backward (←)"
                    >
                      <SkipBack className="w-5 h-5" />
                    </button>
                    <button
                      onClick={togglePlayPause}
                      className="p-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                      title="Play/Pause (Space)"
                    >
                      {isPlaying ? (
                        <PauseCircle className="w-6 h-6" />
                      ) : (
                        <PlayCircle className="w-6 h-6" />
                      )}
                    </button>
                    <button
                      onClick={skipForward}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      title="Skip Forward (→)"
                    >
                      <SkipForward className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-2 ml-2">
                      <button
                        onClick={toggleMute}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        title="Mute (M)"
                      >
                        {isMuted ? (
                          <VolumeX className="w-5 h-5" />
                        ) : (
                          <Volume2 className="w-5 h-5" />
                        )}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={isMuted ? 0 : volume}
                        onChange={(e) => {
                          setVolume(parseFloat(e.target.value));
                          setIsMuted(false);
                        }}
                        className="w-20 accent-blue-500"
                      />
                    </div>

                    <div className="relative ml-2">
                      <button
                        onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Settings className="w-5 h-5" />
                        <span className="text-sm">{playbackSpeed}x</span>
                      </button>
                      <AnimatePresence>
                        {showSettingsMenu && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute bottom-full mb-2 left-0 bg-slate-900 border border-slate-700 rounded-lg p-2 space-y-1 min-w-[120px]"
                          >
                            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                              <button
                                key={speed}
                                onClick={() => {
                                  setPlaybackSpeed(speed);
                                  setShowSettingsMenu(false);
                                }}
                                className={`w-full text-left px-3 py-2 rounded hover:bg-slate-800 transition-colors ${
                                  playbackSpeed === speed ? 'bg-blue-600' : ''
                                }`}
                              >
                                {speed}x
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowTranscript(!showTranscript)}
                      className={`p-2 rounded-lg transition-colors ${
                        showTranscript ? 'bg-blue-600' : 'hover:bg-white/10'
                      }`}
                      title="Toggle Transcript (T)"
                    >
                      <FileText className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setShowNotes(!showNotes)}
                      className={`p-2 rounded-lg transition-colors ${
                        showNotes ? 'bg-blue-600' : 'hover:bg-white/10'
                      }`}
                      title="Toggle Notes (N)"
                    >
                      <Edit3 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={togglePiP}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      title="Picture-in-Picture"
                    >
                      <PictureInPicture className="w-5 h-5" />
                    </button>
                    <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                      <Maximize className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800">
              <button
                onClick={() => {
                  setShowNotes(true);
                  setShowResources(false);
                  setShowTranscript(false);
                }}
                className={`px-4 py-3 font-medium transition-colors relative ${
                  showNotes
                    ? 'text-blue-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Notes {notes.length > 0 && `(${notes.length})`}
                {showNotes && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
                  />
                )}
              </button>
              <button
                onClick={() => {
                  setShowTranscript(true);
                  setShowNotes(false);
                  setShowResources(false);
                }}
                className={`px-4 py-3 font-medium transition-colors relative ${
                  showTranscript
                    ? 'text-blue-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Transcript
                {showTranscript && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
                  />
                )}
              </button>
              <button
                onClick={() => {
                  setShowResources(true);
                  setShowNotes(false);
                  setShowTranscript(false);
                }}
                className={`px-4 py-3 font-medium transition-colors relative ${
                  showResources
                    ? 'text-blue-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Resources
                {showResources && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
                  />
                )}
              </button>
            </div>

            {/* Notes Panel */}
            <AnimatePresence mode="wait">
              {showNotes && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="space-y-4"
                >
                  <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">My Notes</h3>
                      {notes.length > 0 && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={exportNotes}
                            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                          >
                            <FileDown className="w-4 h-4" />
                            Export PDF
                          </button>
                          <button className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                            <Share2 className="w-4 h-4" />
                            Share
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Add Note */}
                    <div className="mb-6 space-y-3">
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Clock className="w-4 h-4" />
                        <span>Current time: {formatTime(currentTime)}</span>
                      </div>
                      <textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Add a note at this timestamp..."
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        rows={3}
                      />
                      <div className="flex justify-end">
                        <button
                          onClick={addNote}
                          disabled={!newNote.trim()}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-medium flex items-center gap-2 transition-colors"
                        >
                          <Save className="w-4 h-4" />
                          Save Note
                        </button>
                      </div>
                    </div>

                    {/* Notes List */}
                    <div className="space-y-3">
                      {notes.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                          <Edit3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>No notes yet. Start taking notes as you learn!</p>
                        </div>
                      ) : (
                        notes.map((note) => (
                          <motion.div
                            key={note.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`bg-slate-800/50 border rounded-lg p-4 ${
                              note.isHighlight
                                ? 'border-yellow-500/50 bg-yellow-500/5'
                                : 'border-slate-700'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <button
                                  onClick={() => setCurrentTime(note.timestamp)}
                                  className="text-sm text-blue-400 hover:text-blue-300 font-medium mb-2 flex items-center gap-2"
                                >
                                  <Clock className="w-3.5 h-3.5" />
                                  {formatTime(note.timestamp)}
                                </button>
                                <p className="text-slate-200 whitespace-pre-wrap">
                                  {note.content}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => toggleHighlight(note.id)}
                                  className={`p-2 rounded-lg transition-colors ${
                                    note.isHighlight
                                      ? 'text-yellow-400 hover:bg-yellow-500/10'
                                      : 'text-slate-400 hover:bg-slate-700'
                                  }`}
                                  title="Highlight"
                                >
                                  <Zap className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => deleteNote(note.id)}
                                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                                  title="Delete"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Transcript Panel */}
              {showTranscript && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="bg-slate-900/50 border border-slate-800 rounded-xl p-6"
                >
                  <h3 className="text-lg font-semibold mb-4">Transcript</h3>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {[
                      {
                        time: 0,
                        speaker: 'Instructor',
                        text: 'Welcome to Advanced Patient Assessment. In this module, we will cover the essential steps for conducting thorough patient evaluations in emergency situations.',
                      },
                      {
                        time: 15,
                        speaker: 'Instructor',
                        text: 'The primary assessment begins with scene safety. Never approach a patient without first ensuring the environment is safe for both you and the patient.',
                      },
                      {
                        time: 35,
                        speaker: 'Instructor',
                        text: 'Once scene safety is confirmed, we move to the primary survey: Airway, Breathing, Circulation, Disability, and Exposure.',
                      },
                    ].map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentTime(item.time)}
                        className="text-left w-full p-3 hover:bg-slate-800/50 rounded-lg transition-colors group"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-sm text-blue-400 font-medium min-w-[60px] group-hover:text-blue-300">
                            {formatTime(item.time)}
                          </span>
                          <div className="flex-1">
                            <span className="text-sm font-medium text-slate-400">
                              {item.speaker}:
                            </span>
                            <p className="text-slate-200 mt-1">{item.text}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Resources Panel */}
              {showResources && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="space-y-4"
                >
                  <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold mb-4">Course Resources</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {resources.map((resource) => (
                        <motion.a
                          key={resource.id}
                          href={resource.url}
                          whileHover={{ scale: 1.02 }}
                          className="bg-slate-800/50 border border-slate-700 hover:border-blue-500/50 rounded-lg p-4 transition-all group"
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-slate-700 rounded-lg group-hover:bg-blue-600 transition-colors">
                              {resource.type === 'pdf' && <FileText className="w-5 h-5" />}
                              {resource.type === 'doc' && <FileText className="w-5 h-5" />}
                              {resource.type === 'scenario' && <Target className="w-5 h-5" />}
                              {resource.type === 'link' && <Book className="w-5 h-5" />}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium mb-1 group-hover:text-blue-400 transition-colors">
                                {resource.title}
                              </p>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-400 uppercase">
                                  {resource.type}
                                </span>
                                {resource.size && (
                                  <>
                                    <span className="text-slate-600">•</span>
                                    <span className="text-xs text-slate-400">
                                      {resource.size}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            <Download className="w-5 h-5 text-slate-400 group-hover:text-blue-400 transition-colors" />
                          </div>
                        </motion.a>
                      ))}
                    </div>
                  </div>

                  {/* Related Courses */}
                  <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold mb-4">Related Courses</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        {
                          title: 'Advanced Airway Management',
                          duration: '2h 15m',
                          level: 'Advanced',
                        },
                        {
                          title: 'Trauma Assessment Protocol',
                          duration: '1h 45m',
                          level: 'Intermediate',
                        },
                        {
                          title: 'Pediatric Emergency Care',
                          duration: '3h 00m',
                          level: 'Advanced',
                        },
                      ].map((course, idx) => (
                        <motion.button
                          key={idx}
                          whileHover={{ scale: 1.02 }}
                          className="bg-slate-800/50 border border-slate-700 hover:border-blue-500/50 rounded-lg p-4 text-left transition-all"
                        >
                          <div className="aspect-video bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg mb-3 flex items-center justify-center">
                            <Award className="w-8 h-8" />
                          </div>
                          <h4 className="font-medium mb-2">{course.title}</h4>
                          <div className="flex items-center justify-between text-sm text-slate-400">
                            <span>{course.duration}</span>
                            <span className="px-2 py-1 bg-slate-700 rounded text-xs">
                              {course.level}
                            </span>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Quiz Popup */}
      <AnimatePresence>
        {activeQuiz && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-2xl w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-600 rounded-xl">
                    <HelpCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Knowledge Check</h3>
                    <p className="text-sm text-slate-400">
                      Answer to continue the course
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeQuiz}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                  <p className="text-lg font-medium">{activeQuiz.question}</p>
                </div>

                <div className="space-y-3">
                  {activeQuiz.options.map((option, idx) => (
                    <motion.button
                      key={idx}
                      whileHover={{ scale: 1.01 }}
                      onClick={() => setSelectedAnswer(idx)}
                      disabled={showQuizResult}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        showQuizResult
                          ? idx === activeQuiz.correctAnswer
                            ? 'bg-green-500/20 border-green-500'
                            : idx === selectedAnswer
                            ? 'bg-red-500/20 border-red-500'
                            : 'bg-slate-800/50 border-slate-700'
                          : selectedAnswer === idx
                          ? 'bg-blue-600 border-blue-600'
                          : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            showQuizResult && idx === activeQuiz.correctAnswer
                              ? 'bg-green-500 border-green-500'
                              : showQuizResult && idx === selectedAnswer
                              ? 'bg-red-500 border-red-500'
                              : selectedAnswer === idx
                              ? 'bg-white border-white'
                              : 'border-slate-600'
                          }`}
                        >
                          {showQuizResult && idx === activeQuiz.correctAnswer && (
                            <CheckCircle className="w-4 h-4 text-white" />
                          )}
                          {showQuizResult &&
                            idx === selectedAnswer &&
                            idx !== activeQuiz.correctAnswer && (
                              <X className="w-4 h-4 text-white" />
                            )}
                        </div>
                        <span className="font-medium">{option}</span>
                      </div>
                    </motion.button>
                  ))}
                </div>

                {showQuizResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl ${
                      selectedAnswer === activeQuiz.correctAnswer
                        ? 'bg-green-500/20 border border-green-500'
                        : 'bg-red-500/20 border border-red-500'
                    }`}
                  >
                    <p className="font-medium mb-2">
                      {selectedAnswer === activeQuiz.correctAnswer
                        ? 'Correct!'
                        : 'Incorrect'}
                    </p>
                    <p className="text-sm text-slate-300">{activeQuiz.explanation}</p>
                  </motion.div>
                )}

                <div className="flex justify-end gap-3">
                  {!showQuizResult ? (
                    <button
                      onClick={submitQuizAnswer}
                      disabled={selectedAnswer === null}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-xl font-medium transition-colors"
                    >
                      Submit Answer
                    </button>
                  ) : (
                    <button
                      onClick={closeQuiz}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-medium transition-colors"
                    >
                      Continue Course
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard Shortcuts Helper */}
      <div className="fixed bottom-6 right-6 bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-xl p-4 text-xs space-y-1 opacity-50 hover:opacity-100 transition-opacity">
        <p className="font-semibold text-slate-400 mb-2">Keyboard Shortcuts</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-500">Space</span>
            <span>Play/Pause</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-500">← →</span>
            <span>Skip 10s</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-500">M</span>
            <span>Mute</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-500">B</span>
            <span>Bookmark</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-500">N</span>
            <span>Notes</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-500">T</span>
            <span>Transcript</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-500">S</span>
            <span>Sidebar</span>
          </div>
        </div>
      </div>
    </div>
  );
}
