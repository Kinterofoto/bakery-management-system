"use client"

import { useEffect, useRef, useCallback } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { X } from "lucide-react"

const menuLinks = [
  { label: "Productos", href: "#productos" },
  { label: "Nosotros", href: "#manifesto" },
  { label: "Compromiso", href: "#compromisos" },
  { label: "Contacto", href: "#contacto" },
  { label: "FAQ", href: "#faq" },
]

const menuVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.2 },
  },
  exit: { opacity: 0, transition: { duration: 0.3 } },
}

const linkVariants = {
  hidden: { x: -60, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
  exit: { x: -30, opacity: 0, transition: { duration: 0.2 } },
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
  const closeRef = useRef<HTMLButtonElement>(null)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      // Focus trap
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
      setTimeout(() => firstLinkRef.current?.focus(), 300)
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
    }, 400)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          className="fixed inset-0 z-50 bg-[#0A0A0A] flex"
          variants={menuVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          role="dialog"
          aria-modal="true"
          aria-label="Menú de navegación"
        >
          {/* Left side - Links (60%) */}
          <div className="flex w-full md:w-[60%] flex-col justify-center px-8 md:px-16 lg:px-24">
            <nav className="flex flex-col gap-4">
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
                  className="landing-focus text-4xl md:text-6xl lg:text-7xl font-bold text-white/80 hover:text-pastry-yellow transition-colors duration-300 leading-tight py-2"
                >
                  {link.label}
                </motion.a>
              ))}
            </nav>
          </div>

          {/* Right side - Info (40%) */}
          <div className="hidden md:flex w-[40%] flex-col justify-end p-16 text-white/40">
            <p className="text-sm mb-2">Pastry &copy; 2024</p>
            <p className="text-sm">Panadería congelada premium — Colombia</p>
          </div>

          {/* Close button */}
          <button
            ref={closeRef}
            onClick={onClose}
            className="landing-focus absolute top-6 right-6 text-white/60 hover:text-white transition-colors"
            aria-label="Cerrar menú"
          >
            <X className="h-8 w-8" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
