import type { ImageOption, RegionOption, SizeOption } from "@/lib/types"

export const STUDENT = {
  name: "Talal Majid",
  enrollment: "4-38/2023/021",
  program: "BSCS, 8th Semester",
  subject: "Cloud Computing",
  instructor: "Sir Kashif",
  email: "03352869102t@gmail.com",
  drive:
    "https://drive.google.com/drive/folders/1HtcP42A-1Krayzo1UgTcQyOp5_Zv6NqD",
}

export const AWS_REGIONS: RegionOption[] = [
  { id: "ap-south-1", label: "Asia Pacific (Mumbai) ap-south-1" },
  { id: "me-south-1", label: "Middle East (Bahrain) me-south-1" },
  { id: "ap-southeast-1", label: "Asia Pacific (Singapore) ap-southeast-1" },
  { id: "eu-west-1", label: "Europe (Ireland) eu-west-1" },
  { id: "us-east-1", label: "US East (N. Virginia) us-east-1" },
  { id: "us-west-2", label: "US West (Oregon) us-west-2" },
]

export const AZURE_LOCATIONS: RegionOption[] = [
  { id: "centralindia", label: "Central India" },
  { id: "uaenorth", label: "UAE North" },
  { id: "southeastasia", label: "Southeast Asia" },
  { id: "westeurope", label: "West Europe" },
  { id: "eastus", label: "East US" },
  { id: "uksouth", label: "UK South" },
]

export const DO_REGIONS: RegionOption[] = [
  { id: "blr1", label: "Bangalore (blr1)" },
  { id: "sgp1", label: "Singapore (sgp1)" },
  { id: "fra1", label: "Frankfurt (fra1)" },
  { id: "lon1", label: "London (lon1)" },
  { id: "nyc1", label: "New York (nyc1)" },
  { id: "sfo3", label: "San Francisco (sfo3)" },
]

export const AWS_IMAGES: ImageOption[] = [
  {
    id: "ami-al2023",
    label: "Amazon Linux 2023",
    username: "ec2-user",
    os: "Amazon Linux 2023",
    amiTitle: "Amazon Linux 2023 kernel-6.18 AMI",
    amiIds: "ami-0e182bd8728384e40 (64-bit (x86), uefi-preferred) / ami-08c23cc60c24991ad (64-bit (Arm), uefi)",
    freeTier: true,
  },
  {
    id: "ami-ubuntu2204",
    label: "Ubuntu Server 22.04 LTS",
    username: "ubuntu",
    os: "Ubuntu 22.04",
    amiTitle: "Ubuntu Server 22.04 LTS (HVM), SSD Volume Type",
    freeTier: true,
  },
]

export const AWS_SIZES: SizeOption[] = [
  {
    id: "t2.micro",
    label: "t2.micro",
    vcpu: 1,
    ram: "1 GiB",
    hourlyUsd: 0.0116,
    free: true,
    note: "Often free-tier eligible on a new AWS account. Confirm on aws.amazon.com/free.",
  },
  {
    id: "t3.micro",
    label: "t3.micro",
    vcpu: 2,
    ram: "1 GiB",
    hourlyUsd: 0.0104,
    free: true,
    note: "Burstable. Newer accounts sometimes include it in the free tier.",
  },
  {
    id: "t3.small",
    label: "t3.small",
    vcpu: 2,
    ram: "2 GiB",
    hourlyUsd: 0.0208,
    free: false,
    note: "Not a free-tier size. A real account would bill this immediately.",
  },
]

export const AZURE_IMAGES: ImageOption[] = [
  {
    id: "Ubuntu2404",
    label: "Ubuntu Server 24.04 LTS - x64 Gen2",
    username: "azureuser",
    os: "Ubuntu 24.04",
  },
  {
    id: "Ubuntu2204",
    label: "Ubuntu Server 22.04 LTS - x64 Gen2",
    username: "azureuser",
    os: "Ubuntu 22.04",
  },
  {
    id: "Debian12",
    label: "Debian 12 - x64 Gen2",
    username: "azureuser",
    os: "Debian 12",
  },
]

export const AZURE_SIZES: SizeOption[] = [
  {
    id: "Standard_B1s",
    label: "Standard_B1s",
    vcpu: 1,
    ram: "1 GiB",
    hourlyUsd: 0.012,
    free: true,
    note: "Small burstable size. Student and free accounts cover a limited amount.",
  },
  {
    id: "Standard_B1ms",
    label: "Standard_B1ms",
    vcpu: 1,
    ram: "2 GiB",
    hourlyUsd: 0.021,
    free: false,
    note: "A real subscription bills this size after any credit is gone.",
  },
  {
    id: "Standard_B2s",
    label: "Standard_B2s",
    vcpu: 2,
    ram: "4 GiB",
    hourlyUsd: 0.042,
    free: false,
    note: "Too large for a casual practice VM.",
  },
]

export const DO_IMAGES: ImageOption[] = [
  { id: "ubuntu-26-04-x64", label: "Ubuntu 26.04 (LTS) x64", username: "root", os: "Ubuntu 26.04" },
  { id: "ubuntu-24-04-x64", label: "Ubuntu 24.04 (LTS) x64", username: "root", os: "Ubuntu 24.04" },
  { id: "ubuntu-22-04-x64", label: "Ubuntu 22.04 (LTS) x64", username: "root", os: "Ubuntu 22.04" },
  { id: "debian-13-x64", label: "Debian 13 x64", username: "root", os: "Debian 13" },
  { id: "debian-12-x64", label: "Debian 12 x64", username: "root", os: "Debian 12" },
  { id: "fedora-44-x64", label: "Fedora 44 x64", username: "root", os: "Fedora 44" },
  { id: "fedora-43-x64", label: "Fedora 43 x64", username: "root", os: "Fedora 43" },
  { id: "centos-stream-10-x64", label: "CentOS Stream 10 x64", username: "root", os: "CentOS Stream 10" },
  { id: "centos-stream-9-x64", label: "CentOS Stream 9 x64", username: "root", os: "CentOS Stream 9" },
  { id: "almalinux-10-x64", label: "AlmaLinux 10", username: "root", os: "AlmaLinux 10" },
  { id: "almalinux-9-x64", label: "AlmaLinux 9", username: "root", os: "AlmaLinux 9" },
  { id: "almalinux-8-x64", label: "AlmaLinux 8", username: "root", os: "AlmaLinux 8" },
  { id: "rockylinux-10-x64", label: "Rocky Linux 10 x64", username: "root", os: "Rocky Linux 10" },
  { id: "rockylinux-9-x64", label: "Rocky Linux 9 x64", username: "root", os: "Rocky Linux 9" },
  { id: "rockylinux-8-x64", label: "Rocky Linux 8 x64", username: "root", os: "Rocky Linux 8" },
]

export const DO_SIZES: SizeOption[] = [
  {
    id: "s-1vcpu-512mb-10gb",
    label: "Basic 512 MiB / 1 vCPU",
    vcpu: 1,
    ram: "512 MiB",
    hourlyUsd: 4 / 730,
    free: false,
    note: "About $4 per month on a real account, capped from the hourly rate.",
  },
  {
    id: "s-1vcpu-1gb",
    label: "Basic 1 GiB / 1 vCPU",
    vcpu: 1,
    ram: "1 GiB",
    hourlyUsd: 6 / 730,
    free: false,
    note: "About $6 per month. The usual student Droplet.",
  },
  {
    id: "s-1vcpu-2gb",
    label: "Basic 2 GiB / 1 vCPU",
    vcpu: 1,
    ram: "2 GiB",
    hourlyUsd: 12 / 730,
    free: false,
    note: "About $12 per month.",
  },
]

export interface StudyPack {
  id: "aws" | "azure" | "do"
  name: string
  site: string
  siteLabel: string
  intro: string
  features: { group: string; items: string }[]
  requirements: string[]
  dependencies: string[]
  pricing: string[]
}

export const STUDIES: Record<StudyPack["id"], StudyPack> = {
  aws: {
    id: "aws",
    name: "Amazon Web Services",
    site: "https://aws.amazon.com/free/",
    siteLabel: "aws.amazon.com/free",
    intro:
      "Amazon Web Services is Amazon's cloud platform. It has offered on-demand compute, storage, databases, networking, and security since 2006. Capacity is arranged in Regions and Availability Zones so a failure in one site does not have to take the whole application down. This lab uses illustrative behavior from the public product pages. It does not open a real account.",
    features: [
      { group: "Compute", items: "EC2 virtual machines, Lambda functions, ECS and EKS containers" },
      { group: "Storage", items: "S3 objects, EBS block volumes, EFS shared files" },
      { group: "Databases", items: "RDS, DynamoDB, Aurora" },
      { group: "Networking", items: "VPC, Route 53, CloudFront" },
      { group: "Security", items: "IAM, encryption, and monitoring" },
      { group: "Management", items: "CloudWatch, CloudFormation, SageMaker" },
    ],
    requirements: [
      "A real account needs an email address, a phone number, and a debit or credit card.",
      "Any current Windows, macOS, or Linux machine with a browser and a stable connection can open the console.",
      "The assignment's local half is an Ubuntu guest (2 vCPU, 4 GB RAM, 20 GB disk), which this shell stands in for.",
    ],
    dependencies: [
      "AWS CLI, configured with aws configure. Whatever you type for the keys is discarded.",
      "An SSH key pair and an SSH client. The downloaded .pem is a prop, not a private key.",
      "A free-tier eligible account on a real bill. Here the meter is simulated.",
    ],
    pricing: [
      "Pay-as-you-go, by the second or hour, with savings plans on longer commitments.",
      "New accounts get a limited free tier. The rules change, so check aws.amazon.com/free before relying on them.",
      "Set a billing alert. This lab ships with a $1 simulated alert so you can watch it trip.",
    ],
  },
  azure: {
    id: "azure",
    name: "Microsoft Azure",
    site: "https://azure.microsoft.com/free/",
    siteLabel: "azure.microsoft.com/free",
    intro:
      "Microsoft Azure runs applications from Microsoft's data centers. It is a common choice when a team already lives in Windows Server, Active Directory, SQL Server, or .NET. Resources sit inside a subscription and a resource group, and deleting the group is how you sweep a whole experiment away. Azure for Students is the path that usually avoids a card.",
    features: [
      { group: "Compute", items: "Virtual Machines, App Service, Functions, AKS" },
      { group: "Storage", items: "Blob, managed disks, Azure Files" },
      { group: "Databases", items: "Azure SQL, Cosmos DB, managed MySQL and PostgreSQL" },
      { group: "Networking", items: "Virtual Network, Load Balancer, Application Gateway, DNS" },
      { group: "Security", items: "Microsoft Entra ID, RBAC, Key Vault" },
      { group: "Hybrid and AI", items: "On-premises links, Azure Machine Learning, GitHub, Azure DevOps" },
    ],
    requirements: [
      "A Microsoft account, or a university email for Azure for Students, plus phone verification.",
      "A card is normal for the standard free account and usually not required for Students.",
      "A current browser. The local Ubuntu guest from the assignment hosts Azure CLI and SSH.",
    ],
    dependencies: [
      "Azure CLI and az login. The device-code browser step is simulated.",
      "An SSH key or a password, and an SSH client.",
      "An active subscription (Free, Student, or Pay-As-You-Go) and a resource group.",
    ],
    pricing: [
      "Pay-as-you-go, with reserved instances and savings plans.",
      "Free accounts typically receive a 30-day credit plus selected free services for 12 months. Students receive credit without a card. Confirm at azure.microsoft.com/free.",
      "Delete the resource group when you stop. Leaving a disk behind is a common surprise on a real bill.",
    ],
  },
  do: {
    id: "do",
    name: "DigitalOcean",
    site: "https://www.digitalocean.com/pricing",
    siteLabel: "digitalocean.com/pricing",
    intro:
      "DigitalOcean is aimed at developers, students, and small teams who want a short path to a Linux server. It launched in 2011 and is mostly infrastructure, with a few platform services around it. Virtual servers are called Droplets. Pricing is posted as a monthly cap on an hourly rate, which makes a practice VM easier to reason about than a large catalog.",
    features: [
      { group: "Droplets", items: "Linux virtual machines in a short list of sizes" },
      { group: "Storage", items: "Spaces for objects, Volumes for block storage" },
      { group: "Databases", items: "Managed PostgreSQL, MySQL, and Redis" },
      { group: "Containers", items: "Kubernetes and App Platform" },
      { group: "Networking", items: "Cloud Firewalls, Load Balancers, VPC" },
      { group: "Management", items: "Control panel, REST API, doctl, backups, monitoring" },
    ],
    requirements: [
      "An email address, email verification, and a card or PayPal on a real account.",
      "A current browser.",
      "The local Ubuntu guest holds doctl and the SSH client.",
    ],
    dependencies: [
      "doctl, signed in with doctl auth init. The token is discarded.",
      "An SSH key from ssh-keygen, added before the Droplet is created.",
      "A billing profile. This lab applies a simulated promo credit instead of a card.",
    ],
    pricing: [
      "Hourly billing with a monthly cap. Basic Droplets start near a few dollars a month.",
      "New accounts often receive promo credit. Check digitalocean.com/pricing for the current offer.",
      "A Droplet is billed while it is powered off. Destroy it when the practical is over.",
    ],
  },
}

export interface CompareRow {
  point: string
  aws: string
  azure: string
  do: string
}

export const COMPARE_ROWS: CompareRow[] = [
  { point: "Provider", aws: "Amazon", azure: "Microsoft", do: "DigitalOcean" },
  { point: "Service model", aws: "IaaS, PaaS, and SaaS", azure: "IaaS, PaaS, and SaaS", do: "Mainly IaaS, plus a few PaaS options" },
  { point: "Virtual machine", aws: "EC2 instance", azure: "Virtual machine", do: "Droplet" },
  { point: "CLI", aws: "AWS CLI", azure: "Azure CLI (az)", do: "doctl" },
  { point: "Configure the CLI", aws: "aws configure", azure: "az login", do: "doctl auth init" },
  { point: "SSH user", aws: "ec2-user or ubuntu", azure: "the admin username", do: "root" },
  { point: "Catalog", aws: "Very large", azure: "Very large", do: "Small and focused" },
  { point: "Ease of use", aws: "Moderate", azure: "Moderate", do: "Easiest of the three" },
  { point: "Sign-up on a real account", aws: "Card required", azure: "Card, unless it is Azure for Students", do: "Card or PayPal" },
  { point: "Cleanup", aws: "Terminate the instance", azure: "Delete the resource group", do: "Destroy the Droplet" },
  { point: "Powered off", aws: "Compute stops; storage can still cost", azure: "Compute stops; disks can still cost", do: "Still billed until destroyed" },
  { point: "Region", aws: "ap-south-1 Mumbai", azure: "Central India", do: "blr1 Bangalore" },
  { point: "Best fit", aws: "A wide range of services", azure: "Microsoft-based setups and student credit", do: "Small, simple projects" },
]
