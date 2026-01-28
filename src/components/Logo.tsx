import React from 'react'
import Image from 'next/image'

interface LogoProps {
  variant?: 'full' | 'header' | 'icon'
  className?: string
  width?: number
  height?: number
}

export default function Logo({ 
  variant = 'header', 
  className = '',
  width,
  height 
}: LogoProps) {
  const logoSrc = {
    full: '/assets/logo-full.svg',
    header: '/assets/logo-header.svg',
    icon: '/assets/logo-icon.svg',
  }

  const defaultDimensions = {
    full: { width: 400, height: 120 },
    header: { width: 180, height: 48 },
    icon: { width: 512, height: 512 },
  }

  const dimensions = {
    width: width || defaultDimensions[variant].width,
    height: height || defaultDimensions[variant].height,
  }

  return (
    <Image
      src={logoSrc[variant]}
      alt="FusionEMS Quantum logo"
      width={dimensions.width}
      height={dimensions.height}
      className={className}
      priority
      aria-label="FusionEMS Quantum logo"
    />
  )
}
