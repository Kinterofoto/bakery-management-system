"use client"

import { useEffect, useRef, useCallback } from "react"
import Image from "next/image"
import { AnimatePresence, motion } from "framer-motion"
// Close is handled by the floating glass ball in NavigationBar

const menuLinks = [
  { label: "Productos", href: "#productos" },
  { label: "Nosotros", href: "#manifesto" },
  { label: "Compromiso", href: "#compromisos" },
  { label: "Contacto", href: "#contacto" },
  { label: "FAQ", href: "#faq" },
]

// Circle expands from the floating glass ball (top-right)
const CIRCLE_ORIGIN = "calc(100% - 2.75rem) 2.75rem"

const overlayVariants = {
  hidden: {
    clipPath: `circle(0% at ${CIRCLE_ORIGIN})`,
  },
  visible: {
    clipPath: `circle(150% at ${CIRCLE_ORIGIN})`,
    transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    clipPath: `circle(0% at ${CIRCLE_ORIGIN})`,
    transition: { duration: 0.45, ease: [0.4, 0, 0.2, 1] },
  },
}

const linkVariants = {
  hidden: { y: 30, opacity: 0, filter: "blur(4px)" },
  visible: {
    y: 0,
    opacity: 1,
    filter: "blur(0px)",
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
  },
  exit: { y: -10, opacity: 0, transition: { duration: 0.15 } },
}

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.07, delayChildren: 0.25 },
  },
  exit: {},
}

export default function FullScreenMenu({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const menuRef = useRef<HTMLDivElement>(null)
  const firstLinkRef = useRef<HTMLAnchorElement>(null)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "Tab" && menuRef.current) {
        const focusable = menuRef.current.querySelectorAll<HTMLElement>(
          "a, button, [tabindex]"
        )
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "hidden"
      setTimeout(() => firstLinkRef.current?.focus(), 350)
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [isOpen, handleKeyDown])

  const handleClick = (href: string) => {
    onClose()
    setTimeout(() => {
      const el = document.querySelector(href)
      el?.scrollIntoView({ behavior: "smooth" })
    }, 500)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          className="fixed inset-0 z-50 backdrop-blur-2xl overflow-hidden"
          style={{ backgroundColor: "rgba(231, 219, 204, 0.88)" }}
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          role="dialog"
          aria-modal="true"
          aria-label="Menú de navegación"
        >
          {/* Content — close is handled by floating ball in NavigationBar */}
          <div className="flex h-full">
            {/* Links */}
            <motion.div
              className="flex w-full md:w-[60%] flex-col justify-center px-8 md:px-16 lg:px-24"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <nav className="flex flex-col gap-3 md:gap-4">
                {menuLinks.map((link, i) => (
                  <motion.a
                    key={link.href}
                    ref={i === 0 ? firstLinkRef : undefined}
                    href={link.href}
                    onClick={(e) => {
                      e.preventDefault()
                      handleClick(link.href)
                    }}
                    variants={linkVariants}
                    className="landing-focus text-4xl md:text-6xl lg:text-7xl font-bold text-[#27282E]/80 hover:text-[#27282E] transition-colors duration-300 leading-tight py-2"
                  >
                    {link.label}
                  </motion.a>
                ))}
              </nav>
            </motion.div>

            {/* Right side — branding */}
            <div className="hidden md:flex w-[40%] flex-col justify-between p-16">
              <div className="flex justify-end">
                <Image
                  src="/landing/icon-dark.png"
                  alt=""
                  width={80}
                  height={80}
                  className="w-16 h-16 object-contain opacity-20"
                />
              </div>
              <div className="text-[#27282E]/40">
                <Image
                  src="/landing/logo-recortado.png"
                  alt="Pastry"
                  width={160}
                  height={160}
                  className="w-32 h-auto object-contain opacity-30 mb-6"
                />
                <p className="text-sm mb-2">Pastry &copy; 2025</p>
                <p className="text-sm">Panadería congelada premium — Colombia</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
