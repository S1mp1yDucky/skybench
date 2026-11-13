export function flash(message: string, tone: "success" | "error" = "success") {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent("skybench-flash", { detail: { message, tone } }))
}
