/**
 * Calendar-date helpers.
 *
 * `Date.toISOString()` formats in UTC. Uzbekistan runs at UTC+5, so between
 * 00:00 and 05:00 local time `toISOString().substring(0, 10)` reports the
 * PREVIOUS day — which put attendance registers, enrolment dates and salary
 * advances on the wrong calendar day (and sometimes in the wrong month).
 * Always derive calendar dates from the local getFullYear/getMonth/getDate.
 */
export const toLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** Today's calendar date in the user's timezone, as YYYY-MM-DD. */
export const todayLocalDateString = (): string => toLocalDateString(new Date());
