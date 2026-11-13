"use client"

import { useEffect, useState } from "react"
import { AwsWordmark, DoMark } from "@/components/brand-marks"
import { Input } from "@/components/ui/input"

export function AccountForm({
  emailDefault,
  showStudent,
  accent = "aws",
  onCreate,
}: {
  heading?: string
  lede?: string
  ack?: string
  emailDefault: string
  showStudent?: boolean
  accent?: "aws" | "azure" | "do"
  onCreate: (input: { email: string; student: boolean }) => { error?: string }
}) {
  if (accent === "azure") return <AzureSignup emailDefault={emailDefault} studentOffer={showStudent ?? false} onCreate={onCreate} />
  if (accent === "do") return <DoSignup emailDefault={emailDefault} onCreate={onCreate} />
  return <AwsSignup emailDefault={emailDefault} onCreate={onCreate} />
}

export function SignInCard({
  email,
  accent = "aws",
  onSignIn,
}: {
  email: string
  accent?: "aws" | "azure" | "do"
  onSignIn: () => { error?: string }
}) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (password.length < 8) {
      setError("Your password is incorrect.")
      return
    }
    setPassword("")
    const outcome = onSignIn()
    setError(outcome.error ?? null)
  }

  if (accent === "azure") {
    return (
      <MicrosoftShell title="Sign in to your account">
        <h1 className="mt-4 text-[24px] font-semibold">Sign in</h1>
        <p className="mt-3 text-[15px]">{email}</p>
        <form onSubmit={submit} className="mt-4 grid gap-4">
          <MsField id="signin-password" label="Password">
            <Input id="signin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-9 rounded-sm border-[#8a8886]" />
          </MsField>
          {error ? <p role="alert" className="text-[13px] text-[#a4262c]">{error}</p> : null}
          <button type="submit" className="h-8 w-fit bg-[#0067b8] px-6 text-[15px] text-white hover:bg-[#005da6]">Sign in</button>
        </form>
      </MicrosoftShell>
    )
  }

  if (accent === "do") {
    return (
      <DoShell title="Log in | DigitalOcean">
        <h1 className="text-[28px] font-semibold text-[#031b4e]">Log in</h1>
        <form onSubmit={submit} className="mt-6 grid gap-4">
          <DoField id="do-signin-email" label="Email">
            <Input id="do-signin-email" value={email} readOnly className="h-10 rounded-md bg-[#f7f9fc]" />
          </DoField>
          <DoField id="signin-password" label="Password">
            <Input id="signin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-10 rounded-md" />
          </DoField>
          {error ? <p role="alert" className="text-[13px] text-[#d92d20]">{error}</p> : null}
          <button type="submit" className="h-10 rounded-md bg-[#0069ff] text-[15px] font-medium text-white hover:bg-[#0058d6]">Log in</button>
        </form>
      </DoShell>
    )
  }

  return (
    <AwsShell title="Amazon Web Services Sign-In">
      <h1 className="text-[28px]">Sign in</h1>
      <p className="mt-1 text-[14px] text-[#545b64]">Root user</p>
      <form onSubmit={submit} className="mt-5 grid gap-4">
        <AwsField id="aws-signin-email" label="Root user email address">
          <Input id="aws-signin-email" value={email} readOnly className="h-9 rounded-sm bg-[#fafafa]" />
        </AwsField>
        <AwsField id="signin-password" label="Password">
          <Input id="signin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-9 rounded-sm" />
        </AwsField>
        {error ? <p role="alert" className="text-[13px] text-[#d13212]">{error}</p> : null}
        <button type="submit" className="h-9 bg-[#ec7211] text-[14px] font-bold text-white hover:bg-[#eb5f07]">Sign in</button>
      </form>
    </AwsShell>
  )
}

function AwsSignup({
  emailDefault,
  onCreate,
}: {
  emailDefault: string
  onCreate: (input: { email: string; student: boolean }) => { error?: string }
}) {
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState(emailDefault)
  const [accountName, setAccountName] = useState("Talal")
  const [password, setPassword] = useState("")
  const [phone, setPhone] = useState("03352869102")
  const [sent, setSent] = useState<string | null>(null)
  const [code, setCode] = useState("")
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function verifyEmail() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.")
      return
    }
    if (!accountName.trim()) {
      setError("Enter an AWS account name.")
      return
    }
    setSent((current) => current ?? String(Math.floor(100000 + Math.random() * 900000)))
    setError(null)
    setStep(2)
  }

  function verifyCode() {
    if (!sent || code.trim() !== sent) {
      setError("The verification code is invalid.")
      return
    }
    setError(null)
    setStep(3)
  }

  function continuePassword() {
    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    setError(null)
    setStep(4)
  }

  function continueContact() {
    if (phone.replace(/\D/g, "").length < 10) {
      setError("Enter a valid phone number.")
      return
    }
    setError(null)
    setStep(5)
  }

  function create(event: React.FormEvent) {
    event.preventDefault()
    if (!agreed) {
      setError("You must agree to the AWS Customer Agreement.")
      return
    }
    const outcome = onCreate({ email: email.trim(), student: false })
    setPassword("")
    setError(outcome.error ?? null)
  }

  return (
    <AwsShell title="Sign up for AWS">
      <h1 className="text-[28px]">Sign up for AWS</h1>
      <p className="mt-1 text-[13px] text-[#545b64]">Step {step} of 5</p>
      <form onSubmit={create} className="mt-5 grid gap-4" noValidate>
        {step === 1 ? (
          <>
            <AwsField id="lab-email" label="Root user email address">
              <Input id="lab-email" type="email" autoComplete="off" value={email} onChange={(event) => setEmail(event.target.value)} className="h-9 rounded-sm" />
            </AwsField>
            <AwsField id="aws-account-name" label="AWS account name">
              <Input id="aws-account-name" value={accountName} onChange={(event) => setAccountName(event.target.value)} className="h-9 rounded-sm" />
            </AwsField>
            <button type="button" className="h-9 bg-[#ec7211] text-[14px] font-bold text-white hover:bg-[#eb5f07]" onClick={verifyEmail}>Verify email address</button>
          </>
        ) : null}
        {step === 2 && sent ? (
          <>
            <p className="text-[14px]">We have sent a verification code to {email}.</p>
            <div className="border border-[#d5dbdb] bg-[#fafafa] p-3 text-[14px] leading-6">
              <p className="font-bold">Amazon Web Services</p>
              <p>Your verification code is <span className="font-mono text-[16px]">{sent}</span></p>
            </div>
            <AwsField id="lab-code" label="Verification code">
              <Input id="lab-code" inputMode="numeric" autoComplete="off" value={code} onChange={(event) => setCode(event.target.value)} className="h-9 rounded-sm" />
            </AwsField>
            <button type="button" className="h-9 bg-[#ec7211] text-[14px] font-bold text-white hover:bg-[#eb5f07]" onClick={verifyCode}>Verify</button>
          </>
        ) : null}
        {step === 3 ? (
          <>
            <AwsField id="lab-password" label="Root user password">
              <Input id="lab-password" type="password" autoComplete="new-password" name="aws-root-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-9 rounded-sm" />
            </AwsField>
            <p className="text-[12px] text-[#545b64]">Use at least 8 characters.</p>
            <button type="button" className="h-9 bg-[#ec7211] text-[14px] font-bold text-white hover:bg-[#eb5f07]" onClick={continuePassword}>Continue</button>
          </>
        ) : null}
        {step === 4 ? (
          <>
            <AwsField id="aws-full-name" label="Full name">
              <Input id="aws-full-name" value="Talal Majid" readOnly className="h-9 rounded-sm bg-[#fafafa]" />
            </AwsField>
            <AwsField id="lab-phone" label="Phone number">
              <Input id="lab-phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className="h-9 rounded-sm" />
            </AwsField>
            <AwsField id="aws-country" label="Country or Region">
              <Input id="aws-country" value="Pakistan" readOnly className="h-9 rounded-sm bg-[#fafafa]" />
            </AwsField>
            <button type="button" className="h-9 bg-[#ec7211] text-[14px] font-bold text-white hover:bg-[#eb5f07]" onClick={continueContact}>Continue</button>
          </>
        ) : null}
        {step === 5 ? (
          <>
            <label className="flex items-start gap-2 text-[14px] leading-5">
              <input type="checkbox" className="mt-1" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
              <span>I have read and agree to the terms of the AWS Customer Agreement.</span>
            </label>
            <button type="submit" className="h-9 bg-[#ec7211] text-[14px] font-bold text-white hover:bg-[#eb5f07]">Create account</button>
          </>
        ) : null}
        {error ? <p role="alert" className="text-[13px] text-[#d13212]">{error}</p> : null}
      </form>
    </AwsShell>
  )
}

function AzureSignup({
  emailDefault,
  studentOffer,
  onCreate,
}: {
  emailDefault: string
  studentOffer: boolean
  onCreate: (input: { email: string; student: boolean }) => { error?: string }
}) {
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState(emailDefault)
  const [password, setPassword] = useState("")
  const [phone, setPhone] = useState("03352869102")
  const [student, setStudent] = useState(studentOffer)
  const [sent, setSent] = useState<string | null>(null)
  const [code, setCode] = useState("")
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function nextEmail() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.")
      return
    }
    setError(null)
    setStep(2)
  }

  function nextPassword() {
    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    setError(null)
    setStep(3)
  }

  function sendCode() {
    if (phone.replace(/\D/g, "").length < 10) {
      setError("Enter a valid phone number.")
      return
    }
    setSent((current) => current ?? String(Math.floor(100000 + Math.random() * 900000)))
    setError(null)
    setStep(4)
  }

  function create(event: React.FormEvent) {
    event.preventDefault()
    if (!sent || code.trim() !== sent) {
      setError("That code is incorrect. Check the code and try again.")
      return
    }
    if (!agreed) {
      setError("You must agree to continue.")
      return
    }
    const outcome = onCreate({ email: email.trim(), student })
    setPassword("")
    setError(outcome.error ?? null)
  }

  return (
    <MicrosoftShell title="Microsoft Azure">
      <h1 className="mt-4 text-[24px] font-semibold">{student ? "Azure for Students" : "Create account"}</h1>
      {student && step === 1 ? <p className="mt-2 text-[14px] text-[#605e5c]">No credit card required.</p> : null}
      <form onSubmit={create} className="mt-5 grid gap-4" noValidate>
        {step === 1 ? (
          <>
            <div className="grid gap-2 text-[14px]">
              <label className="flex items-center gap-2"><input type="radio" checked={student} onChange={() => setStudent(true)} /> Azure for Students</label>
              <label className="flex items-center gap-2"><input type="radio" checked={!student} onChange={() => setStudent(false)} /> Azure free account</label>
            </div>
            <MsField id="lab-email" label="Email">
              <Input id="lab-email" type="email" autoComplete="off" value={email} onChange={(event) => setEmail(event.target.value)} className="h-9 rounded-sm border-[#8a8886]" />
            </MsField>
            <button type="button" className="h-8 w-fit bg-[#0067b8] px-6 text-[15px] text-white" onClick={nextEmail}>Next</button>
          </>
        ) : null}
        {step === 2 ? (
          <>
            <p className="text-[15px]">Create a password</p>
            <MsField id="lab-password" label="Password">
              <Input id="lab-password" type="password" autoComplete="new-password" name="microsoft-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-9 rounded-sm border-[#8a8886]" />
            </MsField>
            <button type="button" className="h-8 w-fit bg-[#0067b8] px-6 text-[15px] text-white" onClick={nextPassword}>Next</button>
          </>
        ) : null}
        {step === 3 ? (
          <>
            <p className="text-[15px]">Verify your identity</p>
            <MsField id="az-given" label="First name">
              <Input id="az-given" value="Talal" readOnly className="h-9 rounded-sm border-[#8a8886] bg-[#faf9f8]" />
            </MsField>
            <MsField id="az-surname" label="Last name">
              <Input id="az-surname" value="Majid" readOnly className="h-9 rounded-sm border-[#8a8886] bg-[#faf9f8]" />
            </MsField>
            <MsField id="lab-phone" label="Phone number">
              <Input id="lab-phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className="h-9 rounded-sm border-[#8a8886]" />
            </MsField>
            <MsField id="az-country" label="Country/region">
              <Input id="az-country" value="Pakistan" readOnly className="h-9 rounded-sm border-[#8a8886] bg-[#faf9f8]" />
            </MsField>
            <button type="button" className="h-8 w-fit bg-[#0067b8] px-6 text-[15px] text-white" onClick={sendCode}>Send code</button>
          </>
        ) : null}
        {step === 4 && sent ? (
          <>
            <p className="text-[15px]">Enter the code</p>
            <div className="border border-[#edebe9] bg-[#faf9f8] p-3 text-[14px]">
              <p>Microsoft account security code: <span className="font-mono">{sent}</span></p>
            </div>
            <MsField id="lab-code" label="Code">
              <Input id="lab-code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} className="h-9 rounded-sm border-[#8a8886]" />
            </MsField>
            <label className="flex items-start gap-2 text-[14px] leading-5">
              <input type="checkbox" className="mt-1" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
              <span>I agree to the subscription agreement, offer details, and privacy statement.</span>
            </label>
            <button type="submit" className="h-8 w-fit bg-[#0067b8] px-6 text-[15px] text-white">Next</button>
          </>
        ) : null}
        {error ? <p role="alert" className="text-[13px] text-[#a4262c]">{error}</p> : null}
      </form>
    </MicrosoftShell>
  )
}

function DoSignup({
  emailDefault,
  onCreate,
}: {
  emailDefault: string
  onCreate: (input: { email: string; student: boolean }) => { error?: string }
}) {
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState(emailDefault)
  const [password, setPassword] = useState("")
  const [phone, setPhone] = useState("03352869102")
  const [sent, setSent] = useState<string | null>(null)
  const [code, setCode] = useState("")
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function signUp() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.")
      return
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    if (phone.replace(/\D/g, "").length < 10) {
      setError("Enter a valid phone number.")
      return
    }
    if (!agreed) {
      setError("Agree to the Terms of Service to continue.")
      return
    }
    setSent((current) => current ?? String(Math.floor(100000 + Math.random() * 900000)))
    setError(null)
    setStep(2)
  }

  function create(event: React.FormEvent) {
    event.preventDefault()
    if (!sent || code.trim() !== sent) {
      setError("That verification code is incorrect.")
      return
    }
    const outcome = onCreate({ email: email.trim(), student: false })
    setPassword("")
    setError(outcome.error ?? null)
  }

  return (
    <DoShell title={step === 1 ? "Sign up | DigitalOcean" : "Verify your email | DigitalOcean"}>
      <h1 className="text-[28px] font-semibold text-[#031b4e]">{step === 1 ? "Sign up" : "Verify your email"}</h1>
      <form onSubmit={create} className="mt-6 grid gap-4" noValidate>
        {step === 1 ? (
          <>
            <DoField id="lab-email" label="Email">
              <Input id="lab-email" type="email" autoComplete="off" value={email} onChange={(event) => setEmail(event.target.value)} className="h-10 rounded-md" />
            </DoField>
            <DoField id="lab-password" label="Password">
              <Input id="lab-password" type="password" autoComplete="new-password" name="do-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-10 rounded-md" />
            </DoField>
            <DoField id="lab-phone" label="Phone number">
              <Input id="lab-phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className="h-10 rounded-md" />
            </DoField>
            <label className="flex items-start gap-2 text-[14px] leading-5 text-[#031b4e]">
              <input type="checkbox" className="mt-1" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
              <span>I agree to the Terms of Service and Privacy Policy.</span>
            </label>
            <button type="button" className="h-10 rounded-md bg-[#0069ff] text-[15px] font-medium text-white" onClick={signUp}>Sign up</button>
          </>
        ) : null}
        {step === 2 && sent ? (
          <>
            <p className="text-[14px] text-[#31405f]">We sent a code to {email}.</p>
            <div className="rounded-md border border-[#e1e7f0] bg-[#f7f9fc] p-3 text-[14px]">
              <p>DigitalOcean</p>
              <p>Your verification code is <span className="font-mono">{sent}</span></p>
            </div>
            <DoField id="lab-code" label="Verification code">
              <Input id="lab-code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} className="h-10 rounded-md" />
            </DoField>
            <button type="submit" className="h-10 rounded-md bg-[#0069ff] text-[15px] font-medium text-white">Verify email</button>
          </>
        ) : null}
        {error ? <p role="alert" className="text-[13px] text-[#d92d20]">{error}</p> : null}
      </form>
    </DoShell>
  )
}

function useTitle(title: string) {
  useEffect(() => {
    document.title = title
  }, [title])
}

function AwsShell({ title, children }: { title: string; children: React.ReactNode }) {
  useTitle(title)
  return (
    <div className="console-aws min-h-dvh bg-[#f2f3f3] text-[#16191f]">
      <header className="flex h-12 items-center bg-[#232f3e] px-5 text-white">
        <AwsWordmark className="h-8 w-14" />
      </header>
      <main className="mx-auto w-full max-w-[460px] px-4 py-10">
        <div className="bg-white px-8 py-8 shadow-sm">{children}</div>
      </main>
    </div>
  )
}

function MicrosoftShell({ title, children }: { title: string; children: React.ReactNode }) {
  useTitle(title)
  return (
    <div className="console-azure flex min-h-dvh items-center justify-center bg-[#f2f2f2] px-4 text-[#323130]">
      <main className="w-full max-w-[440px] bg-white px-11 py-10 shadow-sm">
        <svg viewBox="0 0 21 21" className="size-6" aria-label="Microsoft">
          <rect width="9" height="9" fill="#f25022" />
          <rect x="12" width="9" height="9" fill="#7fba00" />
          <rect y="12" width="9" height="9" fill="#00a4ef" />
          <rect x="12" y="12" width="9" height="9" fill="#ffb900" />
        </svg>
        {children}
      </main>
    </div>
  )
}

function DoShell({ title, children }: { title: string; children: React.ReactNode }) {
  useTitle(title)
  return (
    <div className="console-do flex min-h-dvh flex-col bg-white text-[#031b4e]">
      <header className="flex h-16 items-center px-6">
        <span className="flex items-center gap-2 text-[18px] font-semibold">
          <DoMark className="size-7" />
          DigitalOcean
        </span>
      </header>
      <main className="mx-auto w-full max-w-[420px] flex-1 px-6 py-8">{children}</main>
    </div>
  )
}

function AwsField({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <label htmlFor={id} className="grid gap-1.5 text-[14px] font-bold">
      {label}
      <span className="font-normal">{children}</span>
    </label>
  )
}

function MsField({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <label htmlFor={id} className="grid gap-1.5 text-[13px]">
      {label}
      {children}
    </label>
  )
}

function DoField({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <label htmlFor={id} className="grid gap-1.5 text-[13px] font-medium">
      {label}
      <span className="font-normal">{children}</span>
    </label>
  )
}
