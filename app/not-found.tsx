import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center bg-[#efe6d6] px-4 py-16 text-[#221c16]">
      <div className="max-w-md">
        <h1 className="font-heading text-4xl">That page is not on the bench</h1>
        <p className="mt-3 text-sm leading-6 text-[#4d463c]">The lab has a bench, three consoles, a comparison, and the report.</p>
        <Link href="/" className="mt-4 inline-block text-sm font-medium underline underline-offset-4">
          Back to the bench
        </Link>
      </div>
    </div>
  )
}
