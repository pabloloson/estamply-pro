import Image from 'next/image'

interface EstamplyLogoProps {
  /** 'icon' = stamp only, 'full' = stamp + text, 'icon-small' = tiny stamp for inline use */
  variant?: 'icon' | 'full' | 'icon-small'
  /** Size in pixels (applied to the icon; full logo scales proportionally) */
  size?: number
  /** Optional className for the wrapper */
  className?: string
}

/**
 * Reusable Estamply logo component.
 * Uses the turquoise brand stamp icon from /public/logo-icon.png
 * and the full logo with text from /public/logo-full.png.
 */
export function EstamplyLogo({ variant = 'icon', size = 32, className = '' }: EstamplyLogoProps) {
  if (variant === 'full') {
    // Full logo: stamp icon + "estamply" text
    // Original aspect ratio of logo-full.png is approximately 4:1
    const height = size
    const width = Math.round(height * 4)
    return (
      <Image
        src="/logo-full.png"
        alt="Estamply"
        width={width}
        height={height}
        className={className}
        priority
        style={{ height: size, width: 'auto' }}
      />
    )
  }

  if (variant === 'icon-small') {
    return (
      <Image
        src="/logo-icon.png"
        alt="Estamply"
        width={size}
        height={size}
        className={className}
        style={{ height: size, width: size }}
      />
    )
  }

  // Default: icon only
  return (
    <Image
      src="/logo-icon.png"
      alt="Estamply"
      width={size}
      height={size}
      className={className}
      priority
      style={{ height: size, width: size }}
    />
  )
}
