import type { Metadata } from "next"
import { Fraunces, IBM_Plex_Mono, Inter, Outfit } from "next/font/google"
import { Providers } from "@/components/providers"
import { SimBanner } from "@/components/sim-banner"
import "./globals.css"

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
})

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
})

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-console",
})

const plex = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex",
})

export const metadata: Metadata = {
  title: {
    default: "Skybench — local cloud lab",
    template: "%s · Skybench",
  },
  description:
    "A browser lab that simulates AWS, Azure, and DigitalOcean for a cloud computing assignment. No paid accounts.",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${fraunces.variable} ${plex.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="flex min-h-dvh flex-col">
        <Providers>
          <SimBanner />
          {children}
        </Providers>
      </body>
    </html>
  )
}
