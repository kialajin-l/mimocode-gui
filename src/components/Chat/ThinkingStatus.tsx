import { useEffect, useMemo, useState } from 'react'

const WIDTH = 14
const HOLD_START = 8
const HOLD_END = 8
const TRAIL = ['·', '∙', '˙']

export function ThinkingStatus() {
  const frames = useMemo(() => createPlaneFrames(), [])
  const [frameIndex, setFrameIndex] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setFrameIndex(index => (index + 1) % frames.length)
    }, 40)
    return () => window.clearInterval(timer)
  }, [frames.length])

  return (
    <div className="thinking-status" role="status" aria-live="polite" aria-label="模型正在思考">
      <span className="thinking-border" />
      <span className="thinking-plane" aria-hidden="true">
        {Array.from(frames[frameIndex]).map((char, index) => (
          <span
            className={char === '🛸' ? 'ship' : char.trim() ? 'trail' : 'empty'}
            key={`${index}-${char}`}
            style={{ animationDelay: `${index * 28}ms` }}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        ))}
      </span>
      <span className="thinking-label">MiMoCode 正在思考</span>
    </div>
  )
}

function createPlaneFrames() {
  const totalFrames = WIDTH + HOLD_END + (WIDTH - 1) + HOLD_START

  return Array.from({ length: totalFrames }, (_, frameIndex) => {
    const state = getScannerState(frameIndex)
    return Array.from({ length: WIDTH }, (_, charIndex) => {
      const distance = state.isMovingForward
        ? state.activePosition - charIndex
        : charIndex - state.activePosition
      if (distance === 0) return '🛸'
      if (distance > 0 && distance < 6) return TRAIL[(frameIndex + distance) % TRAIL.length]
      return ' '
    }).join('')
  })
}

function getScannerState(frameIndex: number) {
  if (frameIndex < WIDTH) {
    return { activePosition: frameIndex, isMovingForward: true }
  }

  if (frameIndex < WIDTH + HOLD_END) {
    return { activePosition: WIDTH - 1, isMovingForward: true }
  }

  if (frameIndex < WIDTH + HOLD_END + WIDTH - 1) {
    const backwardIndex = frameIndex - WIDTH - HOLD_END
    return { activePosition: WIDTH - 2 - backwardIndex, isMovingForward: false }
  }

  return { activePosition: 0, isMovingForward: false }
}
