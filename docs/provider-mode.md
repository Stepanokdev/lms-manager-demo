# Provider / white-label mode

Some organizations run more than one Open edX platform and want a single branded
app that lists **their** platforms only — no public search. That's **curated mode**.

## How it differs from the pilot

| | Search mode (pilot default) | Curated mode (provider) |
|---|---|---|
| Who's in the catalog | Anyone who registers | Only the platforms you feature |
| Learner's first screen | A search box | Your platforms, listed directly |
| Best for | A public, shared app | One provider's own branded app |

## Set it up

1. **Fork this repository** and deploy your own registry (see
   [Configuration & deployment](deploying.md)).
2. Set `DIRECTORY_MODE=curated`, plus your `PROVIDER_NAME` and `PROVIDER_TAGLINE`.
3. Register each of your platforms through the wizard. In the console open **LMS
   instances** and toggle the **star** to feature each one; `sort_order` controls
   the order learners see.
4. Point your mobile builds at your registry:
    - **iOS** — `LMS_DIRECTORY_URL` in `rg-feature-flags.yaml`
    - **Android** — `LMS_DIRECTORY_URL` (and optionally `DIRECTORY_MODE`) in
      `core/assets/config/rg_config.json`

In curated mode the app skips the search box and shows your featured list directly.
Switching back to `search` turns it into the open public catalog again.

## Example `provider_config.json`

Drop this at the repository root (environment variables override it):

```json
{
  "directory_mode": "curated",
  "provider_name": "Acme Learning",
  "provider_tagline": "All of Acme's academies in one app",
  "webhook_url": "https://hooks.slack.com/services/…"
}
```
