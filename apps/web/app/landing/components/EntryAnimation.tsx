"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import gsap from "gsap"

export default function EntryAnimation({
  onComplete,
}: {
  onComplete: () => void
}) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const logoRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    if (prefersReduced) {
      setVisible(false)
      onComplete()
      return
    }

    document.documentElement.classList.add("no-scroll")

    const tl = gsap.timeline({
      onComplete: () => {
        document.documentElement.classList.remove("no-scroll")
        setVisible(false)
        onComplete()
      },
    })

    // Logo appears with scale + fade
    tl.fromTo(
      logoRef.current,
      { scale: 0.6, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.8, ease: "power2.out" }
    )
      // Hold for a beat
      .to(logoRef.current, { duration: 0.5 })
      // Expand clip-path to reveal page
      .to(contentRef.current, {
        clipPath: "circle(150% at 50% 50%)",
        duration: 1.2,
        ease: "power3.inOut",
      })
      // Fade out overlay
      .to(
        overlayRef.current,
        {
          opacity: 0,
          duration: 0.4,
          ease: "power2.out",
        },
        "-=0.3"
      )

    return () => {
      tl.kill()
      document.documentElement.classList.remove("no-scroll")
    }
  }, [onComplete])

  const handleSkip = () => {
    gsap.killTweensOf("*")
    document.documentElement.classList.remove("no-scroll")
    setVisible(false)
    onComplete()
  }

  if (!visible) return null

  return (
    <div ref={overlayRef} className="entry-overlay">
      <div
        ref={contentRef}
        className="fixed inset-0 bg-[#0A0A0A]"
        style={{ clipPath: "circle(0% at 50% 50%)" }}
      />
      {/* Pastry logo as the entry focal point */}
      <div ref={logoRef} className="relative z-[101] flex flex-col items-center">
        <Image
          src="/landing/logo-yellow.png"
          alt="Pastry"
          width={240}
          height={240}
          priority
          className="w-40 h-40 md:w-60 md:h-60 object-contain"
        />
      </div>
      <button
        onClick={handleSkip}
        className="landing-focus absolute bottom-8 right-8 z-[101] text-sm text-white/50 hover:text-white transition-colors"
        aria-label="Saltar animación de entrada"
      >
        Skip
      </button>
    </div>
  )
}
