import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${Math.round(value / 1000)}K`;
  }
  return `$${value.toLocaleString()}`;
}

export function formatFullCurrency(value: number): string {
  return `$${value.toLocaleString('es-CO', { minimumFractionDigits: 0 })}`;
}

export function formatDate(dateString: string, formatStr: string = 'dd MMM'): string {
  const hasTime = dateString.includes('T') || dateString.includes(' ');
  let dateObj: Date;

  if (hasTime) {
    const utcString = dateString.endsWith('Z') ? dateString : dateString + 'Z';
    dateObj = new Date(utcString);
  } else {
    const parts = dateString.split('-').map((p) => parseInt(p, 10));
    dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
  }

  return format(dateObj, formatStr, { locale: es });
}

export function formatDateLong(dateString: string): string {
  return formatDate(dateString, "EEEE dd 'de' MMMM");
}

export function toLocalISODate(date?: Date): string {
  const d = date || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTomorrowLocalDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toLocalISODate(d);
}
