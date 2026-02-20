"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const followerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Skip on touch devices
    if (window.matchMedia("(pointer: coarse)").matches) return

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
    if (prefersReduced) return

    const dot = dotRef.current
    const follower = followerRef.current
    if (!dot || !follower) return

    const xDot = gsap.quickTo(dot, "x", { duration: 0.1, ease: "power2.out" })
    const yDot = gsap.quickTo(dot, "y", { duration: 0.1, ease: "power2.out" })
    const xFollower = gsap.quickTo(follower, "x", {
      duration: 0.3,
      ease: "power2.out",
    })
    const yFollower = gsap.quickTo(follower, "y", {
      duration: 0.3,
      ease: "power2.out",
    })

    const handleMove = (e: MouseEvent) => {
      xDot(e.clientX - 4)
      yDot(e.clientY - 4)
      xFollower(e.clientX - 20)
      yFollower(e.clientY - 20)
    }

    const handleEnter = () => {
      gsap.to([dot, follower], { opacity: 1, duration: 0.3 })
    }

    const handleLeave = () => {
      gsap.to([dot, follower], { opacity: 0, duration: 0.3 })
    }

    window.addEventListener("mousemove", handleMove)
    document.addEventListener("mouseenter", handleEnter)
    document.addEventListener("mouseleave", handleLeave)

    return () => {
      window.removeEventListener("mousemove", handleMove)
      document.removeEventListener("mouseenter", handleEnter)
      document.removeEventListener("mouseleave", handleLeave)
    }
  }, [])

  // Don't render on touch devices / SSR
  if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) {
    return null
  }

  return (
    <>
      <div
        ref={dotRef}
        className="landing-cursor opacity-0"
        aria-hidden="true"
      >
        <div className="landing-cursor__dot" />
      </div>
      <div
        ref={followerRef}
        className="landing-cursor opacity-0"
        aria-hidden="true"
      >
        <div className="landing-cursor__follower" />
      </div>
    </>
  )
}
