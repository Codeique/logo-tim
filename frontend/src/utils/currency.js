/**
 * Formats a numeric value as Serbian RSD currency.
 * @param {number|string} value - The amount to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} e.g. "1.500,00 RSD"
 */
export const formatCurrency = (value, decimals = 2) => {
  const num = Number(value) || 0;
  return `${num.toLocaleString('sr-RS', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} RSD`;
};
