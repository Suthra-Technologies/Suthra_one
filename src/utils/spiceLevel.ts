export const formatSpiceLevelLabel = (value?: string | null) => {
  if (!value) {
    return '';
  }

  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_');

  switch (normalized) {
    case 'mild':
      return 'Mild';
    case 'medium':
    case 'moderate':
      return 'Medium';
    case 'hot':
      return 'Hot';
    case 'very_hot':
    case 'extra_hot':
      return 'Very Hot';
    default:
      return value
        .split(/[_\s-]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
  }
};
