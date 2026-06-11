import { ErrorBoundary } from './components/ErrorBoundary'
import { ThemeSwitcher } from './components/Settings/ThemeSwitcher'
import { SessionList } from './components/Sidebar/SessionList'
import { MessageList } from './components/Chat/MessageList'
import { MessageInput } from './components/Chat/MessageInput'
import { useSession } from './hooks/useSession'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import './App.css'

function App() {
  const { activeSession, sendMessage } = useSession()
  useKeyboardShortcuts()
  
  return (
    <ErrorBoundary>
      <div className="app">
        <header className="app-header">
          <h1>MiMoCode</h1>
          <ThemeSwitcher />
        </header>
        <main className="app-main">
          <SessionList />
          <div className="app-chat">
            {activeSession ? (
              <>
                <MessageList messages={activeSession.messages} />
                <MessageInput onSend={sendMessage} />
              </>
            ) : (
              <div className="app-empty">
                <p>Select a session or create a new one</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </ErrorBoundary>
  )
}

export default App
