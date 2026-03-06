"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Copy, Share2, Check, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SensoryLinkShareProps {
  sensoryToken: string;
  prototypeName: string;
}

export function SensoryLinkShare({
  sensoryToken,
  prototypeName,
}: SensoryLinkShareProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/id/sensory/${sensoryToken}`
      : `/id/sensory/${sensoryToken}`;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select input text
      const input = document.querySelector<HTMLInputElement>(
        '[data-sensory-url]'
      );
      if (input) {
        input.select();
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  }, [shareUrl]);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Evaluacion Sensorial - ${prototypeName}`,
          text: `Evalua el prototipo "${prototypeName}" en el panel sensorial.`,
          url: shareUrl,
        });
      } catch {
        // User cancelled or share failed, do nothing
      }
    } else {
      // Fallback to copy
      handleCopy();
    }
  }, [shareUrl, prototypeName, handleCopy]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "bg-white/70 dark:bg-black/50",
        "backdrop-blur-xl",
        "border border-white/20 dark:border-white/10",
        "rounded-2xl",
        "p-5",
        "shadow-sm shadow-black/5",
        "space-y-4"
      )}
    >
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Enlace Panel Sensorial
        </h3>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          Comparte este enlace con los evaluadores del panel sensorial.
        </p>
      </div>

      {/* URL field + copy */}
      <div className="flex items-center gap-2">
        <Input
          readOnly
          value={shareUrl}
          data-sensory-url
          className={cn(
            "flex-1 h-11 rounded-xl text-xs font-mono",
            "bg-gray-50/80 dark:bg-black/30",
            "border-gray-200/50 dark:border-white/10",
            "text-gray-600 dark:text-gray-300",
            "select-all"
          )}
          onClick={(e) => (e.target as HTMLInputElement).select()}
          aria-label="URL del panel sensorial"
        />
        <Button
          type="button"
          variant="outline"
          onClick={handleCopy}
          className={cn(
            "h-11 px-3 rounded-xl border-gray-200/50 dark:border-white/10",
            "active:scale-95 transition-all duration-150",
            copied && "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20"
          )}
          aria-label={copied ? "Copiado" : "Copiar enlace"}
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          onClick={handleShare}
          className={cn(
            "flex-1 h-11 rounded-xl",
            "bg-blue-500 hover:bg-blue-600 text-white",
            "shadow-md shadow-blue-500/20",
            "active:scale-95 transition-all duration-150",
            "font-semibold text-sm"
          )}
        >
          <Share2 className="w-4 h-4 mr-2" />
          Compartir
        </Button>
      </div>

      {/* QR Code placeholder */}
      <div
        className={cn(
          "flex flex-col items-center justify-center",
          "py-8 rounded-xl",
          "border-2 border-dashed border-gray-200 dark:border-white/10",
          "bg-gray-50/50 dark:bg-white/5"
        )}
      >
        <QrCode className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-2" />
        <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">
          Codigo QR
        </p>
        <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-0.5">
          Proximamente
        </p>
      </div>
    </motion.div>
  );
}
