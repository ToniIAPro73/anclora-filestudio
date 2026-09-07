#!/usr/bin/env bash
# Real, non-mocked smoke test for the Whisper local transcription pipeline
# (Fases 37-39 of the Vídeo y Audio feature). Exercises the ACTUAL installed
# whisper-cli + FFmpeg + a real model — never simulated. Intended to be run
# manually on a machine with whisper.cpp installed; not part of `pnpm test`
# (it depends on real system binaries and a real model file, and takes
# real transcription time, so it does not belong in the CI unit-test suite).
#
# Usage: bash scripts/whisper-real-smoke.sh
set -euo pipefail

WHISPER_MODELS_DIR="${ANCLORA_FILESTUDIO_WHISPER_MODELS_DIR:-$HOME/Library/Application Support/Anclora FileStudio/models/whisper}"
SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT

echo "== Fase 37: whisper-cli presence and version =="
if ! command -v whisper-cli >/dev/null 2>&1; then
  echo "WHISPER_MISSING: whisper-cli not found on PATH. Skipping real tests (this is a documented optional dependency)."
  exit 0
fi
WHISPER_VERSION="$(whisper-cli --version 2>/dev/null | grep -o 'version: [0-9.]*' || true)"
echo "whisper-cli found: $(command -v whisper-cli) ($WHISPER_VERSION)"

echo "== Fase 37: model detection (real directory, not invented) =="
MODEL_PATH="$(find "$WHISPER_MODELS_DIR" -iname 'ggml-*.bin' 2>/dev/null | head -1 || true)"
if [ -z "$MODEL_PATH" ]; then
  echo "WHISPER_MODEL_MISSING: no ggml-*.bin model found in $WHISPER_MODELS_DIR"
  exit 0
fi
echo "Model found: $MODEL_PATH"

echo "== Fase 38: real audio transcription =="
say -o "$SCRATCH/speech.aiff" "Hola, esto es una prueba de transcripcion local con whisper punto cpp en Anclora FileStudio." 2>/dev/null \
  || echo "(macOS 'say' unavailable — provide your own short speech .wav at \$SCRATCH/speech.wav to continue)"
if [ -f "$SCRATCH/speech.aiff" ]; then
  ffmpeg -hide_banner -loglevel error -y -i "$SCRATCH/speech.aiff" -ar 16000 -ac 1 -c:a pcm_s16le "$SCRATCH/speech.wav"
fi
if [ ! -f "$SCRATCH/speech.wav" ]; then
  echo "WHISPER_AUDIO_REAL_TEST = BLOCKED (no test audio available on this platform)"
else
  whisper-cli -m "$MODEL_PATH" -l auto -of "$SCRATCH/speech_out" -otxt -osrt -ovtt -np -f "$SCRATCH/speech.wav"
  if [ -s "$SCRATCH/speech_out.txt" ]; then
    echo "WHISPER_AUDIO_REAL_TEST = PASS"
    echo "Transcript: $(cat "$SCRATCH/speech_out.txt")"
  else
    echo "WHISPER_AUDIO_REAL_TEST = FAIL (no output produced)"
  fi
fi

echo "== Fase 39: real MP4 pipeline (FFprobe -> FFmpeg -> whisper-cli) =="
if [ -f "$SCRATCH/speech.wav" ]; then
  ffmpeg -hide_banner -loglevel error -y -f lavfi -i "color=c=blue:s=320x240:d=7" -i "$SCRATCH/speech.wav" \
    -c:v libx264 -c:a aac -shortest "$SCRATCH/test.mp4"
  ffprobe -v error -show_streams -show_format -print_format json "$SCRATCH/test.mp4" > "$SCRATCH/probe.json"
  grep -q '"codec_type": "audio"' "$SCRATCH/probe.json" || { echo "NO_AUDIO_STREAM in generated test MP4"; exit 1; }

  ffmpeg -hide_banner -loglevel error -y -i "$SCRATCH/test.mp4" -vn -ar 16000 -ac 1 -c:a pcm_s16le "$SCRATCH/test_audio.wav"
  whisper-cli -m "$MODEL_PATH" -l auto -of "$SCRATCH/mp4_out" -otxt -osrt -ovtt -np -f "$SCRATCH/test_audio.wav"
  rm -f "$SCRATCH/test_audio.wav"

  if [ -s "$SCRATCH/mp4_out.txt" ] && [ ! -f "$SCRATCH/test_audio.wav" ]; then
    echo "WHISPER_MP4_REAL_TEST = PASS (temp WAV cleaned up)"
    echo "Transcript: $(cat "$SCRATCH/mp4_out.txt")"
  else
    echo "WHISPER_MP4_REAL_TEST = FAIL"
  fi
else
  echo "WHISPER_MP4_REAL_TEST = BLOCKED (no test audio available on this platform)"
fi

echo "== Done. Scratch dir $SCRATCH will be removed on exit. =="
