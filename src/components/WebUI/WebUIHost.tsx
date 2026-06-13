import { useEffect, useRef, useState } from 'react'
import { useRuntimeStore } from '../../stores/runtimeStore'

export function WebUIHost() {
  const webviewRef = useRef<HTMLWebViewElement>(null)
  const { serveStatus, serveUrl, startServe, stopServe } = useRuntimeStore()
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    if (serveStatus === 'running' && serveUrl) {
      setIsLoading(true)
      setHasError(false)
    }
  }, [serveStatus, serveUrl])

  useEffect(() => {
    const webview = webviewRef.current
    if (!webview) return

    const handleDidFinishLoad = () => setIsLoading(false)
    const handleDidFailLoad = () => {
      setIsLoading(false)
      setHasError(true)
    }

    webview.addEventListener('did-finish-load', handleDidFinishLoad)
    webview.addEventListener('did-fail-load', handleDidFailLoad)

    return () => {
      webview.removeEventListener('did-finish-load', handleDidFinishLoad)
      webview.removeEventListener('did-fail-load', handleDidFailLoad)
    }
  }, [serveUrl])

  const handleRefresh = () => {
    const webview = webviewRef.current as any
    if (webview) {
      setIsLoading(true)
      setHasError(false)
      webview.reload()
    }
  }

  return (
    <div className="webui-host">
      <div className="webui-toolbar">
        <div className="webui-toolbar-left">
          <span className="webui-toolbar-label">Web UI</span>
          {serveUrl && (
            <span className="webui-toolbar-url">{serveUrl}</span>
          )}
        </div>
        <div className="webui-toolbar-right">
          {serveStatus === 'stopped' || serveStatus === 'error' ? (
            <button className="webui-action-btn webui-start-btn" onClick={() => startServe()}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Start
            </button>
          ) : (
            <button className="webui-action-btn webui-stop-btn" onClick={() => stopServe()}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
              Stop
            </button>
          )}
          {serveStatus === 'running' && (
            <button className="webui-action-btn" onClick={handleRefresh} title="Refresh">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            </button>
          )}
        </div>
      </div>

      <div className="webui-content">
        {serveStatus === 'stopped' && !serveUrl && (
          <div className="webui-placeholder">
            <div className="webui-placeholder-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
            </div>
            <h3>Mimo Web UI</h3>
            <p>Start the serve to view the Web UI</p>
            <button className="webui-placeholder-btn" onClick={() => startServe()}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Start Serve
            </button>
          </div>
        )}

        {serveStatus === 'error' && (
          <div className="webui-placeholder webui-error">
            <div className="webui-placeholder-icon error">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h3>Failed to start</h3>
            <p>Check the terminal for error details</p>
            <button className="webui-placeholder-btn" onClick={() => startServe()}>
              Retry
            </button>
          </div>
        )}

        {serveUrl && (
          <div className="webui-webview-container" style={{ opacity: isLoading ? 0.5 : 1 }}>
            {isLoading && (
              <div className="webui-loading-overlay">
                <div className="webui-spinner" />
                <span>Loading Web UI...</span>
              </div>
            )}
            {hasError && (
              <div className="webui-loading-overlay">
                <span>Failed to load. </span>
                <button className="webui-retry-btn" onClick={handleRefresh}>Retry</button>
              </div>
            )}
            <webview
              ref={webviewRef}
              src={serveUrl}
              className="webui-webview"
              nodeintegration={false}
              partition="mimocode-webui"
            />
          </div>
        )}
      </div>
    </div>
  )
}
