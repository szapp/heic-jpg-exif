import { Exifr, fileParsers } from 'exifr'
import fs from 'fs'
import heicConvert from 'heic-convert'
import * as piexif from 'piexif-ts'
import { formatTypes } from './format'

export default async function convert(
  inputFile: string | Buffer,
  outputPath?: string | undefined,
  quality: number | undefined = 1
): Promise<Buffer | void> {
  if (outputPath && typeof outputPath !== 'string') {
    const err: Error = new Error('Invalid argument: outputPath is expected to be a string')
    delete err.stack
    throw err
  }

  // Load file or buffer
  const fileData: Buffer = typeof inputFile === 'string' ? fs.readFileSync(inputFile) : inputFile

  // Parse metadata
  const exr: Exifr = new Exifr({
    ifd1: true,
    exif: true,
    gps: true,
    translateKeys: false,
    translateValues: false,
    reviveValues: false,
    sanitize: true,
    mergeOutput: false,
  })
  await exr.read(fileData)
  let { ifd0, ifd1, exif, gps } = await exr.parse()

  // Check file type (parse calls setup to instantiate the parser)
  interface ExifrInitialized extends Exifr {
    fileParser: Map<string, unknown> | undefined
  }
  const exrExt: ExifrInitialized = exr as ExifrInitialized
  if (!(exrExt?.fileParser instanceof fileParsers.get('heic'))) {
    if (exrExt?.fileParser instanceof fileParsers.get('jpeg')) throw new TypeError('Input is already a JPEG image')
    throw new TypeError('Input is not a HEIC image')
  }

  // Filter and format metadata tags
  const filterTags = (field: 'ImageIFD' | 'ExifIFD' | 'GPSIFD' | 'InteropIFD', tags: Record<string, unknown> | undefined) => {
    if (typeof tags === 'undefined') return {}
    const filteredKeys: string[] = Object.values(piexif.TagValues[field]).map(String)
    return Object.keys(tags)
      .filter((key) => filteredKeys.includes(key))
      .reduce(
        (obj, key) => {
          obj[key] = tags[key]
          return obj
        },
        {} as Record<string, unknown>
      )
  }

  ifd0 = filterTags('ImageIFD', ifd0)
  ifd1 = filterTags('ImageIFD', ifd1)
  exif = filterTags('ExifIFD', exif)
  gps = filterTags('GPSIFD', gps)

  ifd0 = formatTypes('0th', ifd0)
  ifd1 = formatTypes('1st', ifd1)
  exif = formatTypes('Exif', exif)
  gps = formatTypes('GPS', gps)

  // Conversion rotates the image upright: reset EXIF orientation
  ifd0[piexif.TagValues.ImageIFD.Orientation] = 1
  if (ifd0[piexif.TagValues.ImageIFD.Orientation] > 4) {
    const xd: number | string | undefined = exif[piexif.TagValues.ExifIFD.PixelXDimension]
    const yd: number | string | undefined = exif[piexif.TagValues.ExifIFD.PixelYDimension]
    exif[piexif.TagValues.ExifIFD.PixelXDimension] = yd
    exif[piexif.TagValues.ExifIFD.PixelYDimension] = xd
  }

  const exifBytes: string = piexif.dump({
    '0th': ifd0,
    '1st': ifd1,
    Exif: exif,
    GPS: gps,
  })

  // Convert HEIC to JPG
  const outputBuffer: ArrayBuffer = await heicConvert({
    buffer: fileData,
    format: 'JPEG',
    quality: quality,
  })

  // Attach relevant metadata
  const imgData: string = (outputBuffer as Buffer).toString('binary')
  const newData: string = piexif.insert(exifBytes, imgData)
  const newJpeg: Buffer = Buffer.from(newData, 'binary')
  if (outputPath) fs.writeFileSync(outputPath, newJpeg)
  else return newJpeg
}

module.exports = convert
