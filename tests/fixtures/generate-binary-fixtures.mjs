// Generate binary test fixtures for the Link2Media integration tests.
// Run from the project root: node tests/fixtures/generate-binary-fixtures.mjs

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── sample.png — Minimal valid 10×10 PNG ────────────────────────────────────
// PNG structure: signature + IHDR + IDAT (deflated raw pixels) + IEND

function crc32(buf) {
  // CRC-32/ISO-HDLC lookup table
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makePngChunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBytes, data]);
  const crcVal = crc32(crcInput);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([len, typeBytes, data, crcBuf]);
}

function generatePng() {
  const width = 10;
  const height = 10;
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk: width, height, bit depth 8, color type 2 (RGB)
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 2;  // color type: RGB
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = makePngChunk("IHDR", ihdrData);

  // Raw pixel data: each row = filter byte (0) + width * 3 bytes (RGB)
  const rawRow = Buffer.alloc(1 + width * 3, 0);
  rawRow[0] = 0; // no filter
  // Fill with a solid red-ish color
  for (let x = 0; x < width; x++) {
    rawRow[1 + x * 3] = 200;     // R
    rawRow[1 + x * 3 + 1] = 100; // G
    rawRow[1 + x * 3 + 2] = 50;  // B
  }
  const rawData = Buffer.alloc(rawRow.length * height);
  for (let y = 0; y < height; y++) {
    rawRow.copy(rawData, y * rawRow.length);
  }

  // Deflate the raw data
  const deflated = deflateSync(rawData);
  const idat = makePngChunk("IDAT", deflated);

  // IEND chunk
  const iend = makePngChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

// ── sample.wav — 1-second silent WAV file ───────────────────────────────────
// PCM, 16-bit, mono, 8000 Hz

function generateWav() {
  const sampleRate = 8000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const numSamples = sampleRate; // 1 second
  const dataSize = numSamples * blockAlign;

  // WAV header = 44 bytes + data
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4); // file size - 8
  buffer.write("WAVE", 8);

  // fmt sub-chunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);           // sub-chunk size
  buffer.writeUInt16LE(1, 20);            // PCM format
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data sub-chunk
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  // All zeros = silence (already zero-filled by Buffer.alloc)

  return buffer;
}

// ── Main ─────────────────────────────────────────────────────────────────────

const pngData = generatePng();
writeFileSync(join(__dirname, "sample.png"), pngData);

const wavData = generateWav();
writeFileSync(join(__dirname, "sample.wav"), wavData);

console.log("✅ Binary fixtures generated in " + __dirname);
