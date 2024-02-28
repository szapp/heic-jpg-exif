const exifr = require('exifr');
const fs = require('fs');
const heicConvert = require('heic-convert');
const piexif = require('piexif');
const { formatTypes } = require('./format.js')

const convert = async (inputPath, outputPath) => {
  if (typeof inputPath !== 'string' || typeof outputPath !== 'string') {
    let err = new Error('Invalid inputs: expecting two string arguments');
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
  await exr.read(inputPath);
  var { ifd0, exif, gps } = await exr.parse();

  const filterExifKeys = (tag, raw) => {
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
  fileData = fs.readFileSync(inputPath);
  const outputBuffer = await heicConvert({
    buffer: fileData,
    format: 'JPEG',
    quality: 1
  });

  // Attach relevant metadata
  const imgData = outputBuffer.toString('binary');
  const newData = piexif.insert(exifBytes, imgData);
  const newJpeg = Buffer.from(newData, 'binary');
  await fs.writeFileSync(outputPath, newJpeg);
};

module.exports = {
  convert,
};
