'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Send,
  Mic,
  MicOff,
  BookOpen,
  Calculator,
  GitBranch,
  Save,
  TrendingUp,
  Zap,
  Brain,
  MessageSquare,
  ChevronDown,
  Star,
  Download,
  RotateCcw,
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  confidence?: number;
  relatedTopics?: string[];
}

interface SavedConversation {
  id: string;
  title: string;
  messages: Message[];
  timestamp: Date;
  tags: string[];
}

type TutorMode = 'chat' | 'scenario' | 'calculator' | 'protocol';

export default function AITutorPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hey there! I'm your AI Clinical Tutor. I can help you with medical scenarios, drug calculations, protocol questions, or just explain concepts in simple terms. What would you like to learn today?",
      timestamp: new Date(),
      confidence: 100,
    },
  ]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [mode, setMode] = useState<TutorMode>('chat');
  const [eliMode, setEliMode] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [savedConversations, setSavedConversations] = useState<SavedConversation[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const quickPrompts = [
    { icon: Calculator, text: 'Calculate dopamine drip', mode: 'calculator' as TutorMode },
    { icon: GitBranch, text: 'Show ACLS algorithm', mode: 'protocol' as TutorMode },
    { icon: BookOpen, text: 'Chest pain scenario', mode: 'scenario' as TutorMode },
    { icon: Brain, text: 'Explain sepsis simply', mode: 'chat' as TutorMode },
  ];

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: generateResponse(input, mode, eliMode),
        timestamp: new Date(),
        confidence: Math.floor(Math.random() * 20) + 80,
        relatedTopics: ['ACLS Guidelines', 'Cardiac Arrest', 'Vasopressors'],
      };
      setMessages((prev) => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const generateResponse = (query: string, currentMode: TutorMode, simple: boolean) => {
    if (currentMode === 'calculator') {
      return `Let me help you calculate that dosage!\n\n**Dopamine Infusion:**\n- Patient Weight: 80 kg\n- Desired Dose: 5 mcg/kg/min\n- Mix: 400mg in 250mL D5W\n\n**Calculation:**\n1. Dose needed = 5 mcg/kg/min × 80 kg = 400 mcg/min\n2. Convert to mg/min = 0.4 mg/min\n3. Concentration = 400mg/250mL = 1.6 mg/mL\n4. Rate = 0.4 mg/min ÷ 1.6 mg/mL = 0.25 mL/min\n5. **Pump rate = 15 mL/hr**\n\n${simple ? '**Simple version:** Give 15 mL every hour through the IV pump. This gives exactly the right amount of medicine to help the heart pump better!' : ''}`;
    }

    if (currentMode === 'protocol') {
      return `Here's the **Adult Cardiac Arrest Algorithm** (ACLS 2020):\n\n1️⃣ **Start CPR** - High quality, minimal interruptions\n2️⃣ **Attach monitor/defibrillator**\n3️⃣ **Check rhythm** - Shockable?\n\n**If Shockable (VF/pVT):**\n→ Shock → CPR 2 min → Epinephrine every 3-5 min → Amiodarone after 3rd shock\n\n**If Non-Shockable (PEA/Asystole):**\n→ CPR 2 min → Epinephrine every 3-5 min → Treat reversible causes\n\n**H's & T's:** Hypovolemia, Hypoxia, H+ (acidosis), Hypo/hyperkalemia, Hypothermia | Tension pneumo, Tamponade, Toxins, Thrombosis\n\n${simple ? '\n**New EMT version:** Do chest pushes really good. If the heart wiggles weird (VF), shock it. If flat or weird beat (PEA), give epi and fix what broke (like low oxygen, too cold, etc).' : ''}`;
    }

    if (currentMode === 'scenario') {
      return `**SCENARIO: Chest Pain Call**\n\n*You arrive to find a 58 y/o male, clutching his chest, diaphoretic.*\n\n**Patient says:** "It feels like an elephant sitting on my chest..."\n\n**Vitals:**\n- BP: 156/94\n- HR: 108 irregular\n- RR: 22\n- SpO2: 94% RA\n- Skin: Cool, pale, diaphoretic\n\n**What are your priority actions?**\n\n${simple ? '\n💡 **Hint for new EMTs:** Think MONA - Morphine, Oxygen, Nitro, Aspirin. But first, make sure breathing is good and get that heart monitor on!' : ''}`;
    }

    return `Great question! ${simple ? "Let me explain this like you're brand new:\n\n" : ''}Sepsis is when your body's response to an infection goes haywire. ${simple ? "Think of it like your immune system throwing a tantrum - it fights the infection SO hard that it hurts your own organs.\n\n**Signs to look for:**\n- Really sick looking\n- Super high or low temp\n- Fast heart rate\n- Fast breathing\n- Confused or out of it\n\n**What to do:**\n- Start an IV\n- Give fluids (lots!)\n- Get to hospital FAST\n- Check blood sugar\n\nThe key is catching it early - time = lives saved!" : "Instead of just fighting the infection locally, the immune response becomes systemic, potentially leading to septic shock and multi-organ dysfunction.\n\n**SOFA Criteria & qSOFA** can help identify sepsis early. Treatment priorities include early antibiotics, fluid resuscitation, and source control."}`;
  };

  const toggleVoiceInput = () => {
    setIsListening(!isListening);
    if (!isListening) {
      // Simulate voice recognition
      setTimeout(() => {
        setInput('How do I calculate an epinephrine drip for a 70 kg patient?');
        setIsListening(false);
      }, 2000);
    }
  };

  const saveConversation = () => {
    const newConversation: SavedConversation = {
      id: Date.now().toString(),
      title: messages[1]?.content.substring(0, 50) + '...' || 'New Conversation',
      messages: messages,
      timestamp: new Date(),
      tags: [mode, eliMode ? 'simple' : 'advanced'],
    };
    setSavedConversations((prev) => [newConversation, ...prev]);
  };

  const loadConversation = (conv: SavedConversation) => {
    setMessages(conv.messages);
    setShowSaved(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 p-6">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="max-w-6xl mx-auto mb-6"
      >
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="w-16 h-16 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-2xl flex items-center justify-center"
              >
                <Sparkles className="w-8 h-8 text-white" />
              </motion.div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-cyan-600 bg-clip-text text-transparent">
                  AI Clinical Tutor
                </h1>
                <p className="text-gray-600">Your 24/7 Medical Education Assistant</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* ELI Mode Toggle */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setEliMode(!eliMode)}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  eliMode
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/30'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Simple Mode
                </div>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowSaved(!showSaved)}
                className="p-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl shadow-lg"
              >
                <BookOpen className="w-5 h-5" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={saveConversation}
                className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl shadow-lg"
              >
                <Save className="w-5 h-5" />
              </motion.button>
            </div>
          </div>

          {/* Mode Selector */}
          <div className="mt-6 flex gap-3">
            {[
              { value: 'chat', icon: MessageSquare, label: 'Chat' },
              { value: 'scenario', icon: BookOpen, label: 'Scenario' },
              { value: 'calculator', icon: Calculator, label: 'Calculator' },
              { value: 'protocol', icon: GitBranch, label: 'Protocol' },
            ].map((m) => (
              <motion.button
                key={m.value}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setMode(m.value as TutorMode)}
                className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                  mode === m.value
                    ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <m.icon className="w-4 h-4" />
                  {m.label}
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Area */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 h-[calc(100vh-280px)] flex flex-col"
          >
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <AnimatePresence>
                {messages.map((message, idx) => (
                  <motion.div
                    key={message.id}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl p-4 ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{message.content}</div>
                      {message.confidence && (
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: '100%' }}
                          className="mt-3 pt-3 border-t border-white/20"
                        >
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-1">
                              <TrendingUp className="w-4 h-4" />
                              Confidence
                            </span>
                            <span className="font-bold">{message.confidence}%</span>
                          </div>
                          <div className="mt-2 h-2 bg-white/20 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${message.confidence}%` }}
                              transition={{ duration: 1, delay: 0.5 }}
                              className="h-full bg-gradient-to-r from-green-400 to-emerald-400"
                            />
                          </div>
                        </motion.div>
                      )}
                      {message.relatedTopics && (
                        <div className="mt-3 pt-3 border-t border-white/20">
                          <div className="text-xs font-semibold mb-2">Related Topics:</div>
                          <div className="flex flex-wrap gap-2">
                            {message.relatedTopics.map((topic) => (
                              <span
                                key={topic}
                                className="px-2 py-1 bg-white/20 rounded-lg text-xs"
                              >
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-gray-100 rounded-2xl p-4">
                    <div className="flex gap-2">
                      <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                        className="w-2 h-2 bg-purple-500 rounded-full"
                      />
                      <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                        className="w-2 h-2 bg-cyan-500 rounded-full"
                      />
                      <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                        className="w-2 h-2 bg-purple-500 rounded-full"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 border-t border-gray-200">
              <div className="flex gap-3">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ask me anything about medicine, protocols, calculations..."
                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  rows={2}
                />
                <div className="flex flex-col gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={toggleVoiceInput}
                    className={`p-3 rounded-xl transition-all ${
                      isListening
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSend}
                    className="p-3 bg-gradient-to-r from-purple-500 to-cyan-500 text-white rounded-xl shadow-lg"
                  >
                    <Send className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Quick Prompts */}
          {!showSaved && (
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6"
            >
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Quick Prompts
              </h3>
              <div className="space-y-3">
                {quickPrompts.map((prompt, idx) => (
                  <motion.button
                    key={idx}
                    whileHover={{ scale: 1.02, x: 5 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setMode(prompt.mode);
                      setInput(prompt.text);
                      setTimeout(() => handleSend(), 100);
                    }}
                    className="w-full p-4 bg-gradient-to-r from-purple-50 to-cyan-50 rounded-xl text-left hover:shadow-lg transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-lg flex items-center justify-center">
                        <prompt.icon className="w-5 h-5 text-white" />
                      </div>
                      <span className="font-medium text-gray-700">{prompt.text}</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Saved Conversations */}
          {showSaved && (
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6 h-[calc(100vh-280px)] overflow-y-auto"
            >
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-500" />
                Saved Conversations
              </h3>
              <div className="space-y-3">
                {savedConversations.map((conv) => (
                  <motion.div
                    key={conv.id}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => loadConversation(conv)}
                    className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl cursor-pointer hover:shadow-lg transition-all"
                  >
                    <div className="font-medium text-gray-800 mb-2">{conv.title}</div>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>{conv.messages.length} messages</span>
                      <span>{new Date(conv.timestamp).toLocaleDateString()}</span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {conv.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-white/50 rounded-lg text-xs text-gray-600"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                ))}
                {savedConversations.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    No saved conversations yet
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Stats */}
          {!showSaved && (
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-purple-500 to-cyan-500 rounded-3xl shadow-2xl p-6 text-white"
            >
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Your Learning Stats
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Questions Asked</span>
                    <span className="font-bold">247</span>
                  </div>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '75%' }}
                      className="h-full bg-white"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Avg Confidence</span>
                    <span className="font-bold">89%</span>
                  </div>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '89%' }}
                      className="h-full bg-white"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Topics Mastered</span>
                    <span className="font-bold">23</span>
                  </div>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '60%' }}
                      className="h-full bg-white"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Saved Conversations Panel */}
      <AnimatePresence>
        {showSaved && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setShowSaved(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden"
            >
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-800">Saved Conversations</h2>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(80vh-100px)]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedConversations.map((conv) => (
                    <motion.div
                      key={conv.id}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => loadConversation(conv)}
                      className="p-6 bg-gradient-to-br from-purple-50 to-cyan-50 rounded-2xl cursor-pointer hover:shadow-xl transition-all"
                    >
                      <div className="font-bold text-gray-800 mb-2">{conv.title}</div>
                      <div className="text-sm text-gray-600 mb-3">
                        {conv.messages.length} messages
                      </div>
                      <div className="flex gap-2">
                        {conv.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-3 py-1 bg-white rounded-lg text-xs font-medium text-gray-700"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
