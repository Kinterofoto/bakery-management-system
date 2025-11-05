"use client"

interface ProgressBarProps {
  currentStep: number
  totalSteps: number
}

export function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const progress = (currentStep / totalSteps) * 100

  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className="bg-teal-500 h-2 rounded-full transition-all duration-300 ease-in-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}
