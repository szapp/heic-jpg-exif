import Fraction from 'fraction.js'
import { Tags, Types } from 'piexif-ts'

function toArray(input: unknown): unknown[] | ArrayBuffer {
  if (typeof input === 'object') return Array.from(input as ArrayLike<unknown>)
  else if (typeof input === 'undefined') return []
  else return [input]
}

function toRational(input: unknown | unknown[] | ArrayLike<unknown>): number[][] {
  return (toArray(input) as unknown[]).map(Number).map((dec) => {
    const fra = new Fraction(Number(dec))
    return [fra.s * fra.n, fra.d]
  })
}

function toAscii(input: unknown): string {
  if (typeof input === 'string') return input
  return new TextDecoder('utf-8').decode(new Uint8Array(toArray(input) as ArrayBuffer))
}

export function formatTypes(
  tag: 'Image' | '0th' | 'Exif' | 'Interop' | 'GPS' | '1st',
  raw: Record<string, unknown>
): Record<string, unknown> {
  const output: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(raw)) {
    let type: number
    try {
      type = Tags[tag][Number(key)].type
    } catch (e) {
      throw new Error(`EXIF 2.32 (${tag}) does have the tag ${key}`)
    }
    switch (type) {
      case Types.Rational:
      case Types.SRational:
        output[key] = toRational(value)
        break
      case Types.Short:
      case Types.Long:
      case Types.SLong:
        output[key] = toArray(value)
        break
      case Types.Ascii:
      case Types.Undefined:
        output[key] = toAscii(value)
        break
      case Types.Byte:
        output[key] = toArray(value)
        break
      default:
        throw new Error(`Unexpected EXIF 2.32 tag type ${type} for ${key} in ${tag}`)
    }
  }
  return output
}

module.exports = {
  formatTypes,
}
