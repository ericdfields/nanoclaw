---
name: add-webhook
description: Add a generic HTTP webhook channel to NanoClaw. Receives external webhooks and forwards agent responses to a linked messaging channel. Supports plugin routes for integrations like Paperclip.
---

# Add Webhook Channel

Adds an HTTP webhook server so external services can trigger your NanoClaw agent.

## Phase 1: Pre-flight

Check if `src/channels/webhook.ts` exists. If it does, skip to Phase 3.

## Phase 2: Apply Code Changes

### Merge the skill branch

```bash
git fetch upstream skill/webhook
git merge upstream/skill/webhook || {
  git checkout --theirs package-lock.json
  git add package-lock.json
  git merge --continue
}
```

### Validate

```bash
npm install
npm run build
```

## Phase 3: Configure

AskUserQuestion: Which messaging channel should webhook responses be forwarded to?

Collect the JID of the linked channel (e.g., `tg:123456789` for Telegram, `120363...@g.us` for WhatsApp).

AskUserQuestion: What port should the webhook server listen on? (default: 3200)

Add to `.env`:

```bash
WEBHOOK_PORT=<port>
WEBHOOK_LINKED_JID=<linked-jid>
```

Sync to container environment:

```bash
mkdir -p data/env && cp .env data/env/env
```

### Register webhook group

```bash
npx tsx setup/index.ts --step register -- --jid "webhook:default" --name "Webhook" --folder "webhook_main" --trigger "@${ASSISTANT_NAME}" --channel webhook --no-trigger-required
```

### Build and restart

```bash
npm run build
# macOS:
launchctl kickstart -k gui/$(id -u)/com.nanoclaw
# Linux:
# systemctl --user restart nanoclaw
```

## Phase 4: Verify

Test the webhook:

```bash
curl -s http://localhost:<port>/health
curl -s -X POST http://localhost:<port>/webhook -H "Content-Type: application/json" -d '{"message":"Hello from webhook test"}'
```

Tell user to check their linked messaging channel for the agent's response.

## Endpoints

- `GET /health` — returns `{ "status": "ok" }`
- `POST /webhook` — accepts `{ "message": "...", "sender": "..." }`, returns `202 Accepted`

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `WEBHOOK_PORT` | No | 3200 | HTTP server port |
| `WEBHOOK_LINKED_JID` | Yes | — | JID of the channel to forward responses to |

## Exposing Publicly

For external services to reach the webhook, users need a tunnel:

- **Cloudflare Tunnel**: Add hostname to `~/.cloudflared/config.yml`, run `cloudflare tunnel route dns`
- **ngrok**: `ngrok http <port>`

## Plugin Routes

Other skills can register custom routes on the webhook server:

```typescript
import { getWebhookChannel } from '../channels/webhook.js';

const webhook = getWebhookChannel();
webhook?.addRoute({
  path: '/my-service',
  handle: (data) => {
    // Return { message, sender } to forward, or null to silently ack
    return { message: `Event: ${data.type}`, sender: 'my-service' };
  },
});
```
