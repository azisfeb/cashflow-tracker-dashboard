'use client'

import { Button } from '@/components/ui/button'
import { Eye, EyeOff } from 'lucide-react'
import { useNominalVisibility } from '@/components/layout/nominal-visibility-provider'

export function NominalToggle() {
  const { isHidden, toggleVisibility } = useNominalVisibility()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleVisibility}
      title={isHidden ? 'Tampilkan Nominal' : 'Sembunyikan Nominal'}
      aria-label={isHidden ? 'Tampilkan Nominal' : 'Sembunyikan Nominal'}
      className="h-8 w-8 text-muted-foreground hover:text-foreground"
    >
      {isHidden ? (
        <EyeOff className="h-4 w-4 text-amber-500" />
      ) : (
        <Eye className="h-4 w-4" />
      )}
    </Button>
  )
}
