/**
 * POS embeds the spice level in the item display name (e.g. "Idly 🌶️ very_hot").
 * Strip the chili emoji (unprintable on thermal printers, renders as "??") and the
 * trailing spice token so the spice level only appears once — on its own line.
 */
export const stripSpiceFromName = (rawName?: string | null, spiceLevel?: string | null) => {
  let name = (rawName || '')
    .replace(/[<>]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ');
  const spice = spiceLevel ? String(spiceLevel) : '';
  if (spice) {
    const escaped = spice.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    name = name.replace(new RegExp('\\s*' + escaped + '\\s*$', 'i'), '');
  }
  return name.replace(/\s{2,}/g, ' ').trim();
};

export const formatSpiceLevelLabel = (value?: string | null) => {
  if (!value) {
    return '';
  }

  const normalized = value.trim()?.toLowerCase().replace(/[\s-]+/g, '_');

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
        .map((part) => part.charAt(0)?.toUpperCase() + part.slice(1)?.toLowerCase())
        .join(' ');
  }
};
