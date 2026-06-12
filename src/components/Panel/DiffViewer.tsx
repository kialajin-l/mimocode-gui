import { FileChange } from '../../utils/diffParser'

interface DiffViewerProps {
  changes: FileChange[]
}

export function DiffViewer({ changes }: DiffViewerProps) {
  if (changes.length === 0) {
    return (
      <div className="review-empty">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.35">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <span>暂无审查内容</span>
        <span style={{ fontSize: 11 }}>AI 修改文件后将在此显示 Diff</span>
      </div>
    )
  }

  return (
    <div className="diff-list">
      {changes.map((change, i) => (
        <div key={i} className="diff-file">
          <div className="diff-file-header">
            <div className="diff-file-name">
              <span className={`file-status ${change.status}`}>
                {change.status === 'created' ? '新建' : change.status === 'deleted' ? '删除' : '已修改'}
              </span>
              <span className="file-path">{change.file}</span>
            </div>
            <div className="diff-stats">
              <span className="diff-added">+{change.additions}</span>
              <span className="diff-removed">-{change.deletions}</span>
            </div>
          </div>
          <div className="diff-content">
            {change.hunks.map((hunk, j) => (
              <div key={j} className="diff-hunk">
                <div className="diff-hunk-header">{hunk.header}</div>
                {hunk.lines.map((line, k) => (
                  <div key={k} className={`diff-line diff-${line.type}`}>
                    <span className="diff-line-num">
                      {line.oldLine || ''}
                    </span>
                    <span className="diff-line-num">
                      {line.newLine || ''}
                    </span>
                    <span className="diff-line-sign">
                      {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                    </span>
                    <span className="diff-line-content">{line.content}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
