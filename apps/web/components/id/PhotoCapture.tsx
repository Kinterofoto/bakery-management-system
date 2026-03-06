"use client";

import { useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X, Plus } from "lucide-react";
import { compressImage } from "@/lib/image-compression";
import { cn } from "@/lib/utils";

interface PhotoData {
  id: string;
  photo_url: string;
  caption?: string;
}

interface PhotoCaptureProps {
  photos: PhotoData[];
  onCapture: (file: File) => void;
  onDelete: (id: string) => void;
  isFloating?: boolean;
  maxPhotos?: number;
}

export function PhotoCapture({
  photos,
  onCapture,
  onDelete,
  isFloating = false,
  maxPhotos = 10,
}: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const canAddMore = photos.length < maxPhotos;

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const compressed = await compressImage(file, {
          maxSizeKB: 200,
          maxWidth: 1600,
          maxHeight: 1600,
          quality: 0.8,
        });
        onCapture(compressed);
      } catch {
        // Fallback: send original if compression fails
        onCapture(file);
      }

      // Reset input so the same file can be selected again
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
    [onCapture]
  );

  const triggerCapture = useCallback(() => {
    inputRef.current?.click();
  }, []);

  // Hidden file input shared by both modes
  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      capture="environment"
      onChange={handleFileChange}
      className="hidden"
      aria-label="Capturar foto"
    />
  );

  // FAB mode: floating action button for live phase
  if (isFloating) {
    return (
      <>
        {fileInput}

        {/* Thumbnail strip at bottom-left */}
        {photos.length > 0 && (
          <div className="fixed bottom-24 left-4 right-20 z-30">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <AnimatePresence mode="popLayout">
                {photos.map((photo) => (
                  <motion.div
                    key={photo.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="relative flex-shrink-0 group"
                  >
                    <img
                      src={photo.photo_url}
                      alt={photo.caption || "Foto capturada"}
                      className="w-14 h-14 object-cover rounded-xl border-2 border-white/30 shadow-md"
                    />
                    <button
                      type="button"
                      onClick={() => onDelete(photo.id)}
                      className={cn(
                        "absolute -top-1.5 -right-1.5",
                        "w-6 h-6 rounded-full",
                        "bg-red-500 text-white",
                        "flex items-center justify-center",
                        "shadow-md",
                        "active:scale-90 transition-transform duration-100"
                      )}
                      aria-label={`Eliminar foto ${photo.caption || ""}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* FAB camera button */}
        {canAddMore && (
          <motion.button
            type="button"
            onClick={triggerCapture}
            className={cn(
              "fixed bottom-24 right-4 z-30",
              "w-16 h-16 rounded-full",
              "bg-blue-500 text-white",
              "shadow-xl shadow-blue-500/30",
              "flex items-center justify-center",
              "hover:bg-blue-600 hover:shadow-2xl hover:shadow-blue-500/40",
              "active:scale-90 transition-all duration-150",
              "focus:outline-none focus:ring-4 focus:ring-blue-500/30"
            )}
            whileTap={{ scale: 0.85 }}
            aria-label="Tomar foto"
          >
            <Camera className="w-7 h-7" />
            {photos.length > 0 && (
              <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white text-blue-500 text-xs font-bold flex items-center justify-center shadow">
                {photos.length}
              </span>
            )}
          </motion.button>
        )}
      </>
    );
  }

  // Inline mode: thumbnail grid with add button
  return (
    <div className="space-y-3">
      {fileInput}

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        <AnimatePresence mode="popLayout">
          {photos.map((photo) => (
            <motion.div
              key={photo.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative aspect-square group"
            >
              <img
                src={photo.photo_url}
                alt={photo.caption || "Foto capturada"}
                className={cn(
                  "w-full h-full object-cover rounded-2xl",
                  "border border-white/20 dark:border-white/10",
                  "shadow-md shadow-black/5"
                )}
              />
              <button
                type="button"
                onClick={() => onDelete(photo.id)}
                className={cn(
                  "absolute -top-2 -right-2",
                  "w-7 h-7 rounded-full",
                  "bg-red-500 text-white",
                  "flex items-center justify-center",
                  "shadow-lg shadow-red-500/20",
                  "opacity-0 group-hover:opacity-100",
                  "md:opacity-0 md:group-hover:opacity-100",
                  // Always visible on touch devices
                  "active:opacity-100",
                  "transition-all duration-150",
                  "active:scale-90"
                )}
                aria-label={`Eliminar foto ${photo.caption || ""}`}
              >
                <X className="w-4 h-4" />
              </button>
              {photo.caption && (
                <span className="absolute bottom-0 left-0 right-0 px-2 py-1 text-[10px] font-medium text-white bg-black/40 backdrop-blur-sm rounded-b-2xl truncate">
                  {photo.caption}
                </span>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Add photo button */}
        {canAddMore && (
          <motion.button
            type="button"
            onClick={triggerCapture}
            className={cn(
              "aspect-square rounded-2xl",
              "border-2 border-dashed border-gray-300 dark:border-gray-600",
              "bg-gray-50/50 dark:bg-white/5",
              "flex flex-col items-center justify-center gap-1.5",
              "text-gray-400 dark:text-gray-500",
              "hover:border-blue-400 dark:hover:border-blue-500",
              "hover:text-blue-500 dark:hover:text-blue-400",
              "hover:bg-blue-50/30 dark:hover:bg-blue-500/5",
              "active:scale-95 transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            )}
            whileTap={{ scale: 0.93 }}
            aria-label="Agregar foto"
          >
            <Plus className="w-6 h-6" />
            <span className="text-[10px] font-medium">Foto</span>
          </motion.button>
        )}
      </div>

      {/* Photo count */}
      <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
        {photos.length} / {maxPhotos} fotos
      </p>
    </div>
  );
}
