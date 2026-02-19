"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import ScrollIndicator from "./ScrollIndicator"

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const logoRef = useRef<HTMLHeadingElement>(null)
  const taglineRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    if (prefersReduced) return

    // Logo moves from center to top-left corner on scroll
    gsap.to(logoRef.current, {
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top top",
        end: "bottom top",
        scrub: 1,
        pin: true,
      },
      fontSize: "1.5rem",
      x: () => -(window.innerWidth / 2 - 80),
      y: () => -(window.innerHeight / 2 - 40),
      ease: "none",
    })

    // Tagline reveal
    gsap.fromTo(
      taglineRef.current,
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 1,
        delay: 0.3,
        ease: "power2.out",
      }
    )

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill())
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative flex min-h-screen flex-col items-center justify-center bg-[#0A0A0A] overflow-hidden"
    >
      <h1
        ref={logoRef}
        className="text-[12vw] font-bold tracking-tighter text-white leading-none select-none"
      >
        Pastry
      </h1>
      <p
        ref={taglineRef}
        className="mt-6 text-lg md:text-xl text-white/60 tracking-wide max-w-md text-center"
      >
        Sistema inteligente de gestión para panaderías
      </p>
      <ScrollIndicator />
    </section>
  )
}
