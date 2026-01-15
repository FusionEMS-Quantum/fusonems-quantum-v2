import { useState } from 'react'
import SectionHeader from '../components/SectionHeader.jsx'
import { apiFetch } from '../services/api.js'

export default function Communications() {
  const [formState, setFormState] = useState({
    channel: 'sms',
    recipient: '',
    body: '',
    media_url: '',
  })
  const [status, setStatus] = useState('')

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormState((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatus('Sending...')
    try {
      const payload = {
        channel: formState.channel,
        recipient: formState.recipient,
        body: formState.body,
      }
      if (formState.media_url) {
        payload.media_url = formState.media_url
      }
      await apiFetch('/api/mail/messages', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      setStatus('Sent')
    } catch (error) {
      setStatus('Failed')
      console.warn('Telnyx send failed', error)
    }
  }

  return (
    <div className="page">
      <SectionHeader
        eyebrow="Communications"
        title="Telnyx Messaging, Voice, and Fax"
        action={<button className="ghost-button">View Logs</button>}
      />

      <div className="panel form-panel">
        <form className="form-grid" onSubmit={handleSubmit}>
          <div>
            <label>Channel</label>
            <select name="channel" value={formState.channel} onChange={handleChange}>
              <option value="sms">SMS</option>
              <option value="voice">Voice Call</option>
              <option value="fax">Fax</option>
            </select>
          </div>
          <div>
            <label>Recipient</label>
            <input
              name="recipient"
              value={formState.recipient}
              onChange={handleChange}
              placeholder="+1 555 123 4567"
              required
            />
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
            <label>Fax Media URL (optional)</label>
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
    </div>
  )
}
