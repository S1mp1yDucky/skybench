import puppeteer from "puppeteer-core"
import { mkdir } from "node:fs/promises"

const base = process.env.SKYBENCH_URL ?? "http://127.0.0.1:4317"
const outDir = "/opt/cursor/artifacts"
await mkdir(outDir, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/google-chrome",
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
  defaultViewport: { width: 1440, height: 900 },
})

const page = await browser.newPage()
const errors = []
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`))
page.on("console", (message) => {
  if (message.type() === "error") errors.push(`console: ${message.text()}`)
})

async function shot(name) {
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true })
}

async function clickText(text) {
  const clicked = await page.evaluate((label) => {
    const nodes = [...document.querySelectorAll("button, a")]
    const node = nodes.find((item) => item.textContent?.replace(/\s+/g, " ").trim() === label)
    if (!(node instanceof HTMLElement) || node.closest("button[disabled], a[aria-disabled='true']")) return false
    node.click()
    return true
  }, text)
  if (!clicked) throw new Error(`Could not click "${text}"`)
}

async function clickSubmit() {
  const clicked = await page.evaluate(() => {
    const button = document.querySelector("form button[type='submit']")
    if (!(button instanceof HTMLButtonElement) || button.disabled) return false
    button.click()
    return true
  })
  if (!clicked) throw new Error("Could not submit the form")
}

async function settle() {
  await page.waitForFunction(() => document.readyState === "complete")
  await new Promise((resolve) => setTimeout(resolve, 1200))
}

async function bodyText() {
  return page.evaluate(() => document.body.innerText)
}

try {
  await page.goto(base, { waitUntil: "load" })
  await settle()
  const home = await bodyText()
  if (!home.includes("Talal Majid")) throw new Error("Home is missing the student name")
  if (!home.includes("Three clouds, on the bench.")) throw new Error("Home heading missing")
  await shot("01-bench")

  await clickText("Open AWS")
  await page.waitForFunction(() => document.body.innerText.includes("Amazon Web Services"))
  await settle()
  await clickText("Continue to account setup")
  await page.waitForFunction(() => document.body.innerText.includes("Create an AWS account"))
  await page.type("#lab-password", "Testpass1")
  await clickText("Send lab code")
  await page.waitForFunction(() => /Your code is\s+\d{6}/.test(document.body.innerText))
  const code = (await bodyText()).match(/Your code is\s+(\d{6})/)?.[1]
  if (!code) throw new Error("Lab code did not appear")
  await page.type("#lab-code", code)
  await page.click('input[type="checkbox"]')
  await clickText("Create lab account")
  await page.waitForFunction(() => document.body.innerText.includes("Sign in"))
  await page.type("#signin-password", "Testpass1")
  await clickText("Sign in")
  await page.waitForFunction(() => document.body.innerText.includes("EC2 Dashboard"))
  await shot("02-aws-empty")

  await clickText("Launch instance")
  await page.waitForFunction(() => document.body.innerText.includes("Launch instance"))
  await clickSubmit()
  await page.waitForFunction(() => document.body.innerText.includes("does not exist"))
  await clickText("Create key pair")
  await page.waitForFunction(() => document.querySelector("#aws-key option[value='skybench']"))
  await clickSubmit()
  await page.waitForFunction(() => {
    if (!/203\.0\.113\.\d+/.test(document.body.innerText)) return false
    const connect = [...document.querySelectorAll("button")].find((item) => item.textContent?.trim() === "Connect")
    return connect instanceof HTMLButtonElement && !connect.disabled
  }, { timeout: 8000 })
  await shot("03-aws-running")

  await clickText("Connect")
  await page.waitForSelector("[data-slot='dialog-content'] input")
  await page.click("[data-slot='dialog-content'] input")
  await page.keyboard.type("uname -a")
  await page.keyboard.press("Enter")
  await page.waitForFunction(() => document.body.innerText.includes("amzn2023"), { timeout: 5000 })
  await shot("04-aws-ssh")
  await page.evaluate(() => {
    const close = document.querySelector("[data-slot='dialog-content'] [data-slot='dialog-close']")
    if (close instanceof HTMLElement) close.click()
  })
  await page.waitForFunction(() => !document.body.innerText.includes("SSH session inside Skybench"))

  await clickText("Terminate")
  await page.waitForFunction(() => document.body.innerText.includes("Keep it"))
  await page.evaluate(() => {
    const dialogs = [...document.querySelectorAll("[data-slot='dialog-content']")]
    const dialog = dialogs.find((item) => item.textContent?.includes("Keep it"))
    const button = [...(dialog?.querySelectorAll("button") ?? [])].find((item) => item.textContent?.trim() === "Terminate")
    if (!(button instanceof HTMLElement)) throw new Error("Terminate confirmation was not found")
    button.click()
  })
  await page.waitForFunction(() => document.body.innerText.includes("No instances"), { timeout: 5000 })

  await clickText("VMware shell")
  await page.waitForFunction(() => document.body.innerText.includes("sudo apt install -y awscli"))
  await clickText("Place in the shell")
  await page.evaluate(() => {
    const input = document.querySelector("input.font-mono")
    if (!(input instanceof HTMLInputElement) || !input.form) throw new Error("Shell input was not found")
    input.form.requestSubmit()
  })
  await page.waitForFunction(() => document.body.innerText.includes("aws-cli/2"), { timeout: 5000 })
  await shot("05-aws-shell")

  await page.goto(`${base}/azure`, { waitUntil: "load" })
  if (!(await bodyText()).includes("Continue to account setup")) throw new Error("Azure study page missing")
  await page.goto(`${base}/digitalocean`, { waitUntil: "load" })
  if (!(await bodyText()).includes("DigitalOcean")) throw new Error("DigitalOcean page missing")
  await page.goto(`${base}/compare`, { waitUntil: "load" })
  if (!(await bodyText()).includes("Powered off")) throw new Error("Comparison table missing")
  await shot("06-compare")
  await page.goto(`${base}/report`, { waitUntil: "load" })
  if (!(await bodyText()).includes("Practical environment")) throw new Error("Report missing the simulation note")

  await page.setViewport({ width: 390, height: 844 })
  await page.goto(base, { waitUntil: "load" })
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  if (overflow > 8) throw new Error(`Home overflows by ${overflow}px on a phone width`)
  await shot("07-bench-mobile")
  await page.goto(`${base}/aws`, { waitUntil: "load" })
  await settle()
  await page.click('button[aria-label="Open navigation"]')
  await page.waitForFunction(() => document.body.innerText.includes("Key Pairs"))
  await shot("08-aws-mobile-nav")

  const serious = errors.filter((line) => !line.includes("favicon") && !line.includes("Download the React DevTools") && !line.includes("_next/hmr"))
  if (serious.length) throw new Error(`Console errors:\n${serious.join("\n")}`)
  console.log("browser checks passed")
} catch (error) {
  await shot("failure").catch(() => {})
  console.error(errors.join("\n"))
  throw error
} finally {
  await browser.close()
}
