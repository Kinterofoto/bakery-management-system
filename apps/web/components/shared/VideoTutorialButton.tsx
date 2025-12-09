"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Video, Settings } from "lucide-react"
import { useVideoTutorial } from "@/hooks/use-video-tutorials"
import { VideoPlayerModal } from "./VideoPlayerModal"
import { VideoConfigModal } from "./VideoConfigModal"
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
  const { video, loading, isSuperAdmin, saveVideo, deleteVideo, refetch, hasVideo } = useVideoTutorial({
    modulePath,
    autoFetch: true
  })

  const [showPlayerModal, setShowPlayerModal] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)

  const handleButtonClick = () => {
    if (hasVideo) {
      // Show video player
      setShowPlayerModal(true)
    } else if (isSuperAdmin) {
      // Show configuration modal for admin
      setShowConfigModal(true)
    }
    // For non-admin users with no video, do nothing (button hidden)
  }

  // Don't render button if:
  // - No user (not authenticated)
  // - No video exists and user is not super_admin
  if (!user) return null
  if (!hasVideo && !isSuperAdmin) return null

  const buttonLabel = hasVideo
    ? "Ver Tutorial"
    : "Configurar Tutorial"

  const buttonIcon = hasVideo
    ? <Video className="h-4 w-4" />
    : <Settings className="h-4 w-4" />

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
              aria-label={buttonLabel}
            >
              {buttonIcon}
              {size !== "icon" && <span className="ml-2">{buttonLabel}</span>}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{buttonLabel}</p>
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

      {/* Configuration Modal (super_admin only) */}
      {isSuperAdmin && (
        <VideoConfigModal
          open={showConfigModal}
          onOpenChange={setShowConfigModal}
          onSave={async (data) => {
            await saveVideo(data)
            await refetch()
          }}
          onDelete={async () => {
            await deleteVideo()
            await refetch()
          }}
          existingVideo={video}
          modulePath={modulePath}
        />
      )}
    </>
  )
}
