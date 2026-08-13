"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { FileAudio, FileImage, Play, Pause, Sparkles, X, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CompareInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  originalFileName: string;
  originalSize?: number;
  originalUrl?: string;
  convertedFileName: string;
  convertedSize?: number;
  convertedUrl: string;
  format: string;
  category?: string;
}

export function CompareInspectorModal({
  isOpen,
  onClose,
  originalFileName,
  originalSize,
  originalUrl,
  convertedFileName,
  convertedSize,
  convertedUrl,
  format,
  category = "images",
}: CompareInspectorProps) {
  const [sliderPos, setSliderPos] = useState(50);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const formatSize = (bytes?: number) => {
    if (!bytes) return "Desconocido";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getSavings = () => {
    if (!originalSize || !convertedSize || originalSize === 0) return null;
    const diff = originalSize - convertedSize;
    const pct = Math.round((diff / originalSize) * 100);
    return {
      bytes: diff,
      pct,
      isReduction: diff > 0,
    };
  };

  const savings = getSavings();

  const isImage = ["webp", "png", "jpg", "jpeg", "avif", "gif", "tiff", "svg"].includes(format.toLowerCase()) || category === "images";
  const isAudio = ["mp3", "wav", "m4a", "flac", "ogg"].includes(format.toLowerCase()) || category === "audio";

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const changeSpeed = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-[#12161f] border border-stone-800 text-white p-6 rounded-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="flex flex-row items-center justify-between border-b border-stone-800 pb-4">
          <h3 className="flex items-center gap-2 text-lg font-bold text-teal-400">
            {isImage ? <FileImage className="h-5 w-5 text-teal-400" /> : <FileAudio className="h-5 w-5 text-teal-400" />}
            Inspector de Comparación Visual
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* File Metrics Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4 bg-black/40 border border-white/5 rounded-xl p-3 text-xs">
          <div>
            <p className="text-stone-400">Archivo Original</p>
            <p className="font-semibold text-stone-200 truncate">{originalFileName}</p>
            <p className="text-stone-400 text-[11px] mt-0.5">{formatSize(originalSize)}</p>
          </div>
          <div>
            <p className="text-stone-400">Resultado Procesado</p>
            <p className="font-semibold text-teal-300 truncate">{convertedFileName}</p>
            <p className="text-stone-400 text-[11px] mt-0.5">{formatSize(convertedSize)}</p>
          </div>
          <div className="sm:text-right flex flex-col sm:items-end justify-center">
            <p className="text-stone-400">Rendimiento / Ahorro</p>
            {savings ? (
              <span
                className={`font-bold px-2 py-0.5 rounded text-xs mt-0.5 inline-block ${
                  savings.isReduction
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                }`}
              >
                {savings.isReduction ? `-${savings.pct}% compresión (${formatSize(savings.bytes)} menos)` : `+${Math.abs(savings.pct)}% peso`}
              </span>
            ) : (
              <span className="text-stone-500">Optimizando datos</span>
            )}
          </div>
        </div>

        {/* Comparison Body */}
        <div className="flex-1 overflow-y-auto min-h-[280px] flex flex-col items-center justify-center relative bg-black/60 rounded-xl border border-white/10 p-4">
          {isImage ? (
            originalUrl ? (
              <div className="relative w-full max-w-2xl h-[320px] select-none overflow-hidden rounded-lg border border-stone-800 bg-[#0a0c10]">
                {/* Converted (Right / Underneath) */}
                {/* `unoptimized`: downloadUrl carries a short-lived rotating token;
                    the image optimizer would re-request it server-side per srcSet
                    width and could consume the one-time token. */}
                <Image
                  src={convertedUrl}
                  alt="Converted"
                  fill
                  unoptimized
                  className="object-contain pointer-events-none"
                />

                {/* Original (Left / Clipped) */}
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${sliderPos}%` }}
                >
                  <Image
                    src={originalUrl}
                    alt="Original"
                    fill
                    unoptimized
                    className="object-contain pointer-events-none"
                    style={{ width: "100%", maxWidth: "none" }}
                  />
                  <span className="absolute top-3 left-3 bg-black/80 backdrop-blur text-stone-300 text-[10px] font-mono px-2 py-1 rounded border border-white/10">
                    Original
                  </span>
                </div>

                <span className="absolute top-3 right-3 bg-teal-950/90 backdrop-blur text-teal-300 text-[10px] font-mono px-2 py-1 rounded border border-teal-500/30">
                  Procesado ({format.toUpperCase()})
                </span>

                {/* Slider bar */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-teal-400 shadow-[0_0_12px_rgba(20,184,166,0.8)] cursor-ew-resize flex items-center justify-center"
                  style={{ left: `${sliderPos}%` }}
                >
                  <div className="w-6 h-6 rounded-full bg-teal-400 text-stone-950 flex items-center justify-center shadow-lg -ml-2.5">
                    <ArrowLeftRight className="h-3 w-3" />
                  </div>
                </div>

                {/* Native Range Control for Touch & Mouse Drag */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sliderPos}
                  onChange={(e) => setSliderPos(Number(e.target.value))}
                  className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full"
                />
              </div>
            ) : (
              <div className="w-full flex flex-col items-center justify-center py-6 text-center">
                {/* Native <img> required: intrinsic dimensions of the converted file are
                    unknown at runtime, and next/image `fill` would upscale small images
                    inside a fixed-height box, changing the natural-size preview layout.
                    `unoptimized` Image would add no value over this direct render. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={convertedUrl} alt="Converted" className="max-h-[260px] object-contain rounded-lg shadow-lg mb-3" />
                <p className="text-xs text-stone-400">Vista previa optimizada del resultado en {format.toUpperCase()}</p>
              </div>
            )
          ) : isAudio ? (
            <div className="w-full max-w-lg space-y-6 py-6 text-center">
              <div className="flex justify-center">
                <div className="h-20 w-20 rounded-full bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shadow-[0_0_24px_rgba(20,184,166,0.2)]">
                  <FileAudio className="h-10 w-10 animate-pulse" />
                </div>
              </div>

              <audio
                ref={audioRef}
                src={convertedUrl}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />

              <div className="space-y-2">
                <p className="text-sm font-semibold text-teal-300">{convertedFileName}</p>
                <p className="text-xs text-stone-400">Reproductor Integrado con Control de Frecuencia</p>
              </div>

              {/* Playback Controls */}
              <div className="flex items-center justify-center gap-4">
                <Button
                  onClick={toggleAudio}
                  className="h-12 w-12 rounded-full bg-teal-500 hover:bg-teal-400 text-stone-950 font-bold p-0 flex items-center justify-center shadow-lg"
                >
                  {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
                </Button>
              </div>

              {/* Speed Buttons */}
              <div className="flex items-center justify-center gap-1.5 pt-2">
                <span className="text-[11px] text-stone-400 mr-2">Velocidad:</span>
                {[0.8, 1, 1.25, 1.5, 2].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => changeSpeed(speed)}
                    className={`px-2.5 py-1 text-[11px] rounded font-mono transition-colors ${
                      playbackRate === speed
                        ? "bg-teal-500/20 text-teal-300 border border-teal-500/40 font-bold"
                        : "bg-white/5 text-stone-400 hover:text-white"
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-stone-400 space-y-2">
              <Sparkles className="h-8 w-8 text-teal-400 mx-auto" />
              <p className="text-sm font-medium text-stone-200">Archivo convertido correctamente ({format.toUpperCase()})</p>
              <p className="text-xs">El formato está listo para descarga segura.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 flex items-center justify-between border-t border-stone-800">
          <p className="text-[11px] text-stone-500">Inspección determinista de Anclora FileStudio</p>
          <Button onClick={onClose} variant="outline" className="border-stone-700 text-stone-300 hover:bg-white/5">
            Cerrar Inspector
          </Button>
        </div>
      </div>
    </div>
  );
}
