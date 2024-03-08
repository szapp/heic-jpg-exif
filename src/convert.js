const exifr = require('exifr');
const fs = require('fs');
const heicConvert = require('heic-convert');
const piexif = require('piexif-ts-0232');
const { formatTypes } = require('./format.js');

const parseOptions = {
  ifd0: true,
  ifd1: true,
  exif: true,
  gps: true,
  translateKeys: false,
  translateValues: false,
  reviveValues: false,
  sanitize: true,
  mergeOutput: false,
};

async function convert(inputFile, outputPath = null, quality = 1) {
  if (outputPath && typeof outputPath !== 'string') {
    let err = new Error('Invalid argument: outputPath is expected to be a string');
    delete err.stack;
    throw err;
  }

  // Load file or buffer
  const fileData = typeof inputFile === 'string' ? fs.readFileSync(inputFile) : inputFile;

  // Parse metadata
  const exr = new exifr.Exifr(parseOptions);
  await exr.read(fileData);
  let { ifd0, ifd1, exif, gps } = await exr.parse();

  // Check file type (parse calls setup to instantiate the parser)
  if (!(exr.fileParser instanceof exifr.fileParsers.get('heic'))) {
    if (exr.fileParser instanceof exifr.fileParsers.get('jpeg'))
      throw new TypeError('Input is already a JPEG image');
    throw new TypeError('Input is not a HEIC image');
  }

  // Filter and format metadata tags
  const filterTags = (field, tags) => {
    if (typeof tags === 'undefined') return {}
    let filteredKeys = Object.values(piexif.TagValues[field]).map(String);
    return Object.keys(tags)
     .filter(key => filteredKeys.includes(key))
     .reduce((obj, key) => {
      obj[key] = tags[key];
      return obj;
     }, {});
  };

  ifd0 = filterTags('ImageIFD', ifd0);
  ifd1 = filterTags('ImageIFD', ifd1);
  exif = filterTags('ExifIFD', exif);
  gps = filterTags('GPSIFD', gps);

  ifd0 = formatTypes('0th', ifd0);
  ifd1 = formatTypes('1th', ifd1);
  exif = formatTypes('Exif', exif);
  gps = formatTypes('GPS', gps);

  // Conversion rotates the image upright
  if (ifd0[piexif.TagValues.ImageIFD.Orientation] > 4) {
    const xd = exif[piexif.TagValues.ExifIFD.PixelXDimension]
    const yd = exif[piexif.TagValues.ExifIFD.PixelYDimension]
    exif[piexif.TagValues.ExifIFD.PixelXDimension] = yd
    exif[piexif.TagValues.ExifIFD.PixelYDimension] = xd
    ifd0[piexif.TagValues.ImageIFD.Orientation] = 1
  }

  const exifBytes = piexif.dump({
    '0th': ifd0,
    '1th': ifd1,
    Exif: exif,
    GPS: gps,
  });

  // Convert HEIC to JPG
  const outputBuffer = await heicConvert({
    buffer: fileData,
    format: 'JPEG',
    quality: quality,
  });

  // Attach relevant metadata
  const imgData = outputBuffer.toString('binary');
  const newData = piexif.insert(exifBytes, imgData);
  const newJpeg = Buffer.from(newData, 'binary');
  if (outputPath)
    fs.writeFileSync(outputPath, newJpeg);
  else
    return newJpeg;
};

module.exports = {
  convert,
};
