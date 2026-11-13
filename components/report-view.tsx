"use client"

import { STUDENT, COMPARE_ROWS } from "@/lib/catalog"
import { useLabState } from "@/lib/store"
import { awsSteps, azureSteps, doSteps, type LabStep } from "@/lib/steps"
import { Button } from "@/components/ui/button"

export function ReportView() {
  const lab = useLabState()
  const blocks = [
    ["AWS", awsSteps(lab)],
    ["Azure", azureSteps(lab)],
    ["DigitalOcean", doSteps(lab)],
  ] as const

  return (
    <article className="print-sheet mx-auto w-full max-w-3xl flex-1 bg-[#efe6d6] px-4 py-8 text-[#221c16] sm:px-6 sm:py-12">
      <div className="rounded-2xl border border-[#e2d6c4] bg-[#fbf7ef] p-6 sm:p-10">
        <p className="text-xs tracking-[0.16em] text-[#8a5a32] uppercase">{STUDENT.subject}</p>
        <h1 className="mt-2 font-heading text-4xl leading-tight">Study, installation, and demonstration of cloud platforms</h1>
        <p className="mt-2 text-lg text-[#4d463c]">AWS, Microsoft Azure, and DigitalOcean</p>
        <dl className="mt-6 grid gap-1 text-sm sm:grid-cols-2">
          <div><dt className="text-[#6d6256]">Submitted by</dt><dd>{STUDENT.name}</dd></div>
          <div><dt className="text-[#6d6256]">Enrollment</dt><dd>{STUDENT.enrollment}</dd></div>
          <div><dt className="text-[#6d6256]">Email</dt><dd className="break-all">{STUDENT.email}</dd></div>
          <div><dt className="text-[#6d6256]">Program</dt><dd>{STUDENT.program}</dd></div>
          <div><dt className="text-[#6d6256]">Submitted to</dt><dd>{STUDENT.instructor}</dd></div>
        </dl>
        <div className="no-print mt-6">
          <Button type="button" variant="outline" onClick={() => window.print()}>
            Print or save as PDF
          </Button>
        </div>

        <Section id="method" title="Practical environment">
          <p>
            Paid accounts for three providers were not available, so the practical was carried out in Skybench, a browser lab written for this assignment. Skybench follows the documented setup for each platform — account, CLI, virtual machine, SSH check with uname -a, and cleanup — and keeps every resource on the local machine. No provider API is called. Passwords, SMS codes, access keys, and API tokens are discarded instead of stored. Public addresses are taken from documentation ranges that are not routed on the internet. Prices shown in the consoles are teaching figures, not live quotes. The official pages remain the source for current free-tier rules: aws.amazon.com/free, azure.microsoft.com/free, and digitalocean.com/pricing.
          </p>
          <p>
            If a recording has to show VMware, the lab can be opened in a browser inside the Ubuntu guest. Skybench itself stands in for that guest: the shell is where the CLI is installed and where SSH starts.
          </p>
        </Section>

        <Section id="intro" title="1. Introduction to cloud computing">
          <p>
            Cloud computing means using servers, storage, databases, networking, and software over the internet instead of owning them locally. Providers run large data centers. Customers pay for what they use. The benefits that matter for this course are no hardware purchase, quick scaling, access from anywhere, and less maintenance. The risk that matters just as much is a forgotten resource that keeps billing.
          </p>
          <p>
            Infrastructure as a service rents virtual machines, storage, and networks. EC2, an Azure virtual machine, and a Droplet are the IaaS examples in this practical. Platform as a service is a ready place to build and run an application, such as Azure App Service or Elastic Beanstalk. Software as a service is finished software over the internet, such as Microsoft 365 or Gmail.
          </p>
          <p>
            Public clouds are shared over the internet. Private clouds serve one organisation. Hybrid clouds mix the two. AWS, Azure, and DigitalOcean were studied from their public product pages, then exercised in Skybench: features, requirements, and dependencies first, then the CLI, then a Linux machine, then cleanup.
          </p>
        </Section>

        <Section id="videos" title="2. Demonstration videos">
          <p>
            Desktop recordings for the three platforms are collected in one Google Drive folder:{" "}
            <a className="underline underline-offset-4" href={STUDENT.drive}>
              {STUDENT.drive}
            </a>
            . A recording of this lab should show, for each provider, the seven steps in the console sidebar. The step that proves SSH is uname -a on the cloud guest. uname -a before ssh only describes the local guest.
          </p>
        </Section>

        <Section id="aws" title="3. Amazon Web Services">
          <p>
            AWS has offered on-demand compute, storage, databases, networking, and security since 2006. Capacity is organised into Regions and Availability Zones. The services named in the brief are EC2, Lambda, ECS and EKS, S3, EBS, EFS, RDS, DynamoDB, Aurora, VPC, Route 53, CloudFront, IAM, CloudWatch, CloudFormation, and SageMaker. The practical uses EC2.
          </p>
          <p>
            A real account needs an email, a phone number, and a card. The lab account uses a discarded password and an on-screen code, then signs in to a nearby region, ap-south-1. The shell accepts sudo apt install -y awscli, aws configure, a key pair, and aws ec2 run-instances. SSH is ssh -i key.pem ec2-user@address for Amazon Linux, or ubuntu for the Ubuntu image. Cleanup is terminate, not stop. Stopped instances drop compute charges in this model, but a real EBS volume can keep costing money.
          </p>
        </Section>

        <Section id="azure" title="4. Microsoft Azure">
          <p>
            Azure is Microsoft&apos;s cloud, and it is the natural fit when a team already uses Windows Server, Active Directory, SQL Server, or .NET. Resources sit in a subscription and a resource group. The services named in the brief are Virtual Machines, App Service, Functions, AKS, Blob, disks, Azure Files, Azure SQL, Cosmos DB, managed MySQL and PostgreSQL, Virtual Network, Load Balancer, Application Gateway, DNS, Entra ID, RBAC, Key Vault, Azure Machine Learning, GitHub, and Azure DevOps.
          </p>
          <p>
            A standard free account usually wants a card. Azure for Students usually does not, which is why the signup form records that choice. The shell accepts sudo apt install -y azure-cli and az login, then az group create and az vm create. SSH is ssh azureuser@address. Cleanup is deleting the resource group, which takes the VM with it. Leaving a disk behind is a common real invoice.
          </p>
        </Section>

        <Section id="do" title="5. DigitalOcean">
          <p>
            DigitalOcean, founded in 2011, aims at developers, students, and small teams. It is mostly infrastructure, with a few platform services. Virtual servers are Droplets. The short catalog is Spaces, Volumes, managed PostgreSQL, MySQL and Redis, Kubernetes, App Platform, firewalls, load balancers, and a VPC.
          </p>
          <p>
            A real account needs email verification and a card or PayPal. Promo credit is common for new accounts. The shell accepts ssh-keygen, sudo snap install doctl, and doctl auth init. The Droplet is Ubuntu in a basic size, and the login is root. The important billing fact, and the one the lab meter copies, is that a powered-off Droplet still costs money until it is destroyed.
          </p>
        </Section>

        <Section id="compare" title="6. Comparison">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 pr-3 font-medium">Point</th>
                  <th className="py-2 pr-3 font-medium">AWS</th>
                  <th className="py-2 pr-3 font-medium">Azure</th>
                  <th className="py-2 font-medium">DigitalOcean</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row) => (
                  <tr key={row.point} className="border-b align-top">
                    <th className="py-2 pr-3 font-medium">{row.point}</th>
                    <td className="py-2 pr-3">{row.aws}</td>
                    <td className="py-2 pr-3">{row.azure}</td>
                    <td className="py-2">{row.do}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="conclusion" title="7. Conclusion">
          <p>
            AWS has the widest catalog and the steepest console. Azure suits Microsoft-based work and offers the friendliest student start. DigitalOcean is the simplest of the three and the best first Linux server, with the caution that powering a Droplet off does not end the bill. All three can present a virtual machine within a minute, all three can be driven from a dashboard or a CLI, and all three bill by usage. The lesson that survives the comparison is to delete what the practical created.
          </p>
          <p>
            Doing the work inside a simulated guest made the requirements and dependencies concrete without opening three paid accounts: a CLI that is not installed cannot launch anything, a key that was never created cannot SSH, and a machine that was only stopped is not the same as a machine that was destroyed.
          </p>
        </Section>

        <section className="mt-8 border-t border-[#e2d6c4] pt-6">
          <h2 className="font-heading text-2xl">Checklist in this browser</h2>
          <p className="mt-2 text-sm leading-6 text-[#4d463c]">
            These marks come from the lab state on this computer. They stay empty until the steps are actually done.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {blocks.map(([name, steps]) => (
              <Checklist key={name} name={name} steps={steps} />
            ))}
          </div>
        </section>
      </div>
    </article>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-8 grid gap-3 text-sm leading-7">
      <h2 className="font-heading text-2xl">{title}</h2>
      {children}
    </section>
  )
}

function Checklist({ name, steps }: { name: string; steps: LabStep[] }) {
  const done = steps.filter((step) => step.done).length
  return (
    <div>
      <h3 className="text-sm font-semibold">{name} · {done}/7</h3>
      <ul className="mt-2 grid gap-1 text-xs leading-5">
        {steps.map((step) => (
          <li key={step.n}>{step.done ? "Done" : "Not yet"} · {step.title}</li>
        ))}
      </ul>
    </div>
  )
}
