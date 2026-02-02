/**
 * Platform Detection Utilities
 *
 * Centralizes browser/device detection logic used across the notification system.
 * Used by: notification modals, push toggle, settings guide, PWA install prompts.
 */

export interface PlatformInfo {
  /** iOS device (iPhone, iPad, iPod) */
  isIOS: boolean
  /** Safari browser (not Chrome/Firefox on iOS) */
  isSafari: boolean
  /** iOS Safari specifically (requires PWA for push) */
  isIOSSafari: boolean
  /** PWA is installed (standalone mode) */
  isPWAInstalled: boolean
  /** Can receive push notifications without PWA installation */
  canPushWithoutPWA: boolean
}

/**
 * Default platform info for SSR or when window is not available
 */
export const DEFAULT_PLATFORM_INFO: PlatformInfo = {
  isIOS: false,
  isSafari: false,
  isIOSSafari: false,
  isPWAInstalled: false,
  canPushWithoutPWA: true
}

/**
 * Detect platform information for notification/PWA features
 *
 * Detection logic:
 * - iOS: User agent contains iPad/iPhone/iPod (excludes IE mobile)
 * - Safari: Not Chrome or Firefox disguised as Safari on iOS
 * - PWA Installed: display-mode: standalone OR navigator.standalone (iOS)
 * - iOS Safari non-PWA: iOS + Safari + not installed = needs PWA for push
 * - Can push without PWA: All platforms except iOS Safari non-PWA
 *
 * @returns PlatformInfo object with detection results
 */
export function detectPlatform(): PlatformInfo {
  if (typeof window === 'undefined') {
    return DEFAULT_PLATFORM_INFO
  }

  const ua = navigator.userAgent

  // iOS detection (iPhone, iPad, iPod) - exclude MSStream for IE mobile
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream

  // Safari detection (not Chrome/Firefox on iOS which include "Safari" in UA)
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua)

  // PWA installed check (standalone mode)
  const isPWAInstalled = window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as any).standalone === true

  // iOS Safari specifically (non-PWA mode)
  const isIOSSafari = isIOS && isSafari && !isPWAInstalled

  // Can push without PWA: all browsers EXCEPT iOS Safari non-PWA
  // iOS requires PWA to be installed for push notifications (since iOS 16.4)
  const canPushWithoutPWA = !isIOS || isPWAInstalled

  return {
    isIOS,
    isSafari,
    isIOSSafari,
    isPWAInstalled,
    canPushWithoutPWA
  }
}

/**
 * Extended platform detection for notification settings guide
 * Detects specific browsers/OS for UI instructions
 */
export interface ExtendedPlatformInfo extends PlatformInfo {
  isAndroid: boolean
  isChrome: boolean
  isEdge: boolean
  isFirefox: boolean
}

/**
 * Detect extended platform info for settings guide
 */
export function detectExtendedPlatform(): ExtendedPlatformInfo {
  const baseInfo = detectPlatform()

  if (typeof window === 'undefined') {
    return {
      ...baseInfo,
      isAndroid: false,
      isChrome: false,
      isEdge: false,
      isFirefox: false
    }
  }

  const ua = navigator.userAgent

  const isAndroid = /android/i.test(ua)
  const isChrome = /chrome|chromium|crios/i.test(ua) && !/edge|edgios|opr\//i.test(ua)
  const isEdge = /edg/i.test(ua)
  const isFirefox = /firefox|fxios/i.test(ua)

  return {
    ...baseInfo,
    isAndroid,
    isChrome,
    isEdge,
    isFirefox
  }
}
