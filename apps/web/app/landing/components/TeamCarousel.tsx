"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

const team = [
  { name: "Carlos Méndez", role: "Fundador & CEO", color: "bg-amber-200" },
  { name: "Ana Ruiz", role: "Maestra Panadera — I+D", color: "bg-stone-300" },
  { name: "Luis Torres", role: "Director de Planta", color: "bg-yellow-200" },
  { name: "María López", role: "Líder Comercial HORECA", color: "bg-orange-200" },
  { name: "Jorge Patel", role: "Jefe de Calidad & BPM", color: "bg-amber-300" },
  { name: "Elena Vargas", role: "Cadena de Frío & Logística", color: "bg-stone-200" },
]

export default function TeamCarousel() {
  const sectionRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
    if (prefersReduced) return

    // Only pin on desktop
    const mm = gsap.matchMedia()

    mm.add("(min-width: 768px)", () => {
      const track = trackRef.current
      if (!track) return

      const totalScroll = track.scrollWidth - window.innerWidth

      gsap.to(track, {
        x: -totalScroll,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: () => `+=${totalScroll}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
        },
      })
    })

    return () => mm.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      className="relative z-10 bg-[#0A0A0A] overflow-hidden py-24 md:py-0"
    >
      <div className="px-6 mb-8 md:pt-24 md:pb-12">
        <h2 className="text-3xl md:text-5xl font-bold text-white mx-auto max-w-6xl">
          Nuestro Equipo
        </h2>
      </div>

      {/* Mobile: native horizontal scroll */}
      <div className="md:hidden overflow-x-auto px-6 pb-6">
        <div className="flex gap-4" style={{ width: "max-content" }}>
          {team.map((member) => (
            <TeamCard key={member.name} member={member} />
          ))}
        </div>
      </div>

      {/* Desktop: GSAP horizontal scroll */}
      <div className="hidden md:block">
        <div ref={trackRef} className="flex gap-6 pl-6 md:pl-24 will-change-transform">
          {team.map((member) => (
            <TeamCard key={member.name} member={member} />
          ))}
        </div>
      </div>
    </section>
  )
}

function TeamCard({
  member,
}: {
  member: { name: string; role: string; color: string }
}) {
  return (
    <div className="flex-none w-64 md:w-80 relative group">
      <div
        className={`aspect-[3/4] rounded-xl ${member.color} grayscale-hover overflow-hidden relative`}
      >
        {/* Placeholder avatar */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-6xl font-bold text-black/10">
            {member.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </span>
        </div>
      </div>
      {/* Vertical name */}
      <div className="absolute top-4 right-4">
        <span className="vertical-text text-xs font-semibold tracking-widest text-[#0A0A0A]/60 uppercase">
          {member.name}
        </span>
      </div>
      <div className="mt-3">
        <p className="text-white font-semibold">{member.name}</p>
        <p className="text-white/50 text-sm">{member.role}</p>
      </div>
    </div>
  )
}
