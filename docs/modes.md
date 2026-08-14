# Three ways to run it

The same registry runs in three shapes. They differ in one question: **whose
platforms does the app show?**

| | **Open catalog** | **One organization** | **Provider portal** |
|---|---|---|---|
| `DIRECTORY_MODE` | `search` | `curated` | `portal` |
| Whose platforms | Everyone's | Yours | Each provider's own |
| Who runs the server | Us (the pilot) | You | Us — or you, for many providers |
| The app opens onto | A search box | Your fixed list | That provider's fixed list |
| Who can add a platform | Anyone, self-service | Your admins | Each provider, to their own list |
| Learner reports | Yes — that's the point | No | No |
| One app or many | One app for everyone | Your own branded app | One branded app per provider |
| Read more | [For learners](learners.md) | [One organization](provider-mode.md) | [Provider portal](portal-mode.md) |

## Open catalog — one app for the whole ecosystem

The pilot at **[openedx-lms.stepanok.com](https://openedx-lms.stepanok.com)**.
Any owner registers their Open edX platform, and any learner finds it by search
or by URL in one shared app — the Moodle-or-Canvas shape.

Because anyone can list anything, this is the only mode with a moderation side:
learners report platforms from the app, and an admin blocks or dismisses. Nothing
is taken down automatically.

**Pick this if** you want your platform reachable from an app you don't have to
build or maintain.

## One organization — your own server, your own app

You fork the project and run the registry yourself. It lists only your platforms,
there is no public sign-up and no reporting, and your mobile builds point at your
own domain. Nothing about your platforms leaves your infrastructure.

**Pick this if** you run several Open edX platforms and you want the registry
inside your own perimeter. → [One organization (curated)](provider-mode.md)

## Provider portal — many organizations, one server

The same white-label result, without running a server. Each provider registers on
the portal, adds their own platforms, and gets a permanent address
(`/p/<slug>`) to compile into their own builds. Each provider sees and changes
only their own list.

**Pick this if** you want your own branded app across your own platforms and
don't want to operate infrastructure for it. →
[Provider portal](portal-mode.md)

## What the mobile apps see

All three serve the same two endpoints, so **the apps need no code change to move
between them** — only a different `DIRECTORY_URL`:

```yaml
LMS_DIRECTORY:
  ENABLED: true
  DIRECTORY_URL: "https://openedx-lms.stepanok.com"          # open catalog
  # DIRECTORY_URL: "https://registry.example.edu"            # your own server
  # DIRECTORY_URL: "https://providers.example.com/p/your-org" # provider portal
  DIRECTORY_MODE: "curated"   # required for the last two — see below
```

`GET <DIRECTORY_URL>/api/v1/config` tells the app which behaviour to use. It
answers `search` for the open catalog and `curated` for the other two — a
provider-portal address reports `curated` precisely so a provider build behaves
exactly like a self-hosted white-label one.

!!! warning "Set `DIRECTORY_MODE: \"curated\"` in any white-label build"
    Both apps fall back to search mode when the registry is unreachable. Without
    the local flag, a branded app that starts offline opens a search box over
    every public platform. The flag can only add curated mode, never remove it.

See [API reference](api.md) for the endpoints themselves.
