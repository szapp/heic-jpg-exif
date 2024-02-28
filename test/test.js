const convert = require('../src');
const exifr = require('exifr');
const fs = require('fs');
const os = require('os');
const path = require('path');

async function run() {
  const outfilePath = path.join(os.tmpdir(), 'heic-jpg-exif-test.jpg');

  console.log('Convert HEIC file');
  await convert('test/0001.HEIC', outfilePath);

  console.log('Load EXIF metadata of converted file');
  var fileOutput = fs.readFileSync(outfilePath);
  const options = {
    translateKeys: false,
    translateValues: false,
    reviveValues: false,
    sanitize: false,
    mergeOutput: false,
  };
  const exr = new exifr.Exifr(options);
  await exr.read(fileOutput);
  const test = await exr.parse();
  fs.unlink(outfilePath + 'f', (err) => { if (err) return console.log(err); });

  console.log('Load control EXIF metadata');
  const control = JSON.parse(fs.readFileSync('test/control.json'));

  console.log('Do lazy compare');
  const success = JSON.stringify(control) === JSON.stringify(test);
  process.exit(success ? 0 : 1);
}

try {
  run();
} catch (err) {
  process.exit(1);
}
