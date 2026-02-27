"use client"

import { useEffect, useRef, useCallback } from "react"

const PHRASE_L1 = "Nosotros amasamos,"
const PHRASE_L2_PRE = "tú "
const PHRASE_L2_SMOKE = "horneas."

// Canvas smoke particle
interface SmokeParticle {
  x: number
  y: number
  rotation: number
  rotationSpeed: number
  opacity: number
  size: number
  vx: number
  vy: number
  life: number
  maxLife: number
}

function createParticle(canvasW: number, canvasH: number): SmokeParticle {
  return {
    // Spawn from center-right area (where "horneas." text is on screen)
    x: canvasW * (0.3 + Math.random() * 0.35),
    y: canvasH * (0.52 + Math.random() * 0.12),
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.3) * 0.01,
    opacity: 0,
    size: 150 + Math.random() * 200,
    vx: 0.3 + Math.random() * 0.7, // drift right
    vy: -(0.4 + Math.random() * 0.8), // rise up
    life: 0,
    maxLife: 200 + Math.random() * 200,
  }
}

export default function ClosingPhrase() {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const stickyRef = useRef<HTMLDivElement>(null)
  const h2Ref = useRef<HTMLHeadingElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const smokeActiveRef = useRef(false)
  const revealedRef = useRef(false)
  const particlesRef = useRef<SmokeParticle[]>([])
  const textureRef = useRef<HTMLImageElement | null>(null)
  const animFrameRef = useRef<number>(0)

  const startSmoke = useCallback(() => {
    if (smokeActiveRef.current) return
    smokeActiveRef.current = true

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio, 2)
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    const w = rect.width
    const h = rect.height

    // Initialize particles — more for denser smoke
    particlesRef.current = Array.from({ length: 45 }, () => {
      const p = createParticle(w, h)
      p.life = Math.random() * p.maxLife // stagger start
      return p
    })

    const animate = () => {
      if (!smokeActiveRef.current) return
      ctx.clearRect(0, 0, w, h)

      const tex = textureRef.current
      if (!tex) {
        animFrameRef.current = requestAnimationFrame(animate)
        return
      }

      for (const p of particlesRef.current) {
        p.life++
        if (p.life > p.maxLife) {
          Object.assign(p, createParticle(w, h))
          p.life = 0
        }

        p.x += p.vx
        p.y += p.vy
        p.rotation += p.rotationSpeed

        // Fade in, hold, fade out — strong visibility
        const lifeRatio = p.life / p.maxLife
        if (lifeRatio < 0.08) {
          p.opacity = (lifeRatio / 0.08) * 0.7
        } else if (lifeRatio > 0.45) {
          p.opacity = ((1 - lifeRatio) / 0.55) * 0.7
        } else {
          p.opacity = 0.7
        }

        ctx.save()
        ctx.globalAlpha = p.opacity
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.drawImage(tex, -p.size / 2, -p.size / 2, p.size, p.size)
        ctx.restore()
      }

      animFrameRef.current = requestAnimationFrame(animate)
    }

    animate()
  }, [])

  // Load smoke texture
  useEffect(() => {
    const img = new Image()
    img.src = "/landing/smoke-texture.png"
    img.onload = () => {
      textureRef.current = img
    }
    return () => {
      smokeActiveRef.current = false
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  // Scroll handler
  useEffect(() => {
    const wrapper = wrapperRef.current
    const sticky = stickyRef.current
    const h2 = h2Ref.current
    if (!wrapper || !sticky || !h2) return

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    const chars = h2.querySelectorAll<HTMLSpanElement>(".char")

    if (prefersReduced) {
      sticky.style.backgroundColor = "#27282E"
      chars.forEach((ch) => {
        ch.style.opacity = "1"
        ch.style.filter = "none"
        ch.style.transform = "none"
      })
      return
    }

    // Initial hidden state
    chars.forEach((ch) => {
      ch.style.opacity = "0"
      ch.style.filter = "blur(12px)"
      ch.style.transform = "translateY(20px)"
      ch.style.transition = "none"
    })

    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        ticking = false
        if (!wrapper || !sticky) return

        const rect = wrapper.getBoundingClientRect()
        const wrapperH = wrapper.offsetHeight
        const vh = window.innerHeight
        const scrollRoom = wrapperH - vh
        if (scrollRoom <= 0) return

        const p = Math.max(0, Math.min(1, -rect.top / scrollRoom))

        // Background: cream → dark over first 40%
        const bgP = Math.min(1, p / 0.4)
        const r = Math.round(231 - bgP * (231 - 39))
        const g = Math.round(219 - bgP * (219 - 40))
        const b = Math.round(204 - bgP * (204 - 46))
        sticky.style.backgroundColor = `rgb(${r},${g},${b})`

        // Reveal chars at ~25%
        if (p > 0.25 && !revealedRef.current) {
          revealedRef.current = true
          chars.forEach((ch, i) => {
            setTimeout(() => {
              ch.style.transition =
                "opacity 0.5s ease-out, filter 0.5s ease-out, transform 0.5s ease-out"
              ch.style.opacity = "1"
              ch.style.filter = "blur(0px)"
              ch.style.transform = "translateY(0)"
            }, i * 30)
          })

          // Start canvas smoke after chars
          setTimeout(() => {
            if (canvasRef.current) {
              canvasRef.current.style.transition = "opacity 1.5s ease-out"
              canvasRef.current.style.opacity = "1"
            }
            startSmoke()
          }, chars.length * 30 + 300)
        }
      })
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [startSmoke])

  let charIndex = 0

  const renderChars = (text: string) =>
    text.split("").map((c) => {
      const idx = charIndex++
      return (
        <span
          key={idx}
          className="char inline-block"
          style={{ willChange: "opacity, filter, transform" }}
        >
          {c === " " ? "\u00A0" : c}
        </span>
      )
    })

  return (
    <div ref={wrapperRef} style={{ height: "250vh" }}>
      <div
        ref={stickyRef}
        className="sticky top-0 h-screen flex items-center justify-center overflow-hidden px-8"
        style={{ backgroundColor: "#E7DBCC" }}
      >
        <h2
          ref={h2Ref}
          className="relative text-[7vw] sm:text-5xl md:text-7xl lg:text-8xl font-bold text-center leading-tight max-w-5xl z-10"
        >
          {/* "Nosotros amasamos," in yellow */}
          <span className="text-[#DFD860]">
            {renderChars(PHRASE_L1)}
          </span>
          <br />
          {/* "tú " in cream */}
          <span className="text-[#F5EDE3]">
            {renderChars(PHRASE_L2_PRE)}
          </span>
          {/* "horneas." in cream */}
          <span className="text-[#F5EDE3]">
            {renderChars(PHRASE_L2_SMOKE)}
          </span>
        </h2>

        {/* Full-screen canvas for smoke — no clipping */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none z-[5]"
          style={{ width: "100%", height: "100%", opacity: 0 }}
        />
      </div>
    </div>
  )
}
