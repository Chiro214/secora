# SECORA OAST Production Deployment Guide

To catch real-world blind vulnerabilities (e.g., SSRF, Log4Shell, Blind SQLi, XXE) during a scan against external targets, the SECORA OAST (Out-of-Band Application Security Testing) server must be deployed on a public-facing cloud instance. 

Follow these steps to deploy the OAST server in production mode.

## 1. Domain Configuration (DNS)

You need to configure DNS records so that traffic to your callback domain (e.g., `callback.secora.io`) is directed to your OAST cloud server, and so your OAST server acts as the Authoritative Name Server for that subdomain.

Assuming your public IP is `198.51.100.123` and your domain is `secora.io`:

1. Go to your domain registrar (e.g., Cloudflare, AWS Route53, Namecheap).
2. Create an **A Record**:
   - **Name:** `ns.callback`
   - **Content:** `198.51.100.123`
3. Create an **NS Record** (Name Server):
   - **Name:** `callback`
   - **Content:** `ns.callback.secora.io`
4. (Optional but recommended) Create a **Wildcard A Record** just in case:
   - **Name:** `*.callback`
   - **Content:** `198.51.100.123`

These records ensure that any DNS resolution request for `<payload>.callback.secora.io` gets routed to port 53 on your OAST server.

## 2. Server Provisioning

1. Spin up a lightweight Linux VM on AWS, DigitalOcean, or Linode (1 vCPU, 1GB RAM is sufficient).
2. Ensure the VM has a public IP address.
3. Open the following ports in your cloud firewall / security group:
   - **Port 80 (TCP)** - HTTP Callbacks
   - **Port 443 (TCP)** - HTTPS Callbacks (Optional, if setting up SSL)
   - **Port 53 (UDP)** - DNS Callbacks

## 3. Deployment

SSH into your newly provisioned cloud instance:

```bash
# 1. Install Docker & Docker Compose
sudo apt-get update
sudo apt-get install -y docker.io docker-compose

# 2. Clone the SECORA repository (or just copy the backend folder)
git clone https://github.com/your-org/secora.git
cd secora/backend

# 3. Start the OAST Server in the background
sudo docker-compose -f docker-compose.oast.yml up -d
```

## 4. Update Backend Configuration

Once the public OAST server is running, update your main SECORA backend environment file (`.env`):

```env
OAST_MODE=production
OAST_DOMAIN=callback.secora.io
```

Restart your main SECORA backend. The vulnerability modules will automatically start generating payloads using `http://<payload>.callback.secora.io` and DNS lookups, perfectly mimicking Burp Collaborator.
