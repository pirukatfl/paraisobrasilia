import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

import {
  MAX_VIDEO_SECONDS,
  Mp4Error,
  readMp4Info,
  scrubMp4Metadata,
} from '../../src/lib/classisex/mp4'
import { box, buildMp4, largeBox, openBox } from '../helpers/mp4-fixtures'

const fixture = (name: string) => readFileSync(path.resolve(__dirname, '../fixtures', name))
const PT_MESSAGE = 'Não conseguimos ler este vídeo. Envie um MP4 ou MOV gravado pelo celular.'

function mdatSlice(buf: Buffer): Buffer {
  const at = buf.indexOf(Buffer.from('mdat', 'latin1'))
  return buf.subarray(at - 4)
}

describe('readMp4Info (D-01)', () => {
  it('exposes the 60 s limit', () => {
    expect(MAX_VIDEO_SECONDS).toBe(60)
  })

  it('reads a version 0 mvhd', () => {
    const info = readMp4Info(buildMp4({ durationSeconds: 59, timescale: 1000 }))
    expect(info.durationSeconds).toBeCloseTo(59, 2)
    expect(info.majorBrand).toBe('isom')
  })

  it('reads a version 1 (64-bit) mvhd', () => {
    const info = readMp4Info(buildMp4({ durationSeconds: 61, timescale: 600, version: 1 }))
    expect(info.durationSeconds).toBeCloseTo(61, 2)
  })

  it('parses a MOV (qt brand)', () => {
    const info = readMp4Info(buildMp4({ durationSeconds: 12, brand: 'qt  ' }))
    expect(info.durationSeconds).toBeCloseTo(12, 2)
    expect(info.majorBrand).toBe('qt')
  })

  it('parses real encoder output (tests/fixtures/espaco.mp4)', () => {
    const info = readMp4Info(fixture('espaco.mp4'))
    expect(info.durationSeconds).toBeGreaterThan(0)
    expect(info.durationSeconds).toBeLessThan(60)
    expect(info.majorBrand).not.toBeNull()
  })

  it('walks largesize (size 1) and to-end (size 0) boxes', () => {
    const base = buildMp4({ durationSeconds: 5 })
    const withoutMdat = base.subarray(0, base.indexOf(Buffer.from('mdat', 'latin1')) - 4)
    const big = Buffer.concat([withoutMdat, largeBox('mdat', Buffer.alloc(32, 7))])
    expect(readMp4Info(big).durationSeconds).toBeCloseTo(5, 2)
    const open = Buffer.concat([
      withoutMdat.subarray(0, 0),
      box('ftyp', Buffer.from('isom\0\0\0\0', 'latin1')),
      openBox('mdat', Buffer.alloc(16, 1)),
    ])
    // size 0 box is walked to the end; there is no moov, so it is refused
    expect(() => readMp4Info(open)).toThrow(Mp4Error)
    const openAfterMoov = Buffer.concat([withoutMdat, openBox('mdat', Buffer.alloc(16, 1))])
    expect(readMp4Info(openAfterMoov).durationSeconds).toBeCloseTo(5, 2)
  })

  it.each([
    ['garbage', Buffer.from('not a video')],
    ['a JPEG', fixture('flyer-square.jpg')],
    ['a box running past the end', (() => {
      const b = buildMp4({ durationSeconds: 3 })
      const copy = Buffer.from(b)
      copy.writeUInt32BE(b.length + 100, 0)
      return copy
    })()],
    ['a file without moov', Buffer.concat([
      box('ftyp', Buffer.from('isom\0\0\0\0', 'latin1')),
      box('mdat', Buffer.alloc(10)),
    ])],
  ])('refuses %s with the pt message', (_label, buf) => {
    expect(() => readMp4Info(buf)).toThrow(Mp4Error)
    expect(() => readMp4Info(buf)).toThrow(PT_MESSAGE)
  })
})

describe('scrubMp4Metadata (T-04-06)', () => {
  const LOCATION = '+15.5936-047.9771/'

  it('zero-fills udta/meta under moov and trak without changing the length', () => {
    const input = buildMp4({ durationSeconds: 30, withLocation: LOCATION })
    const before = Buffer.from(input)
    expect(input.indexOf(Buffer.from('+15.5936'))).toBeGreaterThan(-1)

    const { data, scrubbed } = scrubMp4Metadata(input)
    expect(data.indexOf(Buffer.from('+15.5936'))).toBe(-1)
    expect(data.length).toBe(input.length)
    expect(scrubbed).toBeGreaterThanOrEqual(3)
    expect(readMp4Info(data).durationSeconds).toBeCloseTo(30, 2)
    expect(mdatSlice(data).equals(mdatSlice(input))).toBe(true)
    // input untouched
    expect(input.equals(before)).toBe(true)
  })

  it('keeps real encoder output parseable', () => {
    const input = fixture('espaco.mp4')
    const { data } = scrubMp4Metadata(input)
    expect(data.length).toBe(input.length)
    expect(readMp4Info(data).durationSeconds).toBeCloseTo(readMp4Info(input).durationSeconds, 5)
  })

  it('refuses unreadable input', () => {
    expect(() => scrubMp4Metadata(Buffer.from('nope'))).toThrow(Mp4Error)
  })
})
