const convert = require('../src');
const exifr = require('exifr');
const fs = require('fs');
const os = require('os');
const path = require('path');

const parseOptions = {
  ifd0: true,
  ifd1: false,
  exif: true,
  gps: true,
  translateKeys: false,
  translateValues: false,
  reviveValues: false,
  sanitize: true,
  mergeOutput: false,
};

async function compare(imgData, control) {
  const test = await exifr.parse(imgData, parseOptions);
  return JSON.stringify(control) !== JSON.stringify(test);
}


async function run() {
  let success = true;
  let outputBuffer = null;
  let fileBuffer = null;
  const inputPath = 'test/0001.HEIC';
  const outputPath = path.join(os.tmpdir(), 'heic-jpg-exif-test.jpg');

  console.log('Load control EXIF metadata');
  const control = JSON.parse(fs.readFileSync('test/control.json'));

  console.log('Load test file\n');
  const inputBuffer = fs.readFileSync(inputPath);


  console.log('1. Convert HEIC file to output file');
  await convert(inputPath, outputPath);
  fileBuffer = fs.readFileSync(outputPath);
  fs.unlink(outputPath, (err) => { if (err) return console.log(err); });
  if (await compare(fileBuffer, control)) {
    console.error(' [x] Failed')
    success = false;
  }


  console.log('2. Convert HEIC file to output buffer');
  outputBuffer = await convert(inputPath);
  if (await compare(outputBuffer, control)) {
    console.error(' [x] Failed')
    success = false;
  }


  console.log('3. Convert HEIC buffer to output file');
  await convert(inputBuffer, outputPath);
  fileBuffer = fs.readFileSync(outputPath);
  fs.unlink(outputPath, (err) => { if (err) return console.log(err); });
  if (await compare(outputBuffer, control)) {
    console.error(' [x] Failed')
    success = false;
  }


  console.log('4. Convert HEIC buffer to output buffer');
  outputBuffer = await convert(inputBuffer);
  if (await compare(outputBuffer, control)) {
    console.error(' [x] Failed')
    success = false;
  }


  process.exit(success ? 0 : 1);
}

try {
  run();
} catch (err) {
  process.exit(1);
}
