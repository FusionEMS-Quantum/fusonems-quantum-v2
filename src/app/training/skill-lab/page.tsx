'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Syringe,
  Heart,
  AlertTriangle,
  Wind,
  Droplets,
  CheckSquare,
  Clock,
  Video,
  Upload,
  MessageSquare,
  Star,
  Award,
  Play,
  ChevronRight,
  RotateCcw,
  Eye,
  ThumbsUp,
  User,
  Target,
  Zap,
} from 'lucide-react';

interface Skill {
  id: string;
  name: string;
  category: 'airway' | 'iv-io' | 'cardiac' | 'trauma' | 'assessment' | 'medication';
  difficulty: 'basic' | 'advanced' | 'paramedic';
  duration: number;
  icon: any;
  color: string;
  steps: SkillStep[];
}

interface SkillStep {
  id: string;
  title: string;
  description: string;
  criticalAction: boolean;
  imageUrl?: string;
  videoUrl?: string;
}

interface PracticeSession {
  skillId: string;
  startTime: Date;
  completedSteps: string[];
  timePerStep: Record<string, number>;
  selfAssessment?: {
    confidence: number;
    readyForEval: boolean;
    notes: string;
  };
}

const categories = [
  { value: 'airway', label: 'Airway Management', icon: Wind, color: 'from-blue-500 to-cyan-500' },
  { value: 'iv-io', label: 'IV/IO Access', icon: Droplets, color: 'from-purple-500 to-pink-500' },
  { value: 'cardiac', label: 'Cardiac Care', icon: Heart, color: 'from-red-500 to-pink-500' },
  { value: 'trauma', label: 'Trauma Skills', icon: AlertTriangle, color: 'from-orange-500 to-red-500' },
  { value: 'assessment', label: 'Patient Assessment', icon: Activity, color: 'from-green-500 to-emerald-500' },
  { value: 'medication', label: 'Medication Admin', icon: Syringe, color: 'from-indigo-500 to-purple-500' },
];

const skills: Skill[] = [
  {
    id: '1',
    name: 'Endotracheal Intubation',
    category: 'airway',
    difficulty: 'paramedic',
    duration: 8,
    icon: Wind,
    color: 'from-blue-500 to-cyan-500',
    steps: [
      {
        id: '1',
        title: 'Preparation & Positioning',
        description: 'Gather equipment, position patient in sniffing position, preoxygenate with BVM',
        criticalAction: true,
      },
      {
        id: '2',
        title: 'Equipment Check',
        description: 'Check laryngoscope light, test ET tube cuff, prepare suction, have backup airway ready',
        criticalAction: true,
      },
      {
        id: '3',
        title: 'Laryngoscopy',
        description: 'Insert blade on right side of mouth, sweep tongue left, visualize vocal cords',
        criticalAction: true,
      },
      {
        id: '4',
        title: 'Tube Placement',
        description: 'Insert ET tube through cords until cuff passes, inflate cuff with 5-10mL air',
        criticalAction: true,
      },
      {
        id: '5',
        title: 'Confirmation',
        description: 'Auscultate bilaterally, check EtCO2, secure tube, document depth at teeth',
        criticalAction: true,
      },
    ],
  },
  {
    id: '2',
    name: 'Intraosseous Access',
    category: 'iv-io',
    difficulty: 'advanced',
    duration: 5,
    icon: Droplets,
    color: 'from-purple-500 to-pink-500',
    steps: [
      {
        id: '1',
        title: 'Site Selection',
        description: 'Identify proximal tibia (2cm below tibial tuberosity, 1cm medial)',
        criticalAction: true,
      },
      {
        id: '2',
        title: 'Preparation',
        description: 'Clean site with antiseptic, stabilize leg, attach appropriate IO needle to driver',
        criticalAction: false,
      },
      {
        id: '3',
        title: 'Insertion',
        description: 'Insert perpendicular to bone, press trigger, advance until pop/give felt',
        criticalAction: true,
      },
      {
        id: '4',
        title: 'Verification',
        description: 'Remove stylet, aspirate marrow, flush with 10mL saline, assess for extravasation',
        criticalAction: true,
      },
      {
        id: '5',
        title: 'Securing',
        description: 'Secure with manufacturer stabilizer, connect IV tubing, begin fluid therapy',
        criticalAction: false,
      },
    ],
  },
  {
    id: '3',
    name: 'Manual Defibrillation',
    category: 'cardiac',
    difficulty: 'basic',
    duration: 3,
    icon: Heart,
    color: 'from-red-500 to-pink-500',
    steps: [
      {
        id: '1',
        title: 'Safety Assessment',
        description: 'Ensure scene safety, confirm cardiac arrest, verify shockable rhythm',
        criticalAction: true,
      },
      {
        id: '2',
        title: 'Pad Placement',
        description: 'Place pads anterior-lateral (right upper chest, left lateral chest)',
        criticalAction: true,
      },
      {
        id: '3',
        title: 'Charge & Clear',
        description: 'Select appropriate energy (120-200J biphasic), charge, announce "Clear!"',
        criticalAction: true,
      },
      {
        id: '4',
        title: 'Shock Delivery',
        description: 'Verify all clear, deliver shock, immediately resume CPR',
        criticalAction: true,
      },
    ],
  },
  {
    id: '4',
    name: 'Needle Decompression',
    category: 'trauma',
    difficulty: 'advanced',
    duration: 4,
    icon: AlertTriangle,
    color: 'from-orange-500 to-red-500',
    steps: [
      {
        id: '1',
        title: 'Recognition',
        description: 'Identify tension pneumothorax: absent breath sounds, JVD, hypotension, tracheal deviation',
        criticalAction: true,
      },
      {
        id: '2',
        title: 'Site Identification',
        description: 'Locate 2nd intercostal space, midclavicular line (or 4th/5th ICS, anterior axillary)',
        criticalAction: true,
      },
      {
        id: '3',
        title: 'Insertion',
        description: 'Insert 14-16g angiocath perpendicular to chest wall, advance over rib',
        criticalAction: true,
      },
      {
        id: '4',
        title: 'Confirmation',
        description: 'Listen for rush of air, remove needle leaving catheter, reassess patient',
        criticalAction: true,
      },
    ],
  },
];

export default function SkillLabPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeSkill, setActiveSkill] = useState<Skill | null>(null);
  const [practiceMode, setPracticeMode] = useState<'walkthrough' | 'checklist' | 'timed' | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [sessionTime, setSessionTime] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);

  const filteredSkills = selectedCategory
    ? skills.filter((s) => s.category === selectedCategory)
    : skills;

  const startPractice = (skill: Skill, mode: 'walkthrough' | 'checklist' | 'timed') => {
    setActiveSkill(skill);
    setPracticeMode(mode);
    setCurrentStep(0);
    setCompletedSteps([]);
    setSessionTime(0);
  };

  const completeStep = (stepId: string) => {
    setCompletedSteps((prev) => [...prev, stepId]);
    if (activeSkill && currentStep < activeSkill.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowFeedback(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 p-6">
      {!activeSkill ? (
        <>
          {/* Header */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="max-w-7xl mx-auto mb-8"
          >
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center"
                  >
                    <Activity className="w-10 h-10 text-white" />
                  </motion.div>
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                      Virtual Skill Lab
                    </h1>
                    <p className="text-gray-600 text-lg">
                      Master clinical skills with interactive walkthroughs
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-6 text-white">
                    <div className="flex items-center gap-2 mb-2">
                      <Award className="w-6 h-6" />
                      <span className="text-sm font-medium">Skills Mastered</span>
                    </div>
                    <div className="text-3xl font-bold">12</div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-6 text-white">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-6 h-6" />
                      <span className="text-sm font-medium">Practice Hours</span>
                    </div>
                    <div className="text-3xl font-bold">34</div>
                  </div>
                </div>
              </div>

              {/* Category Filter */}
              <div className="mt-8 flex gap-3 overflow-x-auto pb-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedCategory(null)}
                  className={`px-6 py-3 rounded-xl font-medium whitespace-nowrap transition-all ${
                    selectedCategory === null
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All Skills
                </motion.button>
                {categories.map((cat) => (
                  <motion.button
                    key={cat.value}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedCategory(cat.value)}
                    className={`px-6 py-3 rounded-xl font-medium whitespace-nowrap transition-all ${
                      selectedCategory === cat.value
                        ? `bg-gradient-to-r ${cat.color} text-white shadow-lg`
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <cat.icon className="w-4 h-4" />
                      {cat.label}
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Skills Grid */}
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSkills.map((skill, idx) => {
                const SkillIcon = skill.icon;
                return (
                  <motion.div
                    key={skill.id}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    whileHover={{ y: -5, scale: 1.02 }}
                    className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 overflow-hidden group"
                  >
                    <div className={`h-32 bg-gradient-to-br ${skill.color} p-6 relative overflow-hidden`}>
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="absolute top-0 right-0 w-32 h-32 opacity-20"
                      >
                        <SkillIcon className="w-full h-full text-white" />
                      </motion.div>
                      <div className="relative z-10">
                        <h3 className="text-2xl font-bold text-white mb-2">{skill.name}</h3>
                        <div className="flex items-center gap-2 text-white/80 text-sm">
                          <Clock className="w-4 h-4" />
                          <span>{skill.duration} min</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <span
                          className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${
                            skill.difficulty === 'basic'
                              ? 'bg-green-100 text-green-700'
                              : skill.difficulty === 'advanced'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {skill.difficulty}
                        </span>
                        <div className="flex items-center gap-1 text-gray-600">
                          <CheckSquare className="w-4 h-4" />
                          <span className="text-sm">{skill.steps.length} steps</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => startPractice(skill, 'walkthrough')}
                          className={`w-full py-3 bg-gradient-to-r ${skill.color} text-white rounded-xl font-medium shadow-lg flex items-center justify-center gap-2`}
                        >
                          <Eye className="w-5 h-5" />
                          Walkthrough
                        </motion.button>
                        <div className="grid grid-cols-2 gap-2">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => startPractice(skill, 'checklist')}
                            className="py-2 bg-blue-100 text-blue-700 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-blue-200 transition-colors"
                          >
                            <CheckSquare className="w-4 h-4" />
                            Checklist
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => startPractice(skill, 'timed')}
                            className="py-2 bg-orange-100 text-orange-700 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-orange-200 transition-colors"
                          >
                            <Clock className="w-4 h-4" />
                            Timed
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <AnimatePresence mode="wait">
          {!showFeedback ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-5xl mx-auto"
            >
              {/* Practice Header */}
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6 mb-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 bg-gradient-to-br ${activeSkill.color} rounded-2xl flex items-center justify-center`}>
                      <activeSkill.icon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800">{activeSkill.name}</h2>
                      <p className="text-gray-600">
                        {practiceMode === 'walkthrough' && 'Step-by-step walkthrough'}
                        {practiceMode === 'checklist' && 'Practice with checklist'}
                        {practiceMode === 'timed' && 'Timed practice session'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Progress</div>
                      <div className="text-2xl font-bold text-gray-800">
                        {completedSteps.length} / {activeSkill.steps.length}
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setActiveSkill(null);
                        setPracticeMode(null);
                      }}
                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-medium"
                    >
                      Exit
                    </motion.button>
                  </div>
                </div>

                <div className="mt-6 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(completedSteps.length / activeSkill.steps.length) * 100}%` }}
                    className={`h-full bg-gradient-to-r ${activeSkill.color}`}
                  />
                </div>
              </motion.div>

              {/* Current Step */}
              <motion.div
                key={currentStep}
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -100, opacity: 0 }}
                className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 mb-6"
              >
                <div className="flex items-start gap-6">
                  <div className={`w-16 h-16 bg-gradient-to-br ${activeSkill.color} rounded-2xl flex items-center justify-center text-white font-bold text-2xl flex-shrink-0`}>
                    {currentStep + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <h3 className="text-2xl font-bold text-gray-800">
                        {activeSkill.steps[currentStep].title}
                      </h3>
                      {activeSkill.steps[currentStep].criticalAction && (
                        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold uppercase">
                          Critical
                        </span>
                      )}
                    </div>
                    <p className="text-gray-700 text-lg leading-relaxed mb-6">
                      {activeSkill.steps[currentStep].description}
                    </p>

                    {/* Placeholder for image/video */}
                    <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl h-64 flex items-center justify-center mb-6">
                      <div className="text-center text-gray-500">
                        <Video className="w-16 h-16 mx-auto mb-3" />
                        <p>Instructional video placeholder</p>
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => completeStep(activeSkill.steps[currentStep].id)}
                      className={`w-full py-4 bg-gradient-to-r ${activeSkill.color} text-white rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2`}
                    >
                      <CheckSquare className="w-6 h-6" />
                      {currentStep < activeSkill.steps.length - 1 ? 'Next Step' : 'Complete'}
                    </motion.button>
                  </div>
                </div>
              </motion.div>

              {/* All Steps Overview */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6"
              >
                <h3 className="text-lg font-bold text-gray-800 mb-4">All Steps</h3>
                <div className="space-y-2">
                  {activeSkill.steps.map((step, idx) => (
                    <div
                      key={step.id}
                      className={`p-4 rounded-xl flex items-center gap-4 ${
                        completedSteps.includes(step.id)
                          ? 'bg-green-50 border-2 border-green-500'
                          : idx === currentStep
                          ? 'bg-blue-50 border-2 border-blue-500'
                          : 'bg-gray-50'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                        {completedSteps.includes(step.id) ? (
                          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                            <CheckSquare className="w-5 h-5 text-white" />
                          </div>
                        ) : (
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            idx === currentStep ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'
                          }`}>
                            {idx + 1}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">{step.title}</div>
                      </div>
                      {step.criticalAction && (
                        <Star className="w-5 h-5 text-red-500 flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="max-w-4xl mx-auto"
            >
              {/* Completion Feedback */}
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8">
                <div className="text-center mb-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', duration: 0.6 }}
                    className="w-32 h-32 bg-gradient-to-br from-green-400 to-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6"
                  >
                    <ThumbsUp className="w-16 h-16 text-white" />
                  </motion.div>
                  <h2 className="text-4xl font-bold text-gray-800 mb-2">Practice Complete!</h2>
                  <p className="text-gray-600 text-lg">Great job completing {activeSkill.name}</p>
                </div>

                {/* Self Assessment */}
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-6 mb-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Self Assessment</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confidence Level
                      </label>
                      <input type="range" min="0" max="100" className="w-full" />
                    </div>
                    <div>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="w-5 h-5" />
                        <span className="text-gray-700">I feel ready for instructor evaluation</span>
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notes
                      </label>
                      <textarea
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        placeholder="Any challenges or questions?"
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setShowFeedback(false);
                      setCurrentStep(0);
                      setCompletedSteps([]);
                    }}
                    className="flex-1 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-6 h-6" />
                    Practice Again
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setActiveSkill(null);
                      setPracticeMode(null);
                      setShowFeedback(false);
                    }}
                    className="flex-1 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2"
                  >
                    <ChevronRight className="w-6 h-6" />
                    Next Skill
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
