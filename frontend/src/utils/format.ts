// Formateo de presentación. Los importes llegan del backend como string decimal
// en EUR y se pintan tal cual: la conversión de divisa es otra capa (spec 04).

const LOCALE = "es-ES";

// Los formateadores de Intl son caros de construir y se reusan en cada fila del
// historial, así que se cachean por divisa en vez de crearlos en cada render.
const moneyFormatters = new Map<string, Intl.NumberFormat>();

function moneyFormatter(currency: string): Intl.NumberFormat {
  let formatter = moneyFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, { style: "currency", currency });
    moneyFormatters.set(currency, formatter);
  }
  return formatter;
}

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  dateStyle: "medium",
  timeStyle: "short",
});

const percentFormatter = new Intl.NumberFormat(LOCALE, {
  style: "percent",
  maximumFractionDigits: 2,
});

/** Importe con el símbolo de su divisa. Admite el string decimal del backend ("140.00"). */
export function formatMoney(amount: string | number, currency: string): string {
  return moneyFormatter(currency).format(Number(amount));
}

/** Tasa persistida ("0.21") o calculada (0.21) como porcentaje ("21 %"). */
export function formatRate(rate: string | number): string {
  return percentFormatter.format(Number(rate));
}

/**
 * `created_at` ISO en UTC a fecha local legible. El valor real trae microsegundos
 * ("2026-07-16T14:18:13.561769Z"): `Date` los admite, así que no se recorta.
 */
export function formatDateTime(iso: string): string {
  return dateFormatter.format(new Date(iso));
}
