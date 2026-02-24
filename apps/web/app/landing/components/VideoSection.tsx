"use client"

import { useRef, useState, useEffect } from "react"
import Image from "next/image"

const VIDEO_URL =
  "https://khwcknapjnhpxfodsahb.supabase.co/storage/v1/object/public/video/PASTRY-VIDEO%20CORPORATIVO_3.MP4"

const TITLE = "Conoce nuestra planta"

export default function VideoSection() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const [playing, setPlaying] = useState(false)

  const handlePlay = () => {
    const video = videoRef.current
    if (!video) return
    video.play()
    setPlaying(true)
  }

  // Per-character blur+fade-in animation on scroll
  useEffect(() => {
    const title = titleRef.current
    if (!title) return
    const chars = title.querySelectorAll<HTMLSpanElement>(".vchar")
    if (!chars.length) return

    let fired = false
    const reveal = () => {
      if (fired) return
      fired = true
      chars.forEach((ch, i) => {
        setTimeout(() => {
          ch.style.opacity = "1"
          ch.style.filter = "blur(0px)"
          ch.style.transform = "translateY(0)"
        }, i * 30)
      })
    }

    // Check on every scroll tick — more reliable after pinned sections
    const onScroll = () => {
      const rect = title.getBoundingClientRect()
      if (rect.top < window.innerHeight * 0.85 && rect.bottom > 0) {
        reveal()
        window.removeEventListener("scroll", onScroll)
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    // Also check immediately in case already in view
    onScroll()

    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <section className="relative z-10 bg-[#27282E] px-4 sm:px-8 md:px-16 lg:px-24 py-20 md:py-28">
      <div className="mx-auto max-w-5xl">
        <h2
          ref={titleRef}
          className="text-2xl sm:text-3xl md:text-4xl font-bold text-white/90 text-center mb-10"
        >
          {TITLE.split("").map((c, i) => (
            <span
              key={i}
              className="vchar inline-block transition-all duration-500 ease-out"
              style={{
                opacity: 0,
                filter: "blur(12px)",
                transform: "translateY(20px)",
              }}
            >
              {c === " " ? "\u00A0" : c}
            </span>
          ))}
        </h2>
        <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-black/40">
          {/* Thumbnail overlay */}
          {!playing && (
            <button
              onClick={handlePlay}
              className="absolute inset-0 z-10 cursor-pointer group"
              aria-label="Reproducir video"
            >
              <Image
                src="/landing/video-thumbnail.png"
                alt="Video corporativo Pastry Chef"
                fill
                className="object-cover brightness-75"
                sizes="(max-width: 768px) 100vw, 1024px"
                priority={false}
              />
              {/* Play button */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors duration-300">
                  <svg
                    className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-white ml-1"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </button>
          )}

          {/* Video element */}
          <video
            ref={videoRef}
            src={VIDEO_URL}
            controls={playing}
            playsInline
            preload="none"
            className="w-full aspect-video bg-black"
          />
        </div>
      </div>
    </section>
  )
}
