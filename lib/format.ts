export function usd(amount: number): string {
  if (!Number.isFinite(amount)) return "$0.00"
  if (amount > 0 && amount < 0.01) return `$${amount.toFixed(4)}`
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

export function hourlyLabel(amount: number): string {
  return `${usd(amount)}/hr`
}

export function formatPkt(ms: number): string {
  const clock = new Intl.DateTimeFormat("en-PK", {
    timeZone: "Asia/Karachi",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(ms)
  return `${clock} PKT`
}

export function meterLabel(ms: number): string {
  const minutes = ms / 60000
  if (minutes < 90) return `${Math.max(1, Math.round(minutes))} min`
  return `${(ms / 3600000).toFixed(1)} h`
}
