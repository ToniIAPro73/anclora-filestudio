"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { toast } from "sonner";

interface UrlFormProps {
  onAnalyze: (url: string) => Promise<void>;
  isLoading: boolean;
}

export function UrlForm({ onAnalyze, isLoading }: UrlFormProps) {
  const [url, setUrl] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    try {
      await onAnalyze(url);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al analizar el enlace";
      toast.error(message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Input
          type="url"
          placeholder="Pega el enlace de YouTube aquí..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="pl-4 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-cyan-500"
          required
        />
      </div>
      <Button 
        type="submit" 
        disabled={isLoading || !url}
        className="h-12 px-8 bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-colors"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            Analizando...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Analizar enlace
          </span>
        )}
      </Button>
    </form>
  );
}
