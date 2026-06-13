import { describe, it, expect } from 'vitest'
import { parseDiff } from '../diffParser'

const validUnifiedDiff = `diff --git a/src/utils/helper.ts b/src/utils/helper.ts
new file mode 100644
--- /dev/null
+++ b/src/utils/helper.ts
@@ -0,0 +1,5 @@
+export function greet(name: string): string {
+  return \`Hello, \${name}!\`
+}
+
+export default greet
diff --git a/src/index.ts b/src/index.ts
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,3 +1,4 @@
 import { greet } from './utils/helper'
+import { format } from './utils/format'
 
 export default greet('world')
`

describe('parseDiff', () => {
  it('parses a valid unified diff with two files', () => {
    const files = parseDiff(validUnifiedDiff)

    expect(files).toHaveLength(2)
    expect(files[0].file).toBe('src/utils/helper.ts')
    expect(files[0].status).toBe('created')
    expect(files[0].additions).toBe(5)
    expect(files[0].deletions).toBe(0)
    expect(files[0].hunks.length).toBeGreaterThanOrEqual(1)

    expect(files[1].file).toBe('src/index.ts')
    expect(files[1].status).toBe('modified')
    expect(files[1].additions).toBe(1)
    expect(files[1].deletions).toBe(0)
  })

  it('returns empty array for empty diff', () => {
    expect(parseDiff('')).toEqual([])
  })

  it('returns empty array for malformed input', () => {
    expect(parseDiff('not a diff at all')).toEqual([])
  })

  it('parses a deleted file', () => {
    const diff = `diff --git a/src/old.ts b/src/old.ts
deleted file mode 100644
--- a/src/old.ts
+++ /dev/null
@@ -1,2 +0,0 @@
-const x = 1
-const y = 2
`
    const files = parseDiff(diff)
    expect(files).toHaveLength(1)
    expect(files[0].status).toBe('deleted')
    expect(files[0].file).toBe('src/old.ts')
    expect(files[0].deletions).toBe(2)
  })

  it('parses context lines with line numbers', () => {
    const diff = `diff --git a/src/a.ts b/src/a.ts
--- a/src/a.ts
+++ b/src/a.ts
@@ -1,2 +1,2 @@
 line1
-old
+new
`
    const files = parseDiff(diff)
    expect(files).toHaveLength(1)
    const lines = files[0].hunks[0].lines
    const nonEmpty = lines.filter(l => l.content !== '')
    expect(nonEmpty[0].type).toBe('context')
    expect(nonEmpty[0].content).toBe('line1')
    expect(nonEmpty[1].type).toBe('removed')
    expect(nonEmpty[1].content).toBe('old')
    expect(nonEmpty[2].type).toBe('added')
    expect(nonEmpty[2].content).toBe('new')
  })
})
