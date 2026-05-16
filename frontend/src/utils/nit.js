const NIT_DV_WEIGHTS = [71, 67, 59, 53, 47, 43, 41, 37, 29, 23, 19, 17, 13, 7, 3];

export const sanitizeNumeric = (value = '') =>
  String(value)
    .replace(/\D/g, '')
    .trim();

export const calculateNitVerificationDigit = (nit = '') => {
  const normalized = sanitizeNumeric(nit);
  if (!normalized) {
    return '';
  }

  const digits = normalized.slice(-NIT_DV_WEIGHTS.length);
  const startIndex = NIT_DV_WEIGHTS.length - digits.length;
  const total = digits.split('').reduce((sum, digit, index) => (
    sum + Number(digit) * NIT_DV_WEIGHTS[startIndex + index]
  ), 0);
  const remainder = total % 11;

  return String(remainder > 1 ? 11 - remainder : remainder);
};
