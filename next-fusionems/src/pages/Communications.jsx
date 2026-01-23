import { useEffect, useState } from 'react'
import SectionHeader from '../components/SectionHeader.jsx'
import DataTable from '../components/DataTable.jsx'
import AdvisoryPanel from '../components/AdvisoryPanel.jsx'
import { apiFetch } from '../services/api.js'

export default function Communications() {
  const [threads, setThreads] = useState([])
  const [messages, setMessages] = useState([])
  const [calls, setCalls] = useState([])
  const [queue, setQueue] = useState([])
  const [broadcasts, setBroadcasts] = useState([])
  const [templates, setTemplates] = useState([])
  const [health, setHealth] = useState({
    status: 'unknown',
    configured: false,
    telnyx_number: null,
  })
  const [timelineId, setTimelineId] = useState('')
  const [timeline, setTimeline] = useState([])
  const [activeThread, setActiveThread] = useState(null)
  const [formState, setFormState] = useState({
    sender: 'Dispatch',
    body: '',
    media_url: '',
  })
  const [templateState, setTemplateState] = useState({
    name: '',
    channel: 'sms',
    subject: '',
    body: '',
  })
  const [status, setStatus] = useState('')
  const [templateStatus, setTemplateStatus] = useState('')

  const threadColumns = [
    { key: 'subject', label: 'Thread' },
    { key: 'channel', label: 'Channel' },
    { key: 'priority', label: 'Priority' },
    { key: 'status', label: 'Status' },
  ]

  const messageColumns = [
    { key: 'sender', label: 'Sender' },
    { key: 'body', label: 'Message' },
    { key: 'delivery_status', label: 'Status' },
  ]

  const callColumns = [
    { key: 'caller', label: 'Caller' },
    { key: 'recipient', label: 'Recipient' },
    { key: 'duration_seconds', label: 'Duration' },
    { key: 'disposition', label: 'Disposition' },
  ]

  const queueColumns = [
    { key: 'title', label: 'Task' },
    { key: 'owner', label: 'Owner' },
    { key: 'status', label: 'Status' },
  ]

  const broadcastColumns = [
    { key: 'title', label: 'Broadcast' },
    { key: 'status', label: 'Status' },
    { key: 'target', label: 'Target' },
  ]

  const templateColumns = [
    { key: 'name', label: 'Template' },
    { key: 'channel', label: 'Channel' },
    { key: 'subject', label: 'Subject' },
    { key: 'is_active', label: 'Active' },
  ]

  const timelineColumns = [
    { key: 'event_type', label: 'Event' },
    { key: 'provider_event_id', label: 'Provider ID' },
    { key: 'occurred_at', label: 'Occurred' },
  ]

  const loadThreads = async () => {
    try {
      const data = await apiFetch('/api/comms/threads')
      if (Array.isArray(data) && data.length > 0) {
        setThreads(data)
        setActiveThread(data[0]?.id || null)
        return
      }
      setThreads([])
      setActiveThread(null)
    } catch (error) {
      console.warn('Threads unavailable', error)
    }
  }

  const loadMessages = async (threadId) => {
    if (!threadId) return
    try {
      const data = await apiFetch(`/api/comms/threads/${threadId}/messages`)
      if (Array.isArray(data)) {
        setMessages(data)
      }
    } catch (error) {
      console.warn('Messages unavailable', error)
    }
  }

  const loadCalls = async () => {
    try {
      const data = await apiFetch('/api/comms/calls')
      if (Array.isArray(data) && data.length > 0) {
        setCalls(data)
        if (!timelineId && data[0]?.external_call_id) {
          setTimelineId(data[0].external_call_id)
        }
        return
      }
      setCalls([])
    } catch (error) {
      console.warn('Call logs unavailable', error)
    }
  }

  const loadHealth = async () => {
    try {
      const data = await apiFetch('/api/comms/health')
      if (data?.status) {
        setHealth(data)
      }
    } catch (error) {
      console.warn('Comms health unavailable', error)
    }
  }

  const loadQueue = async () => {
    try {
      const data = await apiFetch('/api/comms/queue')
      if (Array.isArray(data)) {
        setQueue(data)
      }
    } catch (error) {
      console.warn('Comms queue unavailable', error)
    }
  }

  const loadBroadcasts = async () => {
    try {
      const data = await apiFetch('/api/comms/broadcasts')
      if (Array.isArray(data)) {
        setBroadcasts(data)
      }
    } catch (error) {
      console.warn('Broadcasts unavailable', error)
    }
  }

  const loadTemplates = async () => {
    try {
      const data = await apiFetch('/api/comms/templates')
      if (Array.isArray(data)) {
        setTemplates(data)
      }
    } catch (error) {
      console.warn('Templates unavailable', error)
    }
  }

  const loadTimeline = async () => {
    if (!timelineId) {
      setTimeline([])
      return
    }
    try {
      const data = await apiFetch(`/api/comms/calls/${timelineId}/timeline`)
      if (Array.isArray(data)) {
        setTimeline(data)
      }
    } catch (error) {
      console.warn('Timeline unavailable', error)
    }
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormState((prev) => ({ ...prev, [name]: value }))
  }

  const handleTemplateChange = (event) => {
    const { name, value } = event.target
    setTemplateState((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatus('Sending...')
    try {
      const payload = {
        thread_id: activeThread,
        sender: formState.sender,
        body: formState.body,
      }
      if (formState.media_url) {
        payload.media_url = formState.media_url
      }
      await apiFetch('/api/comms/messages', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      await loadMessages(activeThread)
      setStatus('Sent')
    } catch (error) {
      setStatus('Failed')
      console.warn('Comms send failed', error)
    }
  }

  const handleTemplateSubmit = async (event) => {
    event.preventDefault()
    setTemplateStatus('Saving...')
    try {
      await apiFetch('/api/comms/templates', {
        method: 'POST',
        body: JSON.stringify(templateState),
      })
      setTemplateState({
        name: '',
        channel: 'sms',
        subject: '',
        body: '',
      })
      await loadTemplates()
      setTemplateStatus('Saved')
    } catch (error) {
      setTemplateStatus('Failed')
      console.warn('Template save failed', error)
    }
  }

  useEffect(() => {
    loadThreads()
    loadCalls()
    loadHealth()
    loadQueue()
    loadBroadcasts()
    loadTemplates()
  }, [])

  useEffect(() => {
    loadMessages(activeThread)
  }, [activeThread])

  useEffect(() => {
    loadTimeline()
  }, [timelineId])

  return (
    <div className="page">
      <SectionHeader
        eyebrow="Communications"
        title="Command Inbox + Incident Comms"
        action={<button className="ghost-button">Create Broadcast</button>}
      />

      <div className="section-grid">
        <div className="panel">
          <SectionHeader eyebrow="Threads" title="Active Conversations" />
          <DataTable
            columns={threadColumns}
            rows={threads}
            emptyState="No comms threads yet."
          />
          <div className="panel-actions">
            {threads.map((thread) => (
              <button
                key={thread.id}
                className={thread.id === activeThread ? 'primary-button' : 'ghost-button'}
                onClick={() => setActiveThread(thread.id)}
              >
                Focus {thread.subject || `Thread ${thread.id}`}
              </button>
            ))}
          </div>
        </div>
        <div className="panel">
          <AdvisoryPanel
            title="AI Triage"
            model="comms-orchestrator"
            version="1.6"
            level="ADVISORY"
            message="2 threads marked high priority. Suggested escalation to supervisor."
            reason="Sentiment + SLA drift detection"
          />
          <div className="note-card">
            <p className="note-title">Incident Broadcast</p>
            <p className="note-body">One active advisory running for Zone 4 weather hold.</p>
          </div>
          <div className="note-card">
            <p className="note-title">Telnyx Health</p>
            <p className="note-body">
              Status: {health.status} · Configured: {health.configured ? 'Yes' : 'No'}
            </p>
            {health.telnyx_number ? (
              <p className="note-sub">Number: {health.telnyx_number}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="section-grid">
        <div className="panel">
          <SectionHeader eyebrow="Queue" title="Retries + Escalations" />
          <DataTable columns={queueColumns} rows={queue} emptyState="No queued comms tasks." />
        </div>
        <div className="panel">
          <SectionHeader eyebrow="Broadcasts" title="Org-wide Alerts" />
          <DataTable columns={broadcastColumns} rows={broadcasts} emptyState="No broadcasts yet." />
        </div>
      </div>

      <div className="panel">
        <SectionHeader eyebrow="Templates" title="Message Templates" />
        <DataTable columns={templateColumns} rows={templates} emptyState="No templates yet." />
        <form className="form-grid" onSubmit={handleTemplateSubmit}>
          <div>
            <label>Name</label>
            <input name="name" value={templateState.name} onChange={handleTemplateChange} />
          </div>
          <div>
            <label>Channel</label>
            <select name="channel" value={templateState.channel} onChange={handleTemplateChange}>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
              <option value="fax">Fax</option>
            </select>
          </div>
          <div className="full-width">
            <label>Subject</label>
            <input
              name="subject"
              value={templateState.subject}
              onChange={handleTemplateChange}
            />
          </div>
          <div className="full-width">
            <label>Body</label>
            <textarea
              name="body"
              value={templateState.body}
              onChange={handleTemplateChange}
            />
          </div>
          <div className="full-width align-end">
            <button className="primary-button" type="submit">
              Save Template
            </button>
            {templateStatus ? <span className="status-text">{templateStatus}</span> : null}
          </div>
        </form>
      </div>

      <div className="panel form-panel">
        <SectionHeader eyebrow="Compose" title="Thread Message" />
        <form className="form-grid" onSubmit={handleSubmit}>
          <div>
            <label>Sender</label>
            <input name="sender" value={formState.sender} onChange={handleChange} />
          </div>
          <div className="full-width">
            <label>Message</label>
            <input
              name="body"
              value={formState.body}
              onChange={handleChange}
              placeholder="Dispatch update or patient notice"
              required
            />
          </div>
          <div className="full-width">
            <label>Media URL (optional)</label>
            <input
              name="media_url"
              value={formState.media_url}
              onChange={handleChange}
              placeholder="https://example.com/fax.pdf"
            />
          </div>
          <div className="full-width align-end">
            <button className="primary-button" type="submit">
              Send
            </button>
          </div>
        </form>
        {status ? <p className="status-text">{status}</p> : null}
      </div>

      <div className="section-grid">
        <div className="panel">
          <SectionHeader eyebrow="Messages" title="Thread History" />
          <DataTable columns={messageColumns} rows={messages} emptyState="No messages yet." />
        </div>
        <div className="panel">
          <SectionHeader eyebrow="Calls" title="Voice Logs" />
          <DataTable columns={callColumns} rows={calls} emptyState="No calls logged." />
        </div>
      </div>

      <div className="panel">
        <SectionHeader eyebrow="Timeline" title="Call Event Timeline" />
        <div className="search-input-row">
          <input
            className="text-input"
            value={timelineId}
            onChange={(event) => setTimelineId(event.target.value)}
            placeholder="Enter external call ID"
          />
          <button className="ghost-button" type="button" onClick={loadTimeline}>
            Load Timeline
          </button>
        </div>
        <DataTable columns={timelineColumns} rows={timeline} emptyState="No call events recorded." />
      </div>
    </div>
  )
}
