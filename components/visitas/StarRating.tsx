"use client"

import { Star } from "lucide-react"

interface StarRatingProps {
  value: number
  onChange: (value: number) => void
  label?: string
  required?: boolean
}

export function StarRating({ value, onChange, label, required = false }: StarRatingProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 rounded-lg p-1 transition-transform active:scale-95"
          >
            <Star
              className={`h-10 w-10 transition-all ${
                star <= value
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  )
}
