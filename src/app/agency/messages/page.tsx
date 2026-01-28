"use client"

import { useState } from "react"
import { AgencyNavigation } from "@/components/agency"

interface Message {
  id: string
  subject: string
  from: string
  to: string
  date: string
  body: string
  unread: boolean
  thread?: Message[]
}

const mockMessages: Message[] = [
  {
    id: "1",
    subject: "Prior Authorization Update - Claim CLM-2024-5678",
    from: "FusionEMS Billing Team",
    to: "Agency Admin",
    date: "2024-01-26 10:30",
    body: "We are following up with the provider's office regarding the prior authorization for claim CLM-2024-5678. We will update you once we receive a response.",
    unread: true,
  },
  {
    id: "2",
    subject: "Payment Received - Claim CLM-2024-5676",
    from: "FusionEMS Billing Team",
    to: "Agency Admin",
    date: "2024-01-20 14:15",
    body: "Payment of $1,500.00 has been received for claim CLM-2024-5676. The funds have been posted to your account.",
    unread: false,
  },
  {
    id: "3",
    subject: "Documentation Request - Incident INC-2024-001236",
    from: "FusionEMS Billing Team",
    to: "Agency Admin",
    date: "2024-01-19 09:00",
    body: "Please provide the medical necessity form for incident INC-2024-001236. This is required to complete the claim submission.",
    unread: false,
  },
]

export default function MessagesPage() {
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [showCompose, setShowCompose] = useState(false)
  const [composeData, setComposeData] = useState({
    subject: "",
    body: "",
  })

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Sending message:", composeData)
    setShowCompose(false)
    setComposeData({ subject: "", body: "" })
  }

  return (
    <div className="flex min-h-screen bg-black">
      <AgencyNavigation />

      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Messages</h1>
              <p className="text-gray-400">
                Secure messaging with the billing team
              </p>
            </div>
            <button
              onClick={() => setShowCompose(true)}
              className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-semibold"
            >
              Compose New Message
            </button>
          </div>

          {showCompose && (
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 mb-6">
              <h2 className="text-xl font-bold text-white mb-4">
                New Message
              </h2>
              <form onSubmit={handleSendMessage} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    To
                  </label>
                  <input
                    type="text"
                    value="FusionEMS Billing Team"
                    disabled
                    className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={composeData.subject}
                    onChange={(e) =>
                      setComposeData({ ...composeData, subject: e.target.value })
                    }
                    placeholder="Enter subject..."
                    className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Message
                  </label>
                  <textarea
                    value={composeData.body}
                    onChange={(e) =>
                      setComposeData({ ...composeData, body: e.target.value })
                    }
                    placeholder="Type your message..."
                    rows={6}
                    className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-semibold"
                  >
                    Send Message
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCompose(false)
                      setComposeData({ subject: "", body: "" })
                    }}
                    className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-gray-800">
                <h2 className="text-lg font-bold text-white">Inbox</h2>
              </div>
              <div className="divide-y divide-gray-800">
                {mockMessages.map((message) => (
                  <div
                    key={message.id}
                    onClick={() => setSelectedMessage(message)}
                    className={`p-4 cursor-pointer hover:bg-gray-800/50 transition-colors ${
                      selectedMessage?.id === message.id ? "bg-gray-800/50" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="font-semibold text-white text-sm">
                        {message.from}
                      </div>
                      {message.unread && (
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      )}
                    </div>
                    <div className="text-sm text-gray-300 mb-1 line-clamp-1">
                      {message.subject}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(message.date).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 bg-gray-900/50 border border-gray-800 rounded-xl">
              {selectedMessage ? (
                <div>
                  <div className="p-6 border-b border-gray-800">
                    <h2 className="text-2xl font-bold text-white mb-3">
                      {selectedMessage.subject}
                    </h2>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <div>
                        <span className="font-semibold">From:</span>{" "}
                        {selectedMessage.from}
                      </div>
                      <div>
                        <span className="font-semibold">To:</span>{" "}
                        {selectedMessage.to}
                      </div>
                      <div>
                        {new Date(selectedMessage.date).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="text-gray-300 whitespace-pre-wrap">
                      {selectedMessage.body}
                    </div>
                  </div>
                  <div className="p-6 border-t border-gray-800">
                    <button
                      onClick={() => {
                        setComposeData({
                          subject: `RE: ${selectedMessage.subject}`,
                          body: "",
                        })
                        setShowCompose(true)
                      }}
                      className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-semibold"
                    >
                      Reply
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-96 text-gray-400">
                  Select a message to view
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
