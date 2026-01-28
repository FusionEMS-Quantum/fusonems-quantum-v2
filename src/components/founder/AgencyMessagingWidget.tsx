"use client"

import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"

// LOCKED UI LABELS - Do not modify
const SECTION_TITLE = "Agency Status"
const STATUS_LABELS = {
  WAITING_ON_PAYER: "Waiting on Payer",
  REMITTANCE_OVERDUE: "Remittance Overdue",
  DOCUMENTATION_PENDING: "Documentation Pending",
  UNDER_REVIEW: "Under Review",
  RESOLVED: "Resolved",
  NO_ACTION_REQUIRED: "No Action Required"
}

interface AgencyMessage {
  id: number
  thread_id: string
  category: string
  priority: "high" | "medium" | "low"
  status: string
  subject: string
  sender_name: string
  received_at: string
  acknowledged_at: string | null
  responded_at: string | null
}

interface AgencyMessagesResponse {
  agency_id: number
  agency_name: string
  messages: AgencyMessage[]
  count: number
}

export default function AgencyMessagingWidget() {
  const [data, setData] = useState<AgencyMessagesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [unreadCount, setUnreadCount] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    
    const loadMessages = async () => {
      try {
        const response = await apiFetch<AgencyMessagesResponse>(
          "/api/agency/messages?limit=20"
        )
        
        if (mounted) {
          setData(response)
          // Count unread (not acknowledged)
          const unread = response.messages.filter(m => !m.acknowledged_at).length
          setUnreadCount(unread)
        }
      } catch (err) {
        if (mounted) {
          setError("Failed to load agency messages")
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }
    
    loadMessages()
    
    // Refresh every 30 seconds
    const interval = setInterval(loadMessages, 30000)
    
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  const filteredMessages = selectedCategory
    ? data?.messages.filter(m => m.category === selectedCategory) || []
    : data?.messages || []

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "priority-high"
      case "medium": return "priority-medium"
      case "low": return "priority-low"
      default: return "priority-normal"
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  if (loading) {
    return (
      <div className="widget agency-messaging loading">
        <div className="widget-header">
          <h3>{SECTION_TITLE}</h3>
        </div>
        <div className="widget-content">
          <p>Loading agency messages...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="widget agency-messaging error">
        <div className="widget-header">
          <h3>{SECTION_TITLE}</h3>
        </div>
        <div className="widget-content">
          <p>{error || "Agency messaging unavailable"}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="widget agency-messaging">
      <div className="widget-header">
        <h3>
          {SECTION_TITLE}
          {unreadCount > 0 && (
            <span className="unread-badge" title={`${unreadCount} unread messages`}>
              {unreadCount}
            </span>
          )}
        </h3>
        <div className="widget-actions">
          <button
            className="widget-action-btn primary"
            title="Send status update to agencies"
          >
            Send Claim Status Update
          </button>
        </div>
      </div>

      <div className="widget-content">
        {/* Category Filter */}
        <div className="category-filter">
          <button
            className={selectedCategory === null ? "active" : ""}
            onClick={() => setSelectedCategory(null)}
          >
            All ({data.messages.length})
          </button>
          <button
            className={selectedCategory === "billing" ? "active" : ""}
            onClick={() => setSelectedCategory("billing")}
          >
            Billing
          </button>
          <button
            className={selectedCategory === "claim_status" ? "active" : ""}
            onClick={() => setSelectedCategory("claim_status")}
          >
            Claims
          </button>
          <button
            className={selectedCategory === "general" ? "active" : ""}
            onClick={() => setSelectedCategory("general")}
          >
            General
          </button>
        </div>

        {/* Message List */}
        <div className="messages-list">
          {filteredMessages.length === 0 ? (
            <div className="no-messages">
              <p>{STATUS_LABELS.NO_ACTION_REQUIRED}</p>
            </div>
          ) : (
            filteredMessages.map((message) => (
              <div
                key={message.id}
                className={`message-item ${getPriorityColor(message.priority)} ${
                  !message.acknowledged_at ? "unread" : ""
                }`}
              >
                <div className="message-meta">
                  <span className="message-sender">{message.sender_name}</span>
                  <span className="message-time">{formatTimeAgo(message.received_at)}</span>
                </div>
                <div className="message-subject">{message.subject}</div>
                <div className="message-footer">
                  <span className={`category-tag ${message.category}`}>
                    {message.category.replace('_', ' ')}
                  </span>
                  {message.priority === "high" && (
                    <span className="priority-indicator">High Priority</span>
                  )}
                  {message.responded_at && (
                    <span className="status-badge responded">Responded</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Quick Stats */}
        <div className="message-stats">
          <div className="stat">
            <span className="stat-label">Total</span>
            <span className="stat-value">{data.messages.length}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Unread</span>
            <span className="stat-value">{unreadCount}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Responded</span>
            <span className="stat-value">
              {data.messages.filter(m => m.responded_at).length}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
