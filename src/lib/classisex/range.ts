/**
 * Single byte-range parser for the protected media route (iPhone Safari plays <video> only
 * when the server answers 206). Payload's own parser is internal, so this is ours.
 * Multi-range and non-byte units fall back to the full body. Pure module.
 */
export type RangeResult = { type: 'full' } | { type: 'partial'; start: number; end: number } | { type: 'invalid' }

export function parseRange(header: string | null | undefined, size: number): RangeResult {
  if (!header) return { type: 'full' }
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!match) return { type: 'full' }
  const [, a, b] = match
  if (a === '' && b === '') return { type: 'full' }
  let start: number
  let end: number
  if (a === '') {
    const suffix = Number(b)
    if (suffix === 0 || size === 0) return { type: 'invalid' }
    start = Math.max(0, size - suffix)
    end = size - 1
  } else {
    start = Number(a)
    end = b === '' ? size - 1 : Math.min(Number(b), size - 1)
  }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || start > end) {
    return { type: 'invalid' }
  }
  return { type: 'partial', start, end }
}
