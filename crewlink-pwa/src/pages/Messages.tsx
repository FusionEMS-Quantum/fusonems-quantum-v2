import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { initSocket } from '../lib/socket'
import { playMessageReceived } from '../lib/notifications'
import api from '../lib/api'
import type { TextMessage, OnlineCrewMember } from '../types'

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
  const navigate = useNavigate()
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
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <header className="bg-gray-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-2xl">←</button>
        <h1 className="text-lg font-semibold flex-1">Messages</h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-20 bg-gray-850 border-r border-gray-700 flex flex-col py-2 overflow-y-auto">
          <button
            onClick={() => setSelectedRecipient(null)}
            className={`p-2 mx-2 rounded-lg mb-1 flex flex-col items-center ${
              !selectedRecipient ? 'bg-blue-600' : 'hover:bg-gray-700'
            }`}
          >
            <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center text-sm">
              All
            </div>
            <span className="text-xs mt-1">Broadcast</span>
          </button>

          {onlineCrew.filter(c => c.id !== userId).map(crew => (
            <button
              key={crew.id}
              onClick={() => setSelectedRecipient(crew.id)}
              className={`p-2 mx-2 rounded-lg mb-1 flex flex-col items-center relative ${
                selectedRecipient === crew.id ? 'bg-blue-600' : 'hover:bg-gray-700'
              }`}
            >
              <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center text-sm">
                {crew.name.split(' ').map(n => n[0]).join('')}
              </div>
              <span className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full ${
                crew.is_online ? 'bg-green-500' : 'bg-gray-500'
              }`} />
              <span className="text-xs mt-1 truncate w-full text-center">{crew.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="text-center text-gray-400 py-8">Loading...</div>
            ) : filteredMessages.length === 0 ? (
              <div className="text-center text-gray-400 py-8">No messages yet</div>
            ) : (
              <>
                {filteredMessages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_id === userId ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                        msg.sender_id === userId
                          ? 'bg-blue-600 rounded-br-md'
                          : 'bg-gray-700 rounded-bl-md'
                      }`}
                    >
                      {msg.sender_id !== userId && (
                        <div className="text-xs text-gray-400 mb-1">{msg.sender_name}</div>
                      )}
                      <div>{msg.content}</div>
                      <div className="text-xs text-gray-400 text-right mt-1">
                        {formatTime(msg.timestamp)}
                        {msg.sender_id === userId && msg.read_at && ' ✓'}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {showCanned && (
            <div className="bg-gray-800 border-t border-gray-700 p-2">
              <div className="flex flex-wrap gap-2">
                {CANNED_MESSAGES.map(msg => (
                  <button
                    key={msg}
                    onClick={() => sendMessage(msg)}
                    className="bg-gray-700 px-3 py-1 rounded-full text-sm hover:bg-gray-600"
                  >
                    {msg}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="bg-gray-800 border-t border-gray-700 p-3">
            <div className="flex gap-2">
              <button
                onClick={() => setShowCanned(!showCanned)}
                className={`p-3 rounded-lg ${showCanned ? 'bg-blue-600' : 'bg-gray-700'}`}
              >
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
                className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
              <button
                onClick={() => sendMessage(newMessage)}
                disabled={!newMessage.trim()}
                className="bg-blue-600 p-3 rounded-lg disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
