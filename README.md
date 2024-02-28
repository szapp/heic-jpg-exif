# heic-jpg-exif

[![ci](https://github.com/szapp/heic-jpg-exif/actions/workflows/ci.yml/badge.svg)](https://github.com/szapp/heic-jpg-exif/actions/workflows/ci.yml)
[![npm-downloads](https://img.shields.io/npm/dm/heic-jpg-exif.svg)](https://www.npmjs.com/package/heic-jpg-exif)
[![npm-version](https://img.shields.io/npm/v/heic-jpg-exif.svg)](https://www.npmjs.com/package/heic-jpg-exif)

Conversion from HEIC to JPG while retaining essential EXIF metadata

## Install

```bash
npm install heic-jpg-exif
```

## Usage (NodeJS)

Convert an HEIC image to JPEG while retaining the metadata

```javascript
const convert = require('heic-jpg-exif');

await convert('input.HEIC', 'output.jpg');
```

## Background

The HEIC image is first converted to a JPG with `heic-convert` and then complemented with the EXIF metadata of the source image using `exifr` and `piexif`.

## See also

* [heic-convert](https://www.npmjs.com/package/heic-convert)
* [exifr](https://www.npmjs.com/package/exifr)
* [piexif](https://www.npmjs.com/package/piexif)
