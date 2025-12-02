'use client'

import { useEffect, useState, useRef } from 'react'

interface CountUpProps {
    end: number
    duration?: number
    suffix?: string
    prefix?: string
}

export function CountUp({ end, duration = 2000, suffix = '', prefix = '' }: CountUpProps) {
    const [count, setCount] = useState(0)
    const countRef = useRef<HTMLSpanElement>(null)
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true)
                    observer.disconnect()
                }
            },
            { threshold: 0.1 }
        )

        if (countRef.current) {
            observer.observe(countRef.current)
        }

        return () => observer.disconnect()
    }, [])

    useEffect(() => {
        if (!isVisible) return

        let startTime: number | null = null
        let animationFrameId: number

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp
            const progress = timestamp - startTime
            const percentage = Math.min(progress / duration, 1)

            // Easing function for smooth animation (easeOutExpo)
            const easeOutExpo = (x: number): number => {
                return x === 1 ? 1 : 1 - Math.pow(2, -10 * x)
            }

            setCount(Math.floor(easeOutExpo(percentage) * end))

            if (progress < duration) {
                animationFrameId = requestAnimationFrame(animate)
            } else {
                setCount(end)
            }
        }

        animationFrameId = requestAnimationFrame(animate)

        return () => cancelAnimationFrame(animationFrameId)
    }, [isVisible, end, duration])

    return (
        <span ref={countRef}>
            {prefix}{count}{suffix}
        </span>
    )
}
