"use client"

import Image from "next/image"

interface AuthLogoProps {
  className?: string
  width?: number
  height?: number
}

export default function AuthLogo({ className = "", width = 240, height = 72 }: AuthLogoProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Image
        src="/images/Logo/Logo_Seido_Color.png"
        alt="SEIDO"
        width={width}
        height={height}
        priority
        className="h-16 w-auto object-contain"
      />
    </div>
  )
}


