/**
 * DCA 2026 Payment Standards — Georgia HCV Program
 * Covers DCA Northern and Southern regions (666 zip codes, 150 counties)
 *
 * Local PHA data (Cobb/Marietta HA, DeKalb/HADC) from HUD 2026 SAFMRs
 *
 * ps array index = bedroom count (0br = index 0, 1br = index 1, etc.)
 */
import PS_DATA from '../data/paymentStandards.json'
import LOCAL_PHA_DATA from '../data/localPhaStandards.json'

/**
 * Look up the payment standard for a zip code and bedroom count.
 * Checks local PHA data first (Cobb/DeKalb), then DCA regional data.
 *
 * @param {string} zip - 5-digit zip code
 * @param {number} bedrooms - 0 through 4 (local PHA); 0 through 7 (DCA)
 * @returns {{ county: string, pha: string, phaName: string, maxRent: number, source: string } | null}
 */
export function getPaymentStandard(zip, bedrooms) {
  const z = String(zip).trim()

  // 1. Check local PHA data (Cobb/Marietta HA, DeKalb/HADC — HUD SAFMR)
  const local = LOCAL_PHA_DATA[z]
  if (local) {
    const maxRent = local.ps[bedrooms] ?? null
    if (maxRent === null) return null
    return {
      county: local.county,
      pha: local.pha,
      phaName: local.phaName,
      regionLabel: local.phaName,
      maxRent,
      source: 'safmr',
    }
  }

  // 2. Fall back to DCA regional data
  const entry = PS_DATA[z]
  if (!entry) return null
  const maxRent = entry.ps[bedrooms] ?? null
  if (maxRent === null) return null
  return {
    county: entry.county,
    pha: entry.region === 'N' ? 'DCA_N' : 'DCA_S',
    phaName: entry.region === 'N' ? 'Georgia DCA — Northern Region' : 'Georgia DCA — Southern Region',
    region: entry.region,
    regionLabel: entry.region === 'N' ? 'DCA Northern' : 'DCA Southern',
    maxRent,
    source: 'dca',
  }
}

/**
 * Check if a given rent is within the payment standard.
 * Returns null if zip is not found in any data source.
 *
 * @param {string} zip
 * @param {number} bedrooms
 * @param {number} rent - monthly rent amount
 * @returns {{ withinStandard: boolean, maxRent: number, county: string, phaName: string } | null}
 */
export function checkRentEligibility(zip, bedrooms, rent) {
  const ps = getPaymentStandard(zip, bedrooms)
  if (!ps) return null
  return {
    ...ps,
    withinStandard: rent <= ps.maxRent,
    overBy: rent > ps.maxRent ? rent - ps.maxRent : 0,
  }
}

/**
 * Local PHA jurisdictions — these have their own payment standards
 * not included in the DCA data.
 */
export const LOCAL_PHAS = {
  AHA: {
    name: 'Atlanta Housing Authority',
    label: 'AHA',
    cities: ['Atlanta', 'East Point'],
    note: 'Payment standards set by AHA directly',
  },
  COBB: {
    name: 'Cobb County Housing Authority',
    label: 'Cobb County HA',
    note: 'Payment standards set by Cobb County HA',
  },
  DEKALB: {
    name: 'DeKalb County Housing Authority',
    label: 'DeKalb County HA',
    note: 'Payment standards set by DeKalb County HA',
  },
  ALBANY: {
    name: 'Albany/Dougherty Housing Authority',
    label: 'Albany/Dougherty HA',
    note: 'Payment standards set by Albany HA',
  },
  SUMTER: {
    name: 'Sumter County Housing Authority',
    label: 'Sumter County HA',
    note: 'Payment standards set by Sumter HA',
  },
}

/**
 * All Housing Authorities available for tenant signup and landlord listing.
 */
export const HOUSING_AUTHORITIES = [
  { value: 'AHA', label: 'Atlanta Housing Authority (AHA)', type: 'local' },
  { value: 'COBB', label: 'Cobb County Housing Authority', type: 'local' },
  { value: 'DEKALB', label: 'DeKalb County Housing Authority', type: 'local' },
  { value: 'DCA_N', label: 'Georgia DCA — Northern Region', type: 'dca', region: 'N' },
  { value: 'DCA_S', label: 'Georgia DCA — Southern Region', type: 'dca', region: 'S' },
  { value: 'ALBANY', label: 'Albany/Dougherty Housing Authority', type: 'local' },
  { value: 'SUMTER', label: 'Sumter County Housing Authority', type: 'local' },
  { value: 'OTHER', label: 'Other', type: 'other' },
]
