"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Video } from "lucide-react"
import { useVideoTutorial } from "@/hooks/use-video-tutorials"
import { VideoPlayerModal } from "./VideoPlayerModal"
import { useAuth } from "@/contexts/AuthContext"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface VideoTutorialButtonProps {
  modulePath: string
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
}

export function VideoTutorialButton({
  modulePath,
  variant = "outline",
  size = "default",
  className
}: VideoTutorialButtonProps) {
  const { user } = useAuth()
  const { video, loading, hasVideo } = useVideoTutorial({
    modulePath,
    autoFetch: true
  })

  const [showPlayerModal, setShowPlayerModal] = useState(false)

  const handleButtonClick = () => {
    if (hasVideo) {
      setShowPlayerModal(true)
    }
  }

  // Don't render button if:
  // - No user (not authenticated)
  // - No video exists (hide for everyone, even super_admin)
  if (!user) return null
  if (!hasVideo) return null

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={variant}
              size={size}
              onClick={handleButtonClick}
              disabled={loading}
              className={className}
              aria-label="Ver Tutorial"
            >
              <Video className="h-4 w-4" />
              {size !== "icon" && <span className="ml-2">Ver Tutorial</span>}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Ver Tutorial</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Video Player Modal */}
      {hasVideo && video && (
        <VideoPlayerModal
          open={showPlayerModal}
          onOpenChange={setShowPlayerModal}
          videoUrl={video.video_url}
          title={video.title || `Tutorial: ${modulePath}`}
          description={video.description || undefined}
        />
      )}
    </>
  )
}
