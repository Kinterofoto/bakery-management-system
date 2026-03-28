"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, FileText, Image as ImageIcon, Download, Loader2, Paperclip } from "lucide-react"

interface Attachment {
  id: string
  file_url: string
  file_name: string
  file_type: string | null
}

function isImage(fileType: string | null, fileName: string): boolean {
  if (fileType?.startsWith("image/")) return true
  const ext = fileName.split(".").pop()?.toLowerCase()
  return ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext || "")
}

export function RecordAttachmentsModal({
  attachments,
  open,
  onClose,
  title,
}: {
  attachments: Attachment[]
  open: boolean
  onClose: () => void
  title?: string
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const photos = attachments.filter((a) => isImage(a.file_type, a.file_name))
  const documents = attachments.filter((a) => !isImage(a.file_type, a.file_name))

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="fixed inset-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:top-[5vh] sm:bottom-[5vh] sm:w-full sm:max-w-2xl z-[70] flex flex-col bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl border border-white/30 dark:border-white/15 rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-200/30 dark:border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <Paperclip className="w-5 h-5 text-gray-500" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Evidencias
                  </h3>
                  {title && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{title}</p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {attachments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <Paperclip className="w-10 h-10 mb-3 opacity-50" />
                  <p className="text-sm">Sin evidencias adjuntas</p>
                </div>
              ) : (
                <>
                  {/* Photos */}
                  {photos.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        <ImageIcon className="w-4 h-4" />
                        Fotos ({photos.length})
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {photos.map((photo) => (
                          <button
                            key={photo.id}
                            onClick={() => setPreviewUrl(photo.file_url)}
                            className="relative aspect-square rounded-xl overflow-hidden border border-white/20 dark:border-white/10 hover:ring-2 hover:ring-blue-500/50 transition-all duration-150 group"
                          >
                            <img
                              src={photo.file_url}
                              alt={photo.file_name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-150" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Documents */}
                  {documents.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Documentos ({documents.length})
                      </h4>
                      <div className="space-y-2">
                        {documents.map((doc) => (
                          <a
                            key={doc.id}
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 rounded-xl bg-white/40 dark:bg-white/5 border border-white/20 dark:border-white/10 hover:bg-white/60 dark:hover:bg-white/8 transition-colors duration-150"
                          >
                            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                              <FileText className="w-5 h-5 text-blue-500" />
                            </div>
                            <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">
                              {doc.file_name}
                            </span>
                            <Download className="w-4 h-4 text-gray-400 shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>

          {/* Full-screen image preview */}
          <AnimatePresence>
            {previewUrl && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/80 z-[80]"
                  onClick={() => setPreviewUrl(null)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="fixed inset-4 z-[80] flex items-center justify-center"
                  onClick={() => setPreviewUrl(null)}
                >
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
                  />
                  <button
                    onClick={() => setPreviewUrl(null)}
                    className="absolute top-2 right-2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  )
}

// Small inline button to show attachment count and open the modal
export function AttachmentsBadge({
  count,
  onClick,
}: {
  count: number
  onClick: () => void
}) {
  if (count === 0) return null

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors duration-150 text-xs font-medium"
    >
      <Paperclip className="w-3 h-3" />
      {count} {count === 1 ? "evidencia" : "evidencias"}
    </button>
  )
}
