#!/usr/bin/env bash

set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

sudo apt-get update
sudo apt-get install -y \
  ffmpeg \
  libreoffice-writer \
  libreoffice-impress \
  pandoc \
  poppler-utils \
  qpdf \
  tesseract-ocr \
  p7zip-full \
  yt-dlp

node scripts/ci/install-chromium-runtime.mjs

echo "== Linux integration test toolchain =="
echo "libreoffice: $(libreoffice --version)"
echo "pandoc: $(pandoc --version | head -n 1)"
echo "pdftotext: $(pdftotext -v 2>&1 | head -n 1)"
echo "pdftohtml: $(pdftohtml -v 2>&1 | head -n 1)"
echo "pdftoppm: $(pdftoppm -v 2>&1 | head -n 1)"
echo "qpdf: $(qpdf --version | head -n 1)"
echo "ffmpeg: $(ffmpeg -version | head -n 1)"
echo "ffprobe: $(ffprobe -version | head -n 1)"
echo "tesseract: $(tesseract --version | head -n 1)"
echo "7z: $(7z i | sed -n '2p')"
echo "yt-dlp: $(yt-dlp --version)"
CHROMIUM_PATH="$(node -e "const p=require('./scripts/toolchain.lock.json').runtimePacks['chromium-runtime']; console.log(process.env.HOME + '/.local/share/anclora-filestudio/runtime-packs/chromium-runtime/' + p.version + '/' + p.versions['linux-x64'].executablePath)")"
echo "chromium path: $CHROMIUM_PATH"
echo "chromium: $("$CHROMIUM_PATH" --version)"
