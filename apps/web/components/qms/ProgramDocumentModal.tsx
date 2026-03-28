"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Eye, Pencil, Save, Loader2, FileText } from "lucide-react"
import dynamic from "next/dynamic"
import { toast } from "sonner"

interface Props {
  open: boolean
  onClose: () => void
  programName: string
  accentColor: string
  document: string | null
  onSave: (content: string) => Promise<void>
}

const MarkdownRenderer = dynamic(() => import("./MarkdownRenderer"), { ssr: false })

export function ProgramDocumentModal({ open, onClose, programName, accentColor, document, onSave }: Props) {
  const [mode, setMode] = useState<"view" | "edit">("view")
  const [content, setContent] = useState(document || "")
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      setContent(document || "")
      setMode("view")
    }
  }, [open, document])

  useEffect(() => {
    if (mode === "edit" && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [mode])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      await onSave(content)
      toast.success("Documento guardado")
      setMode("view")
    } catch {
      toast.error("Error al guardar el documento")
    } finally {
      setSaving(false)
    }
  }, [content, onSave])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      if (mode === "edit" && !saving) handleSave()
    }
  }, [mode, saving, handleSave])

  const accentMap: Record<string, { gradient: string; bg: string }> = {
    blue: { gradient: "from-sky-400 to-blue-600", bg: "bg-blue-500" },
    green: { gradient: "from-green-400 to-emerald-600", bg: "bg-green-500" },
    purple: { gradient: "from-purple-400 to-violet-600", bg: "bg-purple-500" },
    orange: { gradient: "from-orange-400 to-red-600", bg: "bg-orange-500" },
  }
  const accent = accentMap[accentColor] || accentMap.blue

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
            initial={{ opacity: 0, scale: 0.97, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="fixed inset-2 sm:inset-4 z-[70] flex flex-col bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl border border-white/30 dark:border-white/15 rounded-3xl shadow-2xl overflow-hidden"
            onKeyDown={handleKeyDown}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-gray-200/30 dark:border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accent.gradient} flex items-center justify-center shadow-lg`}>
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                    Programa
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{programName}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* View/Edit toggle */}
                <div className="flex bg-gray-100 dark:bg-white/10 rounded-xl p-1">
                  <button
                    onClick={() => setMode("view")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      mode === "view"
                        ? "bg-white dark:bg-white/20 text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Visualizar</span>
                  </button>
                  <button
                    onClick={() => setMode("edit")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      mode === "edit"
                        ? "bg-white dark:bg-white/20 text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    }`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Editar</span>
                  </button>
                </div>

                {/* Save button (edit mode) */}
                {mode === "edit" && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={handleSave}
                    disabled={saving}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl ${accent.bg} text-white text-xs font-medium shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50`}
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">Guardar</span>
                  </motion.button>
                )}

                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              {mode === "view" ? (
                <div className="h-full overflow-y-auto p-6 sm:p-8 md:px-16 lg:px-24">
                  {content ? (
                    <article className="prose prose-gray dark:prose-invert max-w-none prose-headings:font-semibold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-table:text-sm prose-th:bg-gray-100 dark:prose-th:bg-white/10 prose-th:px-4 prose-th:py-2 prose-td:px-4 prose-td:py-2 prose-th:text-left prose-table:border-collapse prose-td:border prose-th:border prose-td:border-gray-200 dark:prose-td:border-white/10 prose-th:border-gray-200 dark:prose-th:border-white/10">
                      <MarkdownRenderer content={content} />
                    </article>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <FileText className="w-16 h-16 mb-4 opacity-30" />
                      <p className="text-sm mb-2">No hay documento del programa</p>
                      <p className="text-xs text-gray-400">Cambia a modo editar para crear el contenido</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col">
                  <div className="px-6 sm:px-8 pt-3 pb-1">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                      Markdown + Mermaid &middot; Ctrl/Cmd+S para guardar
                    </p>
                  </div>
                  <div className="flex-1 px-6 sm:px-8 pb-6">
                    <textarea
                      ref={textareaRef}
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      spellCheck={false}
                      className="w-full h-full resize-none bg-gray-50 dark:bg-black/30 border border-gray-200/40 dark:border-white/10 rounded-2xl p-4 sm:p-6 text-sm font-mono text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder:text-gray-300 dark:placeholder:text-gray-600 leading-relaxed"
                      placeholder={"# Título del Programa\n\nEscribe aquí el contenido en Markdown...\n\n## Soporta Mermaid\n\n```mermaid\ngraph TD\n    A[Inicio] --> B[Fin]\n```"}
                    />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
