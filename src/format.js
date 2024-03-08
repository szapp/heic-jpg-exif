const Fraction = require('fraction.js');
const { Tags, Types } = require('../../piexif-ts');

const toArray = (input) => {
  if (typeof input === 'object')
    return Array.from(input);
  else
    return [].concat(input);
};

const toRational = (input) => {
  return toArray(input).map(Number).map((dec) => {
    const fra = Fraction(Number(dec));
    return [fra.s*fra.n, fra.d];
  });
};

const toAscii = (input) => {
  if (typeof input === 'string')
    return input;
  return new TextDecoder('utf-8').decode(new Uint8Array(toArray(input)));
};

const formatTypes = (tag, raw) => {
  const output = {};
  for (const [key, value] of Object.entries(raw)) {
    var type;
    try {
      type = Tags[tag][key].type;
    } catch (e) {
      throw new Error(`EXIF 2.32 (${tag}) does have the tag ${key}`);
    }
    switch (type) {
      case Types.Rational:
      case Types.SRational:
        output[key] = toRational(value);
        break;
      case Types.Short:
      case Types.Long:
      case Types.SLong:
        output[key] = toArray(value);
        break;
      case Types.Ascii:
      case Types.Undefined:
        output[key] = toAscii(value);
        break;
      case Types.Byte:
        output[key] = toArray(value);
        break;
      default:
        throw new Error(`Unexpected EXIF 2.32 tag type ${type} for ${key} in ${tag}`)
    }
  }
  return output;
};

module.exports = {
  formatTypes,
};
