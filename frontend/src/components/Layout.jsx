import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import TopBar from './TopBar.jsx'

export default function Layout({ children }) {
  const location = useLocation()
  const isLanding = location.pathname === '/' || location.pathname === '/landing'

  if (isLanding) {
    return <div className="landing-shell">{children}</div>
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <TopBar />
        <main className="app-content">{children}</main>
      </div>
    </div>
  )
}
