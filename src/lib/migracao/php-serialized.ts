/**
 * Minimal, safe reader for PHP-serialized values found in WordPress meta (capabilities,
 * wmu_attachments, wpDiscuz form layout). Pure: no eval, no object instantiation.
 */
// T-06-07: bounded recursion, byte-length aware, malformed input -> empty result.

type PhpValue = string | number | boolean | null | PhpArray
type PhpArray = { entries: [string | number, PhpValue][] }

const MAX_DEPTH = 12
const MAX_ENTRIES = 5000

function parseValue(buf: Buffer, pos: { i: number }, depth: number): PhpValue {
  if (depth > MAX_DEPTH) throw new Error('profundidade')
  const type = String.fromCharCode(buf[pos.i] ?? 0)
  const expect = (ch: string) => {
    if (String.fromCharCode(buf[pos.i] ?? 0) !== ch) throw new Error('formato')
    pos.i++
  }
  const readUntil = (ch: string): string => {
    const end = buf.indexOf(ch, pos.i, 'latin1')
    if (end < 0 || end - pos.i > 40) throw new Error('formato')
    const text = buf.toString('latin1', pos.i, end)
    pos.i = end + 1
    return text
  }
  switch (type) {
    case 'N':
      pos.i++
      expect(';')
      return null
    case 'b': {
      pos.i++
      expect(':')
      const v = readUntil(';')
      if (v !== '0' && v !== '1') throw new Error('formato')
      return v === '1'
    }
    case 'i': {
      pos.i++
      expect(':')
      const v = readUntil(';')
      if (!/^-?\d+$/.test(v)) throw new Error('formato')
      return Number(v)
    }
    case 'd': {
      pos.i++
      expect(':')
      const v = Number(readUntil(';'))
      if (Number.isNaN(v)) throw new Error('formato')
      return v
    }
    case 's': {
      pos.i++
      expect(':')
      const len = Number(readUntil(':'))
      if (!Number.isInteger(len) || len < 0) throw new Error('formato')
      expect('"')
      if (pos.i + len > buf.length) throw new Error('formato')
      const text = buf.toString('utf8', pos.i, pos.i + len)
      pos.i += len
      expect('"')
      expect(';')
      return text
    }
    case 'a': {
      pos.i++
      expect(':')
      const n = Number(readUntil(':'))
      if (!Number.isInteger(n) || n < 0 || n > MAX_ENTRIES) throw new Error('formato')
      expect('{')
      const entries: [string | number, PhpValue][] = []
      for (let k = 0; k < n; k++) {
        const key = parseValue(buf, pos, depth + 1)
        if (typeof key !== 'string' && typeof key !== 'number') throw new Error('formato')
        entries.push([key, parseValue(buf, pos, depth + 1)])
      }
      expect('}')
      return { entries }
    }
    default:
      throw new Error('formato')
  }
}

function parse(value: string): PhpValue | undefined {
  try {
    const buf = Buffer.from(value, 'utf8')
    const pos = { i: 0 }
    return parseValue(buf, pos, 0)
  } catch {
    return undefined
  }
}

const isArray = (v: PhpValue | undefined): v is PhpArray =>
  typeof v === 'object' && v !== null && 'entries' in v

/** Top-level string keys of a serialized array (capabilities -> roles). Malformed -> []. */
export function serializedKeys(value: string): string[] {
  const parsed = parse(value)
  if (!isArray(parsed)) return []
  return parsed.entries.map(([k]) => k).filter((k): k is string => typeof k === 'string')
}

/** Every integer or numeric-string value inside a serialized structure, de-duplicated, in order. */
export function serializedIntegers(value: string): number[] {
  const parsed = parse(value)
  const out: number[] = []
  const seen = new Set<number>()
  const visit = (v: PhpValue) => {
    if (isArray(v)) {
      for (const [, child] of v.entries) visit(child)
      return
    }
    let n: number | null = null
    if (typeof v === 'number' && Number.isInteger(v)) n = v
    else if (typeof v === 'string' && /^\d{1,15}$/.test(v)) n = Number(v)
    if (n !== null && !seen.has(n)) {
      seen.add(n)
      out.push(n)
    }
  }
  if (parsed !== undefined) visit(parsed)
  return out
}

/** wpDiscuz form layout: map `custom_field_<hex>` -> its "name" label. Unknown -> {}. */
export function serializedFieldLabels(value: string): Record<string, string> {
  const labels: Record<string, string> = {}
  if (typeof value !== 'string' || value.length > 2_000_000) return labels
  const keyRe = /s:\d{1,3}:"(custom_field_[0-9a-f]{4,32})";/g
  const hits = [...value.matchAll(keyRe)]
  hits.forEach((hit, idx) => {
    const start = (hit.index ?? 0) + hit[0].length
    const end = Math.min(hits[idx + 1]?.index ?? value.length, start + 3000)
    const m = /s:4:"name";s:\d{1,4}:"([^"]{0,200})";/.exec(value.slice(start, end))
    if (m && labels[hit[1]!] === undefined) labels[hit[1]!] = m[1]!
  })
  return labels
}
