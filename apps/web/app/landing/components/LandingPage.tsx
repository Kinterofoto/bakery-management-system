"use client"

import { useState, useCallback } from "react"
import dynamic from "next/dynamic"
import { useGsapSetup } from "./useGsapSetup"
import EntryAnimation from "./EntryAnimation"
import HeroSection from "./HeroSection"
import NavigationBar from "./NavigationBar"
import CustomCursor from "./CustomCursor"
import ParallaxCircles from "./ParallaxCircles"

// Dynamic imports for below-fold sections
const ManifestoSection = dynamic(() => import("./ManifestoSection"))
const StatsSection = dynamic(() => import("./StatsSection"))


const VideoSection = dynamic(() => import("./VideoSection"))
const AlliancesSection = dynamic(() => import("./AlliancesSection"))
const FAQSection = dynamic(() => import("./FAQSection"))
const ContactSection = dynamic(() => import("./ContactSection"))
const NewsletterSection = dynamic(() => import("./NewsletterSection"))
const FooterSection = dynamic(() => import("./FooterSection"))

export default function LandingPage() {
  useGsapSetup()
  const [entryDone, setEntryDone] = useState(false)

  const handleEntryComplete = useCallback(() => {
    setEntryDone(true)
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
      <NavigationBar />

      {/* Main content */}
      <main>
        <HeroSection />
        <ManifestoSection />
        <StatsSection />
        <VideoSection />
        <AlliancesSection />
        <FAQSection />
        <ContactSection />
        <NewsletterSection />
      </main>

      <FooterSection />
    </div>
  )
}
