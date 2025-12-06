"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"

// ============================================================================
// TYPES
// ============================================================================

interface SparklineProps {
    /** Array of numeric values to display */
    data: number[]
    /** Width of the SVG in pixels */
    width?: number
    /** Height of the SVG in pixels */
    height?: number
    /** Stroke color for the line (can be any valid CSS color or Tailwind class) */
    strokeColor?: string
    /** Fill color for the area under the line */
    fillColor?: string
    /** Whether to show the filled area under the line */
    showFill?: boolean
    /** Stroke width in pixels */
    strokeWidth?: number
    /** Additional CSS classes */
    className?: string
    /** Show a dot on the last data point */
    showEndDot?: boolean
    /** Whether to animate the sparkline on mount */
    animated?: boolean
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function normalizeData(data: number[]): number[] {
    if (data.length === 0) return []
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1 // Avoid division by zero
    return data.map(value => (value - min) / range)
}

function generatePath(
    normalizedData: number[],
    width: number,
    height: number,
    padding: number = 2
): string {
    if (normalizedData.length < 2) return ""

    const usableWidth = width - padding * 2
    const usableHeight = height - padding * 2
    const step = usableWidth / (normalizedData.length - 1)

    const points = normalizedData.map((value, index) => ({
        x: padding + index * step,
        // Invert Y because SVG coordinates start from top
        y: padding + usableHeight * (1 - value)
    }))

    // Create smooth curved path using quadratic bezier curves
    let path = `M ${points[0].x},${points[0].y}`

    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1]
        const curr = points[i]
        const midX = (prev.x + curr.x) / 2
        path += ` Q ${prev.x},${prev.y} ${midX},${(prev.y + curr.y) / 2}`
    }

    // Final segment to last point
    const last = points[points.length - 1]
    path += ` T ${last.x},${last.y}`

    return path
}

function generateAreaPath(
    normalizedData: number[],
    width: number,
    height: number,
    padding: number = 2
): string {
    if (normalizedData.length < 2) return ""

    const linePath = generatePath(normalizedData, width, height, padding)
    const usableWidth = width - padding * 2

    // Close the path to create a filled area
    return `${linePath} L ${padding + usableWidth},${height - padding} L ${padding},${height - padding} Z`
}

// ============================================================================
// COMPONENT
// ============================================================================

export function Sparkline({
    data,
    width = 80,
    height = 24,
    strokeColor = "currentColor",
    fillColor,
    showFill = false,
    strokeWidth = 1.5,
    className,
    showEndDot = true,
    animated = true
}: SparklineProps) {
    const normalizedData = useMemo(() => normalizeData(data), [data])
    const linePath = useMemo(
        () => generatePath(normalizedData, width, height),
        [normalizedData, width, height]
    )
    const areaPath = useMemo(
        () => showFill ? generateAreaPath(normalizedData, width, height) : "",
        [normalizedData, width, height, showFill]
    )

    // Calculate last point position for end dot
    const lastPoint = useMemo(() => {
        if (normalizedData.length === 0) return null
        const padding = 2
        const usableWidth = width - padding * 2
        const usableHeight = height - padding * 2
        const step = usableWidth / (normalizedData.length - 1)
        const lastIndex = normalizedData.length - 1
        return {
            x: padding + lastIndex * step,
            y: padding + usableHeight * (1 - normalizedData[lastIndex])
        }
    }, [normalizedData, width, height])

    // Calculate trend (up, down, stable)
    const trend = useMemo(() => {
        if (data.length < 2) return 'stable'
        const first = data[0]
        const last = data[data.length - 1]
        const change = ((last - first) / (first || 1)) * 100
        if (change > 5) return 'up'
        if (change < -5) return 'down'
        return 'stable'
    }, [data])

    if (data.length < 2) {
        return (
            <div className={cn("flex items-center justify-center", className)} style={{ width, height }}>
                <span className="text-xs text-muted-foreground">—</span>
            </div>
        )
    }

    // Determine colors based on trend if not explicitly set
    const effectiveStrokeColor = strokeColor === "currentColor"
        ? trend === 'up'
            ? "rgb(34, 197, 94)" // green-500
            : trend === 'down'
                ? "rgb(239, 68, 68)" // red-500
                : "rgb(148, 163, 184)" // slate-400
        : strokeColor

    const effectiveFillColor = fillColor || (
        trend === 'up'
            ? "rgba(34, 197, 94, 0.1)"
            : trend === 'down'
                ? "rgba(239, 68, 68, 0.1)"
                : "rgba(148, 163, 184, 0.1)"
    )

    return (
        <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className={cn(
                "overflow-visible",
                animated && "animate-in fade-in duration-500",
                className
            )}
            role="img"
            aria-label={`Sparkline showing ${trend} trend`}
        >
            {/* Filled area under the line */}
            {showFill && areaPath && (
                <path
                    d={areaPath}
                    fill={effectiveFillColor}
                    className={animated ? "animate-in fade-in duration-700" : ""}
                />
            )}

            {/* Main line */}
            <path
                d={linePath}
                fill="none"
                stroke={effectiveStrokeColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                className={animated ? "animate-in fade-in duration-500" : ""}
            />

            {/* End dot */}
            {showEndDot && lastPoint && (
                <circle
                    cx={lastPoint.x}
                    cy={lastPoint.y}
                    r={2.5}
                    fill={effectiveStrokeColor}
                    className={animated ? "animate-in zoom-in duration-300 delay-300" : ""}
                />
            )}
        </svg>
    )
}

// ============================================================================
// PRESET VARIANTS
// ============================================================================

export function SparklineSuccess(props: Omit<SparklineProps, 'strokeColor' | 'fillColor'>) {
    return (
        <Sparkline
            {...props}
            strokeColor="rgb(34, 197, 94)"
            fillColor="rgba(34, 197, 94, 0.15)"
            showFill
        />
    )
}

export function SparklineDanger(props: Omit<SparklineProps, 'strokeColor' | 'fillColor'>) {
    return (
        <Sparkline
            {...props}
            strokeColor="rgb(239, 68, 68)"
            fillColor="rgba(239, 68, 68, 0.15)"
            showFill
        />
    )
}

export function SparklineWarning(props: Omit<SparklineProps, 'strokeColor' | 'fillColor'>) {
    return (
        <Sparkline
            {...props}
            strokeColor="rgb(245, 158, 11)"
            fillColor="rgba(245, 158, 11, 0.15)"
            showFill
        />
    )
}

export function SparklinePrimary(props: Omit<SparklineProps, 'strokeColor' | 'fillColor'>) {
    return (
        <Sparkline
            {...props}
            strokeColor="rgb(59, 130, 246)"
            fillColor="rgba(59, 130, 246, 0.15)"
            showFill
        />
    )
}
