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

// Converts a "YYYY-MM-DD" date + "HH:mm" wall-clock time that the customer picked
// (always meant as America/New_York, per the "Preferred Time (EDT)" label) into the
// correct UTC ISO instant. Plain `new Date(dateStr + 'T' + timeStr)` is NOT safe here:
// it parses in the browser's/server's local timezone, which silently corrupts the
// instant for anyone not physically in US Eastern time.
export const easternWallClockToUtcIso = (dateString: string, timeString: string): string => {
  const [year, month, day] = dateString.split('-').map(Number);
  const [hour, minute] = timeString.split(':').map(Number);

  // Start from a UTC guess, then measure how far that guess lands from the intended
  // wall-clock time when viewed in America/New_York, and correct for the difference.
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: EASTERN_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(guess);
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value);

  const asIfUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  const diffMs = guess.getTime() - asIfUtc;

  return new Date(guess.getTime() + diffMs).toISOString();
};
