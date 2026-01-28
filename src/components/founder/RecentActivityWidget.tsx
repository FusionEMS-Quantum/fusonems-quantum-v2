"use client"

import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"

type StorageActivity = {
  timestamp: string
  action_type: string
  file_path: string
  user_id: number | null
  success: boolean
  error_message: string | null
}

type ActivityResponse = {
  activity: StorageActivity[]
  count: number
}

export function RecentActivityWidget() {
  const [activity, setActivity] = useState<StorageActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const fetchActivity = () => {
      apiFetch<ActivityResponse>("/api/founder/storage/activity?limit=10")
        .then((data) => {
          if (mounted) {
            setActivity(data.activity)
            setLoading(false)
          }
        })
        .catch(() => {
          if (mounted) setLoading(false)
        })
    }

    fetchActivity()
    const interval = setInterval(fetchActivity, 30000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  if (loading) {
    return (
      <section className="panel">
        <header>
          <h3>Recent Storage Activity</h3>
        </header>
        <div className="panel-card">
          <p className="muted-text">Loading activity...</p>
        </div>
      </section>
    )
  }

  return (
    <section className="panel">
      <header>
        <h3>Recent Storage Activity</h3>
        <p className="muted-text">Last 10 file operations</p>
      </header>

      <ul className="activity-list">
        {activity.map((item, i) => {
          const fileName = item.file_path.split("/").pop() || item.file_path
          const time = new Date(item.timestamp).toLocaleTimeString()

          return (
            <li key={i} className={`activity-item ${item.success ? "success" : "failed"}`}>
              <div className="activity-icon">{item.success ? "✓" : "✗"}</div>
              <div className="activity-content">
                <div className="activity-header">
                  <strong className="activity-action">{item.action_type}</strong>
                  <span className="activity-time">{time}</span>
                </div>
                <p className="activity-file">{fileName}</p>
                {!item.success && item.error_message && (
                  <p className="activity-error">❌ {item.error_message}</p>
                )}
              </div>
            </li>
          )
        })}

        {activity.length === 0 && (
          <li className="activity-item">
            <p className="muted-text">No recent activity</p>
          </li>
        )}
      </ul>

      <style jsx>{`
        .activity-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .activity-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.75rem;
          border-bottom: 1px solid #e0e0e0;
        }
        .activity-item:last-child {
          border-bottom: none;
        }
        .activity-icon {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          font-size: 0.875rem;
          font-weight: 700;
          flex-shrink: 0;
        }
        .activity-item.success .activity-icon {
          background: #e8f5e9;
          color: #4caf50;
        }
        .activity-item.failed .activity-icon {
          background: #ffebee;
          color: #f44336;
        }
        .activity-content {
          flex: 1;
          min-width: 0;
        }
        .activity-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.5rem;
        }
        .activity-action {
          font-size: 0.9rem;
          font-weight: 600;
        }
        .activity-time {
          font-size: 0.8rem;
          color: #666;
        }
        .activity-file {
          font-size: 0.85rem;
          color: #666;
          margin: 0.25rem 0 0 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .activity-error {
          font-size: 0.8rem;
          color: #f44336;
          margin: 0.25rem 0 0 0;
        }
      `}</style>
    </section>
  )
}
