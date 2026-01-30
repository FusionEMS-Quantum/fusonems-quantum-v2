import { useState, useEffect, useRef } from 'react'
import { initSocket } from '../lib/socket'
import { playMessageReceived } from '../lib/notifications'
import api from '../lib/api'
import type { TextMessage, OnlineCrewMember } from '../types'
import PageHeader from '../components/PageHeader'
import BottomNav from '../components/BottomNav'

const CANNED_MESSAGES = [
  'Copy that',
  'En route',
  'On scene',
  'Patient loaded',
  'Transporting',
  'At destination',
  'Available',
  'Need assistance',
  'Call me',
  'Standby',
]

export default function Messages() {
  const [messages, setMessages] = useState<TextMessage[]>([])
  const [onlineCrew, setOnlineCrew] = useState<OnlineCrewMember[]>([])
  const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [showCanned, setShowCanned] = useState(false)
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const userId = localStorage.getItem('user_id')

  useEffect(() => {
    loadData()
    const socket = initSocket()

    socket.on('message:received', (msg: TextMessage) => {
      setMessages(prev => [...prev, msg])
      playMessageReceived()
      scrollToBottom()
    })

    socket.on('crew:status_changed', () => {
      loadOnlineCrew()
    })

    return () => {
      socket.off('message:received')
      socket.off('crew:status_changed')
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, selectedRecipient])

  const loadData = async () => {
    await Promise.all([loadMessages(), loadOnlineCrew()])
    setLoading(false)
  }

  const loadMessages = async () => {
    try {
      const response = await api.get('/crewlink/messages')
      setMessages(response.data)
    } catch {
      setMessages([])
    }
  }

  const loadOnlineCrew = async () => {
    try {
      const response = await api.get('/crewlink/crew/online')
      setOnlineCrew(response.data)
    } catch {
      setOnlineCrew([])
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const sendMessage = async (text: string) => {
    if (!text.trim()) return

    try {
      await api.post('/crewlink/messages', {
        content: text,
        recipient_id: selectedRecipient,
      })
      setNewMessage('')
      setShowCanned(false)
      loadMessages()
    } catch (err) {
      alert('Failed to send message')
    }
  }

  const filteredMessages = selectedRecipient
    ? messages.filter(
        m =>
          (m.sender_id === userId && m.recipient_id === selectedRecipient) ||
          (m.sender_id === selectedRecipient && m.recipient_id === userId)
      )
    : messages.filter(m => !m.recipient_id)

  const formatTime = (ts: string) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="min-h-screen bg-dark text-white flex flex-col">
      <PageHeader variant="subpage" showBack title="Messages" />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-20 bg-surface border-r border-border flex flex-col py-2 overflow-y-auto flex-shrink-0">
          <button
            onClick={() => setSelectedRecipient(null)}
            className={`p-2 mx-2 rounded-card mb-1 flex flex-col items-center transition-colors ${
              !selectedRecipient ? 'bg-primary/20 text-primary' : 'hover:bg-surface-elevated text-muted-light'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${!selectedRecipient ? 'bg-primary text-white' : 'bg-surface-elevated'}`}>
              All
            </div>
            <span className="text-xs mt-1">Broadcast</span>
          </button>
          {onlineCrew.filter(c => c.id !== userId).map(crew => (
            <button
              key={crew.id}
              onClick={() => setSelectedRecipient(crew.id)}
              className={`p-2 mx-2 rounded-card mb-1 flex flex-col items-center relative transition-colors ${
                selectedRecipient === crew.id ? 'bg-primary/20 text-primary' : 'hover:bg-surface-elevated text-muted-light'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${selectedRecipient === crew.id ? 'bg-primary text-white' : 'bg-surface-elevated'}`}>
                {crew.name.split(' ').map(n => n[0]).join('')}
              </div>
              <span className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full border-2 border-surface ${crew.is_online ? 'bg-emerald-500' : 'bg-muted'}`} />
              <span className="text-xs mt-1 truncate w-full text-center">{crew.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="mt-3 text-muted text-sm">Loading...</p>
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="text-center py-12 text-muted font-medium">No messages yet</div>
            ) : (
              <>
                {filteredMessages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.sender_id === userId ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      msg.sender_id === userId ? 'bg-primary rounded-br-md' : 'bg-surface-elevated border border-border rounded-bl-md'
                    }`}>
                      {msg.sender_id !== userId && <div className="text-xs text-muted mb-1">{msg.sender_name}</div>}
                      <div className="text-muted-light">{msg.content}</div>
                      <div className="text-xs text-muted text-right mt-1">
                        {formatTime(msg.timestamp)}{msg.sender_id === userId && msg.read_at && ' ✓'}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
          {showCanned && (
            <div className="bg-surface border-t border-border p-2">
              <div className="flex flex-wrap gap-2">
                {CANNED_MESSAGES.map(msg => (
                  <button key={msg} onClick={() => sendMessage(msg)} className="bg-surface-elevated hover:bg-card-hover px-3 py-1.5 rounded-pill text-sm text-muted-light border border-border transition-colors">
                    {msg}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="bg-surface border-t border-border shadow-nav p-3">
            <div className="flex gap-2">
              <button onClick={() => setShowCanned(!showCanned)} className={`p-3 rounded-button transition-colors ${showCanned ? 'bg-primary text-white' : 'bg-surface-elevated text-muted hover:bg-card-hover'}`}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </button>
              <input
                type="text"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && sendMessage(newMessage)}
                placeholder="Type a message..."
                className="crewlink-input flex-1 py-2"
              />
              <button onClick={() => sendMessage(newMessage)} disabled={!newMessage.trim()} className="crewlink-btn-primary p-3 rounded-button disabled:opacity-50">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
