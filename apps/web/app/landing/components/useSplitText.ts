"use client"

import { useEffect, useRef, useCallback } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

export function useSplitText(trigger?: string) {
  const ref = useRef<HTMLElement>(null)

  const split = useCallback(() => {
    const el = ref.current
    if (!el) return

    const text = el.textContent || ""
    el.innerHTML = ""

    text.split("").forEach((char) => {
      const span = document.createElement("span")
      span.className = "inline-block"
      span.style.opacity = "0"
      span.textContent = char === " " ? "\u00A0" : char
      el.appendChild(span)
    })

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    if (prefersReduced) {
      el.querySelectorAll("span").forEach((s) => {
        s.style.opacity = "1"
      })
      return
    }

    gsap.to(el.querySelectorAll("span"), {
      opacity: 1,
      y: 0,
      stagger: 0.02,
      duration: 0.4,
      ease: "power2.out",
      scrollTrigger: {
        trigger: trigger || el,
        start: "top 80%",
        once: true,
      },
    })
  }, [trigger])

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)
    split()
  }, [split])

  return ref
}
