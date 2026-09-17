/**
 * Settleed — Centralized Platform Detection
 *
 * Use these helpers anywhere you need to know whether the app is running
 * as a native iOS/Android app (via Capacitor) or as a regular web page.
 *
 * DO NOT scatter `window.Capacitor.getPlatform()` throughout the codebase.
 * Import from here instead.
 *
 * At runtime:
 *   - On web:     window.Capacitor is undefined → isNative = false
 *   - On iOS:     window.Capacitor.getPlatform() === 'ios'
 *   - On Android: window.Capacitor.getPlatform() === 'android'
 *
 * These values are resolved once at module load time and are safe to
 * import anywhere in the React tree.
 */

const cap = typeof window !== 'undefined' ? window.Capacitor : undefined

/**
 * True when running inside a Capacitor native binary (iOS or Android).
 * False in any web browser.
 */
export const isNative = cap?.isNativePlatform?.() ?? false

/**
 * True when running on an iOS device via Capacitor.
 */
export const isIOS = cap?.getPlatform?.() === 'ios'

/**
 * True when running on an Android device via Capacitor.
 */
export const isAndroid = cap?.getPlatform?.() === 'android'

/**
 * True when running as a standard web page in any browser.
 */
export const isWeb = !isNative

/**
 * Current platform as a string.
 * @returns {'ios' | 'android' | 'web'}
 */
export function getPlatform() {
  if (isIOS) return 'ios'
  if (isAndroid) return 'android'
  return 'web'
}

/**
 * === USAGE EXAMPLES ===
 *
 * Hide in-app purchases on iOS (Apple IAP compliance):
 *   import { isIOS } from '../lib/platform'
 *   {!isIOS && <ConsultationPayButton />}
 *
 * Show native-specific UI:
 *   import { isNative } from '../lib/platform'
 *   {isNative && <NativePushPrompt />}
 *
 * Conditionally load a native plugin:
 *   import { isNative, isIOS } from '../lib/platform'
 *   if (isIOS) { const { PushNotifications } = await import('@capacitor/push-notifications') }
 *
 * Platform-aware analytics label:
 *   import { getPlatform } from '../lib/platform'
 *   trackEvent('app_open', { platform: getPlatform() })
 */
