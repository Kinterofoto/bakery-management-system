"use client"

import { useState, useCallback } from "react"
import dynamic from "next/dynamic"
import { useGsapSetup } from "./useGsapSetup"
import EntryAnimation from "./EntryAnimation"
import HeroSection from "./HeroSection"
import NavigationBar from "./NavigationBar"
import FullScreenMenu from "./FullScreenMenu"
import CustomCursor from "./CustomCursor"
import ParallaxCircles from "./ParallaxCircles"

// Dynamic imports for below-fold sections
const ManifestoSection = dynamic(() => import("./ManifestoSection"))
const StatsSection = dynamic(() => import("./StatsSection"))
const ProductsShowcase = dynamic(() => import("./ProductsShowcase"))
const TeamCarousel = dynamic(() => import("./TeamCarousel"))
const CommitmentsSection = dynamic(() => import("./CommitmentsSection"))
const TestimonialsSection = dynamic(() => import("./TestimonialsSection"))
const FAQSection = dynamic(() => import("./FAQSection"))
const ContactSection = dynamic(() => import("./ContactSection"))
const NewsletterSection = dynamic(() => import("./NewsletterSection"))
const FooterSection = dynamic(() => import("./FooterSection"))

export default function LandingPage() {
  useGsapSetup()
  const [entryDone, setEntryDone] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const handleEntryComplete = useCallback(() => {
    setEntryDone(true)
  }, [])

  const toggleMenu = useCallback(() => {
    setMenuOpen((prev) => !prev)
  }, [])

  const closeMenu = useCallback(() => {
    setMenuOpen(false)
  }, [])

  return (
    <div className="relative bg-[#27282E] min-h-screen" style={{ fontFamily: "var(--font-jakarta), sans-serif" }}>
      {/* Skip to content */}
      <a
        href="#manifesto"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:rounded-lg focus:bg-pastry-yellow focus:px-4 focus:py-2 focus:text-[#27282E] focus:font-semibold"
      >
        Saltar al contenido
      </a>

      {/* Entry Animation */}
      {!entryDone && <EntryAnimation onComplete={handleEntryComplete} />}

      {/* Global elements */}
      <CustomCursor />
      <ParallaxCircles />
      <NavigationBar onMenuToggle={toggleMenu} />
      <FullScreenMenu isOpen={menuOpen} onClose={closeMenu} />

      {/* Main content — blurs when menu open */}
      <div
        className={`transition-all duration-1000 ease-[cubic-bezier(0.075,0.82,0.165,1)] ${
          menuOpen ? "opacity-60 blur-[20px] scale-[1.05]" : "opacity-100 blur-0 scale-100"
        }`}
      >
        <main>
          <HeroSection />
          <ManifestoSection />
          <StatsSection />
          <ProductsShowcase />
          <TeamCarousel />
          <CommitmentsSection />
          <TestimonialsSection />
          <FAQSection />
          <ContactSection />
          <NewsletterSection />
        </main>

        <FooterSection />
      </div>
    </div>
  )
}
