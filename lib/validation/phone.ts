const PHONE_RULES: Record<string, number> = {
  '+91': 10,
  '+1': 10,
  '+44': 10,
  '+61': 9,
  '+81': 10,
  '+971': 9,
  '+49': 10,
  '+33': 9,
  '+39': 10,
  '+94': 9,
  '+92': 10,
  '+880': 10,
}

const COUNTRY_CODES = Object.keys(PHONE_RULES)

export function validatePhone(value: string): boolean {
  if (!value) return false
  const trimmed = value.replace(/\s+/g, '')
  const code = COUNTRY_CODES.find((prefix) => trimmed.startsWith(prefix))
  if (!code) return false
  const number = trimmed.slice(code.length)
  if (!/^\d+$/.test(number)) return false
  const expected = PHONE_RULES[code]
  return number.length === expected
}

export function normalizePhone(value: string): string {
  return value.replace(/\s+/g, '')
}

export const NAME_REGEX = /^[A-Za-z][A-Za-z .'-]*$/
