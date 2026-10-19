/**
 * Minimal ISO-BMFF (MP4/MOV) reader for subscriber videos (D-01, CLAS-06).
 * There is no ffmpeg in the runner image, so duration and metadata handling live here.
 *
 * T-04-18: iterative walker with bounds checks; it only descends into moov and trak and
 * stops after MAX_BOXES boxes, so crafted files cannot loop or blow the stack.
 *
 * Pure module: no Payload/Next/sharp imports.
 */

/** D-01: subscriber videos are at most 60 seconds long. */
export const MAX_VIDEO_SECONDS = 60

const MAX_BOXES = 100_000

export class Mp4Error extends Error {
  constructor(message = 'Não conseguimos ler este vídeo. Envie um MP4 ou MOV gravado pelo celular.') {
    super(message)
    this.name = 'Mp4Error'
  }
}

type Box = { type: string; start: number; headerSize: number; end: number }

function readBoxes(buf: Buffer, start: number, end: number, counter: { n: number }): Box[] {
  const boxes: Box[] = []
  let offset = start
  while (offset < end) {
    if (++counter.n > MAX_BOXES) throw new Mp4Error()
    if (end - offset < 8) throw new Mp4Error()
    let size = buf.readUInt32BE(offset)
    const type = buf.toString('latin1', offset + 4, offset + 8)
    let headerSize = 8
    if (size === 1) {
      if (end - offset < 16) throw new Mp4Error()
      const large = buf.readBigUInt64BE(offset + 8)
      if (large > BigInt(end - offset)) throw new Mp4Error()
      size = Number(large)
      headerSize = 16
    } else if (size === 0) {
      size = end - offset
    }
    if (size < headerSize || offset + size > end) throw new Mp4Error()
    boxes.push({ type, start: offset, headerSize, end: offset + size })
    offset += size
  }
  return boxes
}

function findMoov(buf: Buffer, counter: { n: number }): { top: Box[]; moov: Box } {
  const top = readBoxes(buf, 0, buf.length, counter)
  const moov = top.find((b) => b.type === 'moov')
  if (!moov) throw new Mp4Error()
  return { top, moov }
}

export function readMp4Info(buf: Buffer): { durationSeconds: number; majorBrand: string | null } {
  const counter = { n: 0 }
  const { top, moov } = findMoov(buf, counter)
  const children = readBoxes(buf, moov.start + moov.headerSize, moov.end, counter)
  const mvhd = children.find((b) => b.type === 'mvhd')
  if (!mvhd) throw new Mp4Error()

  const p = mvhd.start + mvhd.headerSize
  const length = mvhd.end - p
  if (length < 4) throw new Mp4Error()
  const version = buf.readUInt8(p)
  let timescale: number
  let duration: number
  if (version === 1) {
    if (length < 32) throw new Mp4Error()
    timescale = buf.readUInt32BE(p + 20)
    duration = Number(buf.readBigUInt64BE(p + 24))
  } else {
    if (length < 20) throw new Mp4Error()
    timescale = buf.readUInt32BE(p + 12)
    duration = buf.readUInt32BE(p + 16)
  }
  if (!timescale || !Number.isFinite(duration)) throw new Mp4Error()

  const ftyp = top.find((b) => b.type === 'ftyp')
  let majorBrand: string | null = null
  if (ftyp && ftyp.end - (ftyp.start + ftyp.headerSize) >= 4) {
    const s = ftyp.start + ftyp.headerSize
    majorBrand = buf.toString('latin1', s, s + 4).trim() || null
  }
  return { durationSeconds: duration / timescale, majorBrand }
}

const METADATA_TYPES = new Set(['udta', 'meta'])

/**
 * T-04-06: phones store GPS in udta/©xyz and meta keys; zeroing keeps every chunk offset
 * valid. Returns a copy where each udta/meta box directly under moov or under any moov/trak
 * becomes a zero-filled 'free' box of the same size.
 */
export function scrubMp4Metadata(buf: Buffer): { data: Buffer; scrubbed: number } {
  const counter = { n: 0 }
  const { moov } = findMoov(buf, counter)
  const data = Buffer.from(buf)
  let scrubbed = 0

  const neutralise = (b: Box) => {
    data.write('free', b.start + 4, 'latin1')
    data.fill(0, b.start + b.headerSize, b.end)
    scrubbed++
  }

  const children = readBoxes(buf, moov.start + moov.headerSize, moov.end, counter)
  for (const child of children) {
    if (METADATA_TYPES.has(child.type)) {
      neutralise(child)
    } else if (child.type === 'trak') {
      for (const t of readBoxes(buf, child.start + child.headerSize, child.end, counter)) {
        if (METADATA_TYPES.has(t.type)) neutralise(t)
      }
    }
  }
  return { data, scrubbed }
}
