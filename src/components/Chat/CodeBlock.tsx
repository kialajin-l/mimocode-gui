import { useEffect, useRef, useState } from 'react'

const hljsPromise = import('highlight.js')

interface CodeBlockProps {
  code: string
  language?: string
}

export function CodeBlock({ code, language }: CodeBlockProps) {
  const codeRef = useRef<HTMLElement>(null)
  const [copied, setCopied] = useState(false)
  const [highlighted, setHighlighted] = useState(false)

  useEffect(() => {
    if (codeRef.current && language && !highlighted) {
      hljsPromise.then(hljs => {
        if (codeRef.current) {
          hljs.default.highlightElement(codeRef.current)
          setHighlighted(true)
        }
      })
    }
  }, [code, language, highlighted])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="code-block">
      <div className="code-block-header">
        <span className="code-block-lang">{language || 'code'}</span>
        <button className="code-block-copy" onClick={handleCopy}>
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      <pre className="code-block-pre">
        <code ref={codeRef} className={language ? `language-${language}` : ''}>
          {code}
        </code>
      </pre>
    </div>
  )
}
