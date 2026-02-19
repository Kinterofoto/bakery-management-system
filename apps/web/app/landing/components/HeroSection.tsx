"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import PastryLogoSVG from "./PastryLogoSVG"
import ScrollIndicator from "./ScrollIndicator"

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const logoWrapperRef = useRef<HTMLDivElement>(null)
  const taglineRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    if (prefersReduced) return

    // Make fill and letters visible (they start visible in hero, not animated like entry)
    const svg = logoWrapperRef.current?.querySelector("svg")
    if (svg) {
      const fill = svg.querySelector(".logo-icon-fill") as SVGPathElement
      const stroke = svg.querySelector(".logo-icon-stroke") as SVGPathElement
      const letters = svg.querySelectorAll(".logo-letter")
      if (fill) fill.style.opacity = "1"
      if (stroke) stroke.style.opacity = "0"
      letters.forEach((l) => ((l as SVGPathElement).style.opacity = "1"))
    }

    // Logo shrinks and moves to top-left on scroll
    gsap.to(logoWrapperRef.current, {
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top top",
        end: "bottom top",
        scrub: 1,
        pin: true,
      },
      scale: 0.15,
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
      <h1 className="sr-only">Pastry — Panadería congelada premium</h1>
      <div
        ref={logoWrapperRef}
        className="flex flex-col items-center select-none will-change-transform"
      >
        <PastryLogoSVG
          className="w-[60vw] md:w-[40vw] lg:w-[30vw] h-auto"
          color="#DFD860"
        />
      </div>
      <p
        ref={taglineRef}
        className="mt-8 text-lg md:text-xl text-white/60 tracking-wide max-w-lg text-center"
      >
        Panadería congelada premium — 100% hecha en Colombia
      </p>
      <ScrollIndicator />
    </section>
  )
}
