# MCP Servers in Docker & HTTPS for Copilot Studio

This section outlines a concise, practical flow to host MCP servers in Docker on an Ubuntu host and expose them securely to Copilot Studio over HTTPS. It ends with adding the example repo [si---mcp---studio](https://github.com/sveins/si---mcp---studio).

## Prerequisites

- Domain name pointing to your Ubuntu server (create an A record).
- Ubuntu 20.04+ with Docker and Docker Compose installed.
- Ports 80 and 443 open (for ACME http-01 or TLS via reverse proxy).

## High-level Steps

1. Clone or build your MCP server image (example repo below).
2. Create a Docker Compose stack that runs the MCP service and a reverse proxy (Caddy or Nginx) for TLS.
3. Point your domain to the server and start the stack with `docker compose up -d`.
4. Verify HTTPS and configure Copilot Studio to use the secure endpoint.

## Example: docker-compose.yml (MCP + Caddy)

```yaml
version: '3.8'
services:
  mcp:
    image: sveins/si---mcp---studio:latest
    restart: unless-stopped
    environment:
      - PORT=8080
    expose:
      - "8080"
    networks:
      - web

  caddy:
    image: caddy:2
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - web

networks:
  web:
    external: false

volumes:
  caddy_data: {}
  caddy_config: {}
```

## Example: Caddyfile

```text
your.domain.example {
  reverse_proxy mcp:8080
  tls you@your-email.example
}
```

## Commands

```bash
# Clone the example repo
git clone https://github.com/sveins/si---mcp---studio.git
cd si---mcp---studio

# Copy or create docker-compose.yml and Caddyfile on your Ubuntu host
docker compose up -d
```

## Notes & Tips

- **Use Caddy for simple automatic TLS**: Caddy obtains certificates automatically via Let's Encrypt and requires minimal configuration.
- **Alternative: Nginx + Certbot** — If you prefer Nginx, terminate TLS with Certbot-managed certificates and reverse proxy to the MCP container.
- **Health checks:** add a simple HTTP health endpoint in the MCP container for uptime checks.
- **Firewall:** allow 80 and 443 through UFW: `sudo ufw allow 80,443/tcp`.
- **Onboarding to Copilot Studio:** In Copilot Studio, point the MCP integration to `https://your.domain.example` and ensure API keys/credentials are configured as required by your MCP images.

If you want, I can also add the example `docker-compose.yml` and `Caddyfile` into this project, or tailor the instructions to a specific domain or MCP image you use.
