---
name: add-paperclip
description: Add Paperclip project management webhook integration. Receives Paperclip events, filters noise (only agent-created issues, comments, and failures notify), and summarizes them in your messaging channel.
---

# Add Paperclip Integration

Adds a `/paperclip` webhook endpoint for receiving Paperclip project management events.

**Prerequisite:** The webhook channel must be installed first. If `src/channels/webhook.ts` does not exist, run `/add-webhook` first.

## Phase 1: Pre-flight

1. Check if `src/channels/webhook.ts` exists — if not, tell user to run `/add-webhook` first
2. Check if `src/plugins/paperclip.ts` exists — skip to Phase 3 if already applied

## Phase 2: Apply Code Changes

### Merge the skill branch

```bash
git fetch upstream skill/paperclip
git merge upstream/skill/paperclip || {
  git checkout --theirs package-lock.json
  git add package-lock.json
  git merge --continue
}
```

This merges in:
- `src/plugins/paperclip.ts` — Paperclip event handler with filtering
- Import and registration in `src/index.ts`
- `groups/webhook_main/CLAUDE.md` — Agent instructions for summarizing events

### Validate

```bash
npm install
npm run build
```

## Phase 3: Configure

### Set up Paperclip webhook

Tell the user:

> In your Paperclip settings, add a webhook URL pointing to your NanoClaw instance:
>
> `https://<your-domain>/paperclip`
>
> (or `http://localhost:<port>/paperclip` for local testing)

### Build and restart

```bash
npm run build
# macOS:
launchctl kickstart -k gui/$(id -u)/com.nanoclaw
# Linux:
# systemctl --user restart nanoclaw
```

## Phase 4: Verify

Test the endpoint:

```bash
curl -s -X POST http://localhost:<port>/paperclip -H "Content-Type: application/json" -d '{"type":"webhook.test","data":{"message":"Test event"}}'
```

Check the linked messaging channel for the agent's response.

## Event Filtering

Only these events trigger notifications:

| Event | When it notifies |
|-------|-----------------|
| `issue.created` | Only if created by an agent (not human) |
| `issue.comment.created` | Only if created by an agent |
| `agent.run.failed` | Always |
| `agent.run.cancelled` | Always |
| `webhook.test` | Always |

All other events (`issue.updated`, `agent.run.started`, `agent.run.finished`, etc.) are silently acked — no container is spun up, no message is sent.

Human-created events are detected by checking the `actor`, `createdBy`, or `source` fields in the payload for agent-related keywords.

## Customizing Filters

Edit `src/plugins/paperclip.ts`:

- **Add events:** Add event types to `NOTIFY_EVENTS`
- **Change actor detection:** Modify the `shouldNotify` function
- **Change formatting:** The agent reads raw JSON — modify `groups/webhook_main/CLAUDE.md` to change how events are summarized
