'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface EcommerceSearchContextType {
  isSearchOpen: boolean
  setIsSearchOpen: (open: boolean) => void
  searchTerm: string
  setSearchTerm: (term: string) => void
}

const EcommerceSearchContext = createContext<EcommerceSearchContextType>({
  isSearchOpen: false,
  setIsSearchOpen: () => {},
  searchTerm: '',
  setSearchTerm: () => {},
})

export function EcommerceSearchProvider({ children }: { children: ReactNode }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  return (
    <EcommerceSearchContext.Provider value={{ isSearchOpen, setIsSearchOpen, searchTerm, setSearchTerm }}>
      {children}
    </EcommerceSearchContext.Provider>
  )
}

export function useEcommerceSearch() {
  return useContext(EcommerceSearchContext)
}
