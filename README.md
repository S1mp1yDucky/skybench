# Skybench

Skybench is a local cloud lab for a Cloud Computing practical on **Amazon Web Services**, **Microsoft Azure**, and **DigitalOcean**. It walks the same steps as the brief — study the service, create an account, install the CLI, launch a Linux machine, SSH in, run `uname -a`, and clean up — without calling those providers or charging a card.

Hassan Shah Khan, enrollment 4-38-2023/015, BSCS 8th semester. Submitted to Sir Kashif.

This is a simulation. Tell that to anyone marking the work. Passwords, SMS codes, access keys, and API tokens are discarded. Machine addresses come from documentation ranges (`203.0.113.0/24`, `198.51.100.0/24`, `192.0.2.0/24`) and are not routable. Prices in the consoles are teaching figures. Current free-tier rules live on the providers' own sites.

## Run it

```bash
npm install
npm run dev
```

The dev server listens on port **4317**. Open the bench, then AWS, Azure, and DigitalOcean. Progress is stored in the browser.

`npm run check` runs the simulated practical once for each platform. `npm run lint` checks the source.

## What to click

1. Read the product, pricing, and free-tier page.
2. Create the lab account. The verification code appears on the page. Nothing is texted.
3. Sign in. A nearby region is already selected.
4. Open the VMware shell and use the hinted install and login commands.
5. Launch the machine and wait until it says running.
6. SSH in and run `uname -a`. The same command before SSH only describes the local guest.
7. Terminate the instance, delete the Azure resource group, or destroy the Droplet. Powering a Droplet off still bills, including in this lab.

The report page can be printed to PDF. The comparison page is the side-by-side table from the brief.

If a recording has to show VMware, open this site in a browser inside the Ubuntu guest. Skybench does not need VMware to run.
