/**
 * POST /api/check-message
 *
 * Scans message content for payment solicitation patterns that indicate
 * potential rental fraud (per FTC guidance). Blocked messages are logged
 * as fraud alerts.
 *
 * Request body:
 *   { message: string, landlord_id?: string, property_id?: string }
 *
 * Response:
 *   { blocked: boolean, reason?: string }
 *
 * Required env vars:
 *   SUPABASE_SERVICE_ROLE_KEY
 *   VITE_SUPABASE_URL
 */

import { createClient } from '@supabase/supabase-js'

// ── Blocked patterns ─────────────────────────────────────────────────────────
// Each entry: { pattern: RegExp, reason: string, severity: string }
const BLOCKED_PATTERNS = [
  // Payment apps
  { pattern: /\$?cashtag|\bcash\s*app\b|\bcashtag\b/i,           reason: 'Cash App payment request', severity: 'high' },
  { pattern: /\bzelle\b/i,                                         reason: 'Zelle payment request',    severity: 'high' },
  { pattern: /\bvenmo\b/i,                                         reason: 'Venmo payment request',    severity: 'high' },
  { pattern: /\bpaypal\b.*(?:send|pay|transfer)/i,                 reason: 'PayPal payment request',   severity: 'medium' },
  { pattern: /\bchime\b.*(?:send|pay|transfer)/i,                  reason: 'Chime payment request',    severity: 'medium' },

  // Cryptocurrency
  { pattern: /\bbitcoin\b|\bbtc\b|\bethereum\b|\beth\b|\busdt\b|\bcrypto\b/i, reason: 'Cryptocurrency payment request', severity: 'critical' },
  { pattern: /\bwallet\s+address\b|\bcrypto\s+wallet\b/i,          reason: 'Crypto wallet instruction', severity: 'critical' },

  // Wire transfer / bank
  { pattern: /wire\s+transfer/i,                                   reason: 'Wire transfer instruction', severity: 'critical' },
  { pattern: /routing\s+(number|#)/i,                              reason: 'Bank routing number',       severity: 'critical' },
  { pattern: /account\s+(number|#)\b/i,                            reason: 'Bank account number',       severity: 'high' },
  { pattern: /western\s+union|moneygram/i,                         reason: 'Money order service',       severity: 'critical' },

  // Gift cards
  { pattern: /gift\s*card/i,                                       reason: 'Gift card payment request', severity: 'critical' },
  { pattern: /itunes\s*(card)?|amazon\s*(gift\s*card|gc)|google\s*play\s*(card)?/i, reason: 'Gift card', severity: 'critical' },

  // Pre-tour payment pressure
  { pattern: /pay\s+(before|prior\s+to)\s+(view|tour|see|visit)/i, reason: 'Pay before viewing', severity: 'high' },
  { pattern: /send\s+(money|payment|deposit).{0,30}(before|first|now|today|immediately)/i, reason: 'Upfront payment demand', severity: 'high' },
  { pattern: /hold.*unit.{0,30}(send|pay|transfer)/i,              reason: 'Holding fee via payment app', severity: 'high' },
  { pattern: /to\s+hold\s+the\s+(unit|apartment|property|place)/i, reason: 'Holding fee request', severity: 'medium' },

  // Off-platform contact pressure
  { pattern: /don['']t\s+use\s+(the\s+)?(app|platform|settleed)/i, reason: 'Off-platform communication pressure', severity: 'medium' },
  { pattern: /text\s+me\s+directly|contact\s+me\s+outside/i,       reason: 'Off-platform communication pressure', severity: 'low' },

  // Shortened / suspicious URLs (basic heuristic)
  { pattern: /\b(bit\.ly|tinyurl|t\.co|goo\.gl|ow\.ly|short\.link)\//i, reason: 'Shortened URL', severity: 'medium' },
]

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { message, landlord_id, property_id } = req.body || {}

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required' })
  }

  // ── Scan for blocked patterns ──
  let blocked = false
  let matchedReason = null
  let matchedSeverity = 'low'

  for (const { pattern, reason, severity } of BLOCKED_PATTERNS) {
    if (pattern.test(message)) {
      blocked = true
      matchedReason = reason
      matchedSeverity = severity
      break // Report on first match; don't expose all matches
    }
  }

  // ── Log fraud alert if blocked ──
  if (blocked) {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (supabaseUrl && serviceKey) {
      const supabase = createClient(supabaseUrl, serviceKey)
      await supabase.from('fraud_alerts').insert({
        alert_type:  'payment_language',
        severity:    matchedSeverity,
        landlord_id: landlord_id || null,
        property_id: property_id || null,
        details: {
          reason:   matchedReason,
          // Store only first 200 chars of flagged message — don't log full PII
          excerpt:  message.slice(0, 200),
        },
      }).catch(err => console.error('[check-message] Failed to log fraud alert:', err.message))
    }
  }

  return res.status(200).json({
    blocked,
    reason: blocked ? matchedReason : null,
  })
}
