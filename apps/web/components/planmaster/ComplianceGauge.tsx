"use client"

interface ComplianceGaugeProps {
  percentage: number
}

export function ComplianceGauge({ percentage }: ComplianceGaugeProps) {
  // Determine color based on percentage
  const getColor = () => {
    if (percentage >= 90) return 'text-green-600'
    if (percentage >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getStrokeColor = () => {
    if (percentage >= 90) return '#16a34a' // green-600
    if (percentage >= 70) return '#ca8a04' // yellow-600
    return '#dc2626' // red-600
  }

  // Calculate circle properties
  const size = 120
  const strokeWidth = 12
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background circle */}
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={getStrokeColor()}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        {/* Percentage text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-3xl font-bold ${getColor()}`}>
            {percentage}%
          </span>
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-2">Plan actual</p>
    </div>
  )
}
