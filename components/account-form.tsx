"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function AccountForm({
  heading,
  lede,
  ack,
  emailDefault,
  showStudent,
  onCreate,
}: {
  heading: string
  lede: string
  ack: string
  emailDefault: string
  showStudent?: boolean
  onCreate: (input: { email: string; student: boolean }) => { error?: string }
}) {
  const [email, setEmail] = useState(emailDefault)
  const [phone, setPhone] = useState("+92 300 0000000")
  const [password, setPassword] = useState("")
  const [sent, setSent] = useState<string | null>(null)
  const [code, setCode] = useState("")
  const [agreed, setAgreed] = useState(false)
  const [student, setStudent] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter an email address with a name and a domain.")
      return
    }
    if (phone.replace(/\D/g, "").length < 10) {
      setError("Enter a phone number so the recording shows the verification step. It is not stored.")
      return
    }
    if (password.length < 8) {
      setError("Use at least 8 characters. The password is checked for length and then discarded.")
      return
    }
    if (!sent) {
      setError("Send the lab code first. Nothing is texted to a real phone.")
      return
    }
    if (code.trim() !== sent) {
      setError("That code does not match the one on the lab switchboard.")
      return
    }
    if (!agreed) {
      setError("Confirm the billing note before creating the lab account.")
      return
    }
    const outcome = onCreate({ email: email.trim(), student })
    setPassword("")
    setError(outcome.error ?? null)
  }

  return (
    <form onSubmit={submit} className="mx-auto grid w-full max-w-xl gap-4" noValidate>
      <div>
        <h1 className="font-heading text-3xl text-[#1c1915]">{heading}</h1>
        <p className="mt-2 text-sm leading-6 text-[#4d463c]">{lede}</p>
      </div>
      <Field id="lab-email" label="Email">
        <Input
          id="lab-email"
          type="email"
          autoComplete="off"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </Field>
      <Field id="lab-phone" label="Phone (discarded)">
        <Input
          id="lab-phone"
          type="tel"
          autoComplete="off"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
      </Field>
      <Field id="lab-password" label="Password (discarded)">
        <Input
          id="lab-password"
          type="password"
          autoComplete="new-password"
          name="skybench-lab-password"
          data-1p-ignore="true"
          data-lpignore="true"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </Field>
      <div className="rounded-xl border border-dashed border-[#c8bba6] bg-[#f7f1e6] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium tracking-[0.14em] text-[#6d6256] uppercase">Lab switchboard</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSent(String(Math.floor(100000 + Math.random() * 900000)))
              setError(null)
            }}
          >
            {sent ? "Send a new code" : "Send lab code"}
          </Button>
        </div>
        {sent ? (
          <p className="mt-2 text-sm text-[#1c1915]">
            Your code is <span className="font-mono text-lg">{sent}</span>. No SMS was sent.
          </p>
        ) : (
          <p className="mt-2 text-sm text-[#6d6256]">The code appears here. A real provider would text it.</p>
        )}
        <Label htmlFor="lab-code" className="mt-3">
          Verification code
        </Label>
        <Input
          id="lab-code"
          inputMode="numeric"
          autoComplete="off"
          className="mt-1.5"
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
      </div>
      {showStudent ? (
        <label className="flex items-start gap-2 text-sm leading-5 text-[#1c1915]">
          <input
            type="checkbox"
            className="mt-1"
            checked={student}
            onChange={(event) => setStudent(event.target.checked)}
          />
          <span>Use the Azure for Students path. On a real tenant this is the offer that usually skips a card.</span>
        </label>
      ) : null}
      <label className="flex items-start gap-2 text-sm leading-5 text-[#1c1915]">
        <input
          type="checkbox"
          className="mt-1"
          checked={agreed}
          onChange={(event) => setAgreed(event.target.checked)}
        />
        <span>{ack}</span>
      </label>
      {error ? (
        <p role="alert" className="text-sm text-[#8a2e24]">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="h-10">
        Create lab account
      </Button>
    </form>
  )
}

export function SignInCard({
  email,
  onSignIn,
}: {
  email: string
  onSignIn: () => { error?: string }
}) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (password.length < 8) {
      setError("Use at least 8 characters. The password is discarded and never becomes a credential.")
      return
    }
    setPassword("")
    const outcome = onSignIn()
    setError(outcome.error ?? null)
  }

  return (
    <form onSubmit={submit} className="mx-auto grid w-full max-w-md gap-4">
      <div>
        <h1 className="font-heading text-3xl text-[#1c1915]">Sign in</h1>
        <p className="mt-2 text-sm leading-6 text-[#4d463c]">
          The phone check already happened when the account was created. This only opens the console session for{" "}
          <span className="font-medium text-[#1c1915]">{email}</span>.
        </p>
      </div>
      <Field id="signin-password" label="Password (discarded)">
        <Input
          id="signin-password"
          type="password"
          autoComplete="new-password"
          name="skybench-signin-password"
          data-1p-ignore="true"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </Field>
      {error ? (
        <p role="alert" className="text-sm text-[#8a2e24]">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="h-10">
        Sign in
      </Button>
    </form>
  )
}

function Field({
  id,
  label,
  children,
}: {
  id: string
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}
