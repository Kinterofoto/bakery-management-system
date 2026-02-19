"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

const circles = [
  { size: 300, top: "10%", left: "5%", speed: 0.3, opacity: 0.06 },
  { size: 200, top: "30%", left: "80%", speed: -0.2, opacity: 0.08 },
  { size: 400, top: "50%", left: "60%", speed: 0.4, opacity: 0.04 },
  { size: 150, top: "70%", left: "15%", speed: -0.3, opacity: 0.07 },
  { size: 250, top: "85%", left: "45%", speed: 0.25, opacity: 0.05 },
  { size: 180, top: "20%", left: "40%", speed: -0.15, opacity: 0.06 },
]

export default function ParallaxCircles() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
    if (prefersReduced) return

    const els = containerRef.current?.querySelectorAll(".parallax-circle")
    if (!els) return

    els.forEach((el, i) => {
      gsap.to(el, {
        y: () => circles[i].speed * window.innerHeight,
        ease: "none",
        scrollTrigger: {
          trigger: document.body,
          start: "top top",
          end: "bottom bottom",
          scrub: 1,
        },
      })
    })

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill())
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      {circles.map((c, i) => (
        <div
          key={i}
          className="parallax-circle absolute rounded-full border border-pastry-yellow"
          style={{
            width: c.size,
            height: c.size,
            top: c.top,
            left: c.left,
            opacity: c.opacity,
          }}
        />
      ))}
    </div>
  )
}
