// Demo slots are generated server-side in US Eastern Time (see demo-requests.service.ts).
// Format/label them explicitly so customers in other timezones aren't misled by the plain hour.
const EASTERN_TZ = 'America/New_York';

export const getEasternTzAbbreviation = (): string => {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: EASTERN_TZ, timeZoneName: 'short' }).formatToParts(new Date());
  return parts.find(p => p.type === 'timeZoneName')?.value || 'ET';
};

export const formatSlotLabel = (slot: string, tzAbbr: string): string => {
  const [hours, minutes] = slot.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${period} ${tzAbbr}`;
};
