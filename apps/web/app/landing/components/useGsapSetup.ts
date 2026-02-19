"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

export function useGsapSetup() {
  const registered = useRef(false)

  useEffect(() => {
    if (!registered.current) {
      gsap.registerPlugin(ScrollTrigger)
      registered.current = true
    }

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill())
    }
  }, [])

  return { gsap, ScrollTrigger }
}
