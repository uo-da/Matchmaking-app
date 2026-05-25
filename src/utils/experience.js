const EXPERIENCE_MAX_YEARS = 20;

const normalizeExperienceYears = (value) => {
  const numeric = Number(value) || 0;
  if (numeric <= 0) {
    return 0;
  }
  return Math.min(EXPERIENCE_MAX_YEARS, Math.floor(numeric));
};

const formatExperienceYears = (value) => {
  const years = normalizeExperienceYears(value);
  if (years <= 0) {
    return '0年';
  }
  if (years >= EXPERIENCE_MAX_YEARS) {
    return `${EXPERIENCE_MAX_YEARS}年以上`;
  }
  return `${years}年`;
};

export { EXPERIENCE_MAX_YEARS, normalizeExperienceYears, formatExperienceYears };
