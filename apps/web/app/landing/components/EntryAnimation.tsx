"use client"

import { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import PastryLogoSVG from "./PastryLogoSVG"

export default function EntryAnimation({
  onComplete,
}: {
  onComplete: () => void
}) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
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

    const svg = svgRef.current
    if (!svg) return

    const strokePath = svg.querySelector(".logo-icon-stroke") as SVGPathElement
    const fillPath = svg.querySelector(".logo-icon-fill") as SVGPathElement
    const letters = svg.querySelectorAll(".logo-letter")

    // Measure stroke length for draw-on effect
    const strokeLength = strokePath?.getTotalLength() || 2000

    // Set initial state for stroke animation
    if (strokePath) {
      gsap.set(strokePath, {
        strokeDasharray: strokeLength,
        strokeDashoffset: strokeLength,
      })
    }

    const tl = gsap.timeline({
      onComplete: () => {
        document.documentElement.classList.remove("no-scroll")
        // Fade everything out and reveal page
        gsap.to(overlayRef.current, {
          opacity: 0,
          duration: 0.6,
          ease: "power2.inOut",
          onComplete: () => {
            setVisible(false)
            onComplete()
          },
        })
      },
    })

    // Phase 1: Draw the croissant outline
    tl.to(strokePath, {
      strokeDashoffset: 0,
      duration: 1.8,
      ease: "power2.inOut",
    })
      // Phase 2: Fill in the icon, fade out stroke
      .to(
        fillPath,
        {
          opacity: 1,
          duration: 0.5,
          ease: "power2.out",
        },
        "-=0.3"
      )
      .to(
        strokePath,
        {
          opacity: 0,
          duration: 0.3,
        },
        "-=0.2"
      )
      // Phase 3: Reveal each letter (P-A-S-T-R-Y) one by one
      .to(letters, {
        opacity: 1,
        y: 0,
        stagger: 0.1,
        duration: 0.4,
        ease: "power2.out",
      })
      // Hold for a beat
      .to({}, { duration: 0.6 })

    // Set initial letter positions
    gsap.set(letters, { opacity: 0, y: 10 })

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
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0A0A]"
    >
      <PastryLogoSVG
        ref={svgRef}
        className="w-[70vw] md:w-[40vw] lg:w-[30vw] h-auto"
        color="#DFD860"
      />
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
