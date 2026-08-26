'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

interface NominalVisibilityContextType {
  isHidden: boolean
  toggleVisibility: () => void
  setIsHidden: (hidden: boolean) => void
}

const NominalVisibilityContext = createContext<NominalVisibilityContextType>({
  isHidden: false,
  toggleVisibility: () => {},
  setIsHidden: () => {},
})

const STORAGE_KEY = 'hide_nominals'

export function NominalVisibilityProvider({ children }: { children: ReactNode }) {
  const [isHidden, setIsHiddenState] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'true') {
      setIsHiddenState(true)
    }
  }, [])

  const setIsHidden = (value: boolean) => {
    setIsHiddenState(value)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(value))
    }
  }

  const toggleVisibility = () => {
    setIsHidden(!isHidden)
  }

  return (
    <NominalVisibilityContext.Provider
      value={{
        isHidden: isMounted ? isHidden : false,
        toggleVisibility,
        setIsHidden,
      }}
    >
      {children}
    </NominalVisibilityContext.Provider>
  )
}

export function useNominalVisibility() {
  return useContext(NominalVisibilityContext)
}
