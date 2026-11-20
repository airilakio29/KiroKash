/**
 * Consistent Malaysian Ringgit (RM) currency formatter across KampusKash.
 * Always formats with thousands separator and 2 decimal places: e.g. "RM 1,471.50".
 */
const RM_NUMBER_FORMATTER = new Intl.NumberFormat('en-MY', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export function formatRM(value, { showSign = false, spaceAfterPrefix = true } = {}) {
  const num = Number(value);
  const safe = Number.isFinite(num) ? num : 0;
  const absFormatted = RM_NUMBER_FORMATTER.format(Math.abs(safe));
  const prefix = spaceAfterPrefix ? 'RM ' : 'RM';
  if (safe < 0) {
    return `-${prefix}${absFormatted}`;
  }
  if (showSign && safe > 0) {
    return `+${prefix}${absFormatted}`;
  }
  return `${prefix}${absFormatted}`;
}

export function formatRMNumber(value) {
  const num = Number(value);
  const safe = Number.isFinite(num) ? num : 0;
  return RM_NUMBER_FORMATTER.format(safe);
}
