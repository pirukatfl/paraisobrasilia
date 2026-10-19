/**
 * Synthetic ISO-BMFF (MP4/MOV) buffers for unit tests of src/lib/classisex/mp4.ts.
 * Layout: ftyp + moov(mvhd, trak(tkhd, udta(©xyz)), udta(©xyz), meta(…)) + mdat.
 */

export function box(type: string, ...payload: Buffer[]): Buffer {
  const body = Buffer.concat(payload)
  const header = Buffer.alloc(8)
  header.writeUInt32BE(8 + body.length, 0)
  header.write(type, 4, 'latin1')
  return Buffer.concat([header, body])
}

/** Box with size 1 and a 64-bit largesize. */
export function largeBox(type: string, payload: Buffer): Buffer {
  const header = Buffer.alloc(16)
  header.writeUInt32BE(1, 0)
  header.write(type, 4, 'latin1')
  header.writeBigUInt64BE(BigInt(16 + payload.length), 8)
  return Buffer.concat([header, payload])
}

/** Box with size 0 ("extends to the end of the file"). */
export function openBox(type: string, payload: Buffer): Buffer {
  const header = Buffer.alloc(8)
  header.writeUInt32BE(0, 0)
  header.write(type, 4, 'latin1')
  return Buffer.concat([header, payload])
}

function mvhd(version: 0 | 1, timescale: number, duration: number): Buffer {
  if (version === 0) {
    const b = Buffer.alloc(4 + 4 + 4 + 4 + 4 + 80)
    b.writeUInt32BE(0, 0) // version 0 + flags
    b.writeUInt32BE(timescale, 12)
    b.writeUInt32BE(duration, 16)
    return box('mvhd', b)
  }
  const b = Buffer.alloc(4 + 8 + 8 + 4 + 8 + 80)
  b.writeUInt8(1, 0)
  b.writeUInt32BE(timescale, 20)
  b.writeBigUInt64BE(BigInt(duration), 24)
  return box('mvhd', b)
}

function locationAtom(location: string): Buffer {
  // QuickTime ©xyz: u16 length, u16 language, then the ISO 6709 string.
  const text = Buffer.from(location, 'latin1')
  const head = Buffer.alloc(4)
  head.writeUInt16BE(text.length, 0)
  head.writeUInt16BE(0x15c7, 2)
  return box('\xa9xyz', head, text)
}

export function buildMp4(opts: {
  durationSeconds: number
  timescale?: number
  version?: 0 | 1
  withLocation?: string
  brand?: 'isom' | 'qt  '
  mdat?: Buffer
}): Buffer {
  const timescale = opts.timescale ?? 1000
  const version = opts.version ?? 0
  const brand = opts.brand ?? 'isom'
  const ftypPayload = Buffer.alloc(8)
  ftypPayload.write(brand, 0, 'latin1')
  const ftyp = box('ftyp', ftypPayload, Buffer.from(brand, 'latin1'))

  const location = opts.withLocation
  const tkhd = box('tkhd', Buffer.alloc(84))
  const trakChildren = [tkhd]
  const moovChildren = [mvhd(version, timescale, Math.round(opts.durationSeconds * timescale))]
  if (location) {
    trakChildren.push(box('udta', locationAtom(location)))
  }
  moovChildren.push(box('trak', ...trakChildren))
  if (location) {
    moovChildren.push(box('udta', locationAtom(location)))
    // iTunes-style meta with a location key value (version/flags + hdlr + raw string).
    moovChildren.push(
      box(
        'meta',
        Buffer.alloc(4),
        box('hdlr', Buffer.alloc(24)),
        box('ilst', Buffer.from(`com.apple.quicktime.location.ISO6709${location}`, 'latin1')),
      ),
    )
  }
  const moov = box('moov', ...moovChildren)
  const mdat = box('mdat', opts.mdat ?? Buffer.from('fake-media-bytes-0123456789'))
  return Buffer.concat([ftyp, moov, mdat])
}
