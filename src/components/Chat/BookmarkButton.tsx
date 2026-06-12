interface BookmarkButtonProps {
  bookmarked: boolean
  onToggle: () => void
}

export function BookmarkButton({ bookmarked, onToggle }: BookmarkButtonProps) {
  return (
    <button
      className={`bookmark-btn ${bookmarked ? 'bookmarked' : ''}`}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      title={bookmarked ? '取消书签' : '添加书签'}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  )
}
