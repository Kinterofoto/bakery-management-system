"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Delete, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoteKeyboardProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (value: string) => void
  initialValue?: string
  itemName?: string
}

export function LoteKeyboard({ isOpen, onClose, onSubmit, initialValue = "", itemName }: LoteKeyboardProps) {
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue)
    }
  }, [isOpen, initialValue])

  const handleKeyPress = (key: string) => {
    setValue((prev) => prev + key)
  }

  const handleBackspace = () => {
    setValue((prev) => prev.slice(0, -1))
  }

  const handleClear = () => {
    setValue("")
  }

  const handleSubmit = () => {
    onSubmit(value)
    onClose()
  }

  const keys = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["L", "0", "⌫"],
  ]

  return (
    <DialogPrimitive.Root open={isOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          className={cn(
            "fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg"
          )}>
        <div className="space-y-4">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>

          {/* Header */}
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">Ingresar Lote</h3>
            {/* Product name */}
            {itemName && (
              <p className="text-sm text-gray-600 truncate">{itemName}</p>
            )}
          </div>

          {/* Display */}
          <div className="bg-gray-100 rounded-lg p-4 min-h-[60px] flex items-center justify-center">
            <span className="text-2xl font-mono font-semibold">
              {value || "..."}
            </span>
          </div>

          {/* Keyboard */}
          <div className="grid grid-cols-3 gap-2">
            {keys.map((row, rowIndex) =>
              row.map((key, keyIndex) => (
                <Button
                  key={`${rowIndex}-${keyIndex}`}
                  variant={key === "L" ? "default" : "outline"}
                  size="lg"
                  className={`h-16 text-xl font-semibold ${
                    key === "L" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""
                  }`}
                  onClick={() => {
                    if (key === "⌫") {
                      handleBackspace()
                    } else {
                      handleKeyPress(key)
                    }
                  }}
                >
                  {key === "⌫" ? <Delete className="h-5 w-5" /> : key}
                </Button>
              ))
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button
              variant="outline"
              size="lg"
              onClick={handleClear}
              className="h-12"
            >
              Limpiar
            </Button>
            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={!value}
              className="h-12 bg-green-600 hover:bg-green-700"
            >
              Confirmar
            </Button>
          </div>
        </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
