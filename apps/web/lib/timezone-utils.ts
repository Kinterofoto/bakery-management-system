/**
 * Timezone utilities for Lima/Bogotá (UTC-5)
 *
 * These utilities ensure all dates are handled in the local timezone (America/Lima, America/Bogota)
 * instead of UTC, preventing the 5-hour offset issue.
 */

const TIMEZONE = 'America/Lima' // Lima and Bogotá share the same timezone (UTC-5)

/**
 * Get current date in Lima/Bogotá timezone
 * @returns Date object in local timezone
 */
export function getCurrentLocalDate(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TIMEZONE }))
}

/**
 * Convert a date to Lima/Bogotá timezone
 * @param date - Date to convert (string, Date object, or timestamp)
 * @returns Date object in local timezone
 */
export function toLocalTimezone(date: string | Date | number): Date {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date

  // Get the date string in America/Lima timezone
  const options: Intl.DateTimeFormatOptions = {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }

  const formatter = new Intl.DateTimeFormat('en-US', options)
  const parts = formatter.formatToParts(dateObj)

  const getValue = (type: string) => parts.find(p => p.type === type)?.value || '0'

  const year = parseInt(getValue('year'))
  const month = parseInt(getValue('month')) - 1 // JavaScript months are 0-indexed
  const day = parseInt(getValue('day'))
  const hour = parseInt(getValue('hour'))
  const minute = parseInt(getValue('minute'))
  const second = parseInt(getValue('second'))

  return new Date(year, month, day, hour, minute, second)
}

/**
 * Format date as ISO string (YYYY-MM-DD) in local timezone
 * Used for date inputs and comparisons
 * @param date - Date to format (defaults to current date)
 * @returns ISO date string (YYYY-MM-DD)
 */
export function toLocalISODate(date?: string | Date | number): string {
  const localDate = date ? toLocalTimezone(date) : getCurrentLocalDate()
  const year = localDate.getFullYear()
  const month = String(localDate.getMonth() + 1).padStart(2, '0')
  const day = String(localDate.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Format date as ISO string with time (YYYY-MM-DDTHH:mm:ss) in local timezone
 * Used for timestamps and database operations
 * @param date - Date to format (defaults to current date)
 * @returns ISO datetime string
 */
export function toLocalISODateTime(date?: string | Date | number): string {
  const localDate = date ? toLocalTimezone(date) : getCurrentLocalDate()
  const year = localDate.getFullYear()
  const month = String(localDate.getMonth() + 1).padStart(2, '0')
  const day = String(localDate.getDate()).padStart(2, '0')
  const hours = String(localDate.getHours()).padStart(2, '0')
  const minutes = String(localDate.getMinutes()).padStart(2, '0')
  const seconds = String(localDate.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
}

/**
 * Get tomorrow's date in local timezone
 * @returns ISO date string for tomorrow
 */
export function getTomorrowLocalDate(): string {
  const tomorrow = getCurrentLocalDate()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return toLocalISODate(tomorrow)
}

/**
 * Get next Monday's date in local timezone
 * @returns ISO date string for next Monday
 */
export function getNextMondayLocalDate(): string {
  const today = getCurrentLocalDate()
  const dayOfWeek = today.getDay()
  const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 7 : 8 - dayOfWeek
  const nextMonday = new Date(today)
  nextMonday.setDate(today.getDate() + daysUntilMonday)
  return toLocalISODate(nextMonday)
}

/**
 * Get date range for next week in local timezone
 * @returns Object with 'from' and 'to' ISO date strings
 */
export function getNextWeekLocalDateRange(): { from: string; to: string } {
  const today = getCurrentLocalDate()
  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)
  return {
    from: toLocalISODate(today),
    to: toLocalISODate(nextWeek)
  }
}

/**
 * Compare two dates (date only, ignoring time)
 * @param date1 - First date to compare
 * @param date2 - Second date to compare
 * @returns true if dates are the same day
 */
export function isSameLocalDate(date1: string | Date | number, date2: string | Date | number): boolean {
  return toLocalISODate(date1) === toLocalISODate(date2)
}

/**
 * Check if a date is within a range (inclusive)
 * @param date - Date to check
 * @param from - Start of range
 * @param to - End of range (optional)
 * @returns true if date is within range
 */
export function isDateInLocalRange(
  date: string | Date | number,
  from: string | Date | number,
  to?: string | Date | number
): boolean {
  const dateStr = toLocalISODate(date)
  const fromStr = toLocalISODate(from)

  if (!to) {
    return dateStr >= fromStr
  }

  const toStr = toLocalISODate(to)
  return dateStr >= fromStr && dateStr <= toStr
}
