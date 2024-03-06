const exifr = require('exifr');
const fs = require('fs');
const heicConvert = require('heic-convert');
const piexif = require('piexif');
const { formatTypes } = require('./format.js')

const convert = async (inputFile, outputPath = null, quality = 1) => {
  if (outputPath && typeof outputPath !== 'string') {
    let err = new Error('Invalid argument: outputPath is expected to be a string');
    delete err.stack;
    throw err;
  }

  const options = {
    translateKeys: false,
    translateValues: false,
    reviveValues: false,
    sanitize: false,
    mergeOutput: false,
  };

  const exr = new exifr.Exifr(options);
  await exr.read(inputFile);
  var { ifd0, exif, gps } = await exr.parse();
  if (!(exr.fileParser instanceof exifr.fileParsers.get('heic'))) {
    if (exr.fileParser instanceof exifr.fileParsers.get('jpeg'))
      throw new TypeError('Input is already a JPEG image');
    throw new TypeError('Input is not a HEIC image');
  }

  const filterExifKeys = (tag, raw) => {
    if (typeof raw === 'undefined') return {}
    let filteredKeys = Object.values(piexif.TagValues[tag]).map(String);
    return Object.keys(raw)
     .filter(key => filteredKeys.includes(key))
     .reduce((obj, key) => {
      obj[key] = raw[key];
      return obj;
     }, {});
  };

  // Exclude image properties that will be set by conversion
  ifd0 = filterExifKeys('ImageIFD', ifd0);
  delete ifd0[piexif.TagValues.ImageIFD.Orientation];
  delete ifd0[piexif.TagValues.ImageIFD.XResolution];
  delete ifd0[piexif.TagValues.ImageIFD.YResolution];
  delete ifd0[piexif.TagValues.ImageIFD.ResolutionUnit];
  ifd0 = formatTypes('0th', ifd0);

  exif = filterExifKeys('ExifIFD', exif);
  exif = formatTypes('Exif', exif);

  gps = filterExifKeys('GPSIFD', gps);
  gps = formatTypes('GPS', gps);

  var exifBytes = piexif.dump({'0th': ifd0, 'Exif': exif, 'GPS': gps});

  // Convert HEIC to JPG
  const fileData = typeof inputFile === 'string' ? fs.readFileSync(inputFile) : inputFile;
  const outputBuffer = await heicConvert({
    buffer: fileData,
    format: 'JPEG',
    quality: quality
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
