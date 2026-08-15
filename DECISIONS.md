# Decisions

Choices that shaped this work and are not obvious from the code. Newest last.

## The directory is one document, not three endpoints

The apps used to make three requests: config, list, then detail for whichever
platform was tapped. The directory is now also published as a single JSON
document containing all of it.

Why: a file you hand someone has to be self-contained, and somebody filling one
in by hand should have one file to fill in. The consequence that mattered most
was unplanned — with the whole document in hand, the app knows every platform's
sign-in background *before* anything is tapped, which is the only reason
prefetching that artwork is possible at all.

`platforms[]` entries are byte-identical to what `/api/v1/directory/{id}`
returns, so a client that already read that endpoint parses the file with no new
code. The live endpoints stay; nothing was removed.

## Image fields carry either an address or a file name

One field, one rule: a value starting with `http(s)` is downloaded, anything else
is the name of a file shipped inside the app.

The alternative was a second set of `*_asset` fields beside the `*_url` ones.
Rejected: it doubles the fields, and it forces a rule about which one wins when
both are filled — a rule that then has to live in documentation rather than in
the value itself.

## The zip packs only images this deployment hosts

`/p/<slug>/directory.zip` reads images from `data/uploads` and leaves anything
else as the address it already was.

The tempting version fetches every image URL in the document so the bundle is
always complete. That turns the endpoint into a way to make this server issue
requests to any address its network can reach, on demand, from an unauthenticated
route. Not worth a tidier zip. The README names how many images were left behind
and what to do about them.

## A document is always curated, on both platforms

`DIRECTORY_MODE` stays meaningful only for the live-service path. When the
directory comes from a document — hosted or bundled — the app treats it as a
fixed list and ignores the key.

This closes a real hole rather than adding a feature. Both apps fell back to open
search when they could not reach the registry, Android silently, so a white-label
build that started offline showed a search box over every public platform. A
document has no server to ask, so there is nothing to fall back to. The local
`DIRECTORY_MODE: "curated"` guard is still needed for the live-service path, and
is still documented there.

Decided without Ivan (night run). Mirrors what iOS already does, so the two
platforms do not diverge.

## Theme holds a decoded image, not a URL

`Theme.Images.headerBackground` is a `UIImage`, set by `LMSThemeApplier` once the
image is in hand.

The header previously used SwiftUI's `AsyncImage`, which has no cache: every
appearance refetched and showed a placeholder first, which is the flicker that
prompted this. Handing the view something already decoded means it draws in its
first frame. Kingfisher does the fetching and caching; Theme does not depend on
it, because `Core` depends on `Theme` and the reverse would be a cycle.

## Reporting a platform belongs to the universal app

The "Report this LMS" entry point appears only when the directory comes from a
live service. A build reading a document — hosted or bundled — never shows it.

Ivan's call, 2026-08-15: reporting is phase 2. It exists because the open catalog
lets a stranger list anything, which is not a problem a provider shipping their
own five platforms has.

Worth noting what the gate used to be: `isReachable && !curated`, where `curated`
came from a flag the picker wrote and nothing ever cleared. That asked the wrong
question — "is this a curated list?" rather than "is there anywhere to post?" —
and went stale, so a build switched to a document would still show a button
pointing at a registry it no longer talked to. It now derives from the configured
source on both platforms.

## A remembered answer is stamped with the source that gave it

Only the server can say whether a live catalog is curated, and it says so on a
screen the app stops showing once a platform is picked. So the answer has to be
remembered — and remembering it is what went wrong before.

Both apps now store the answer next to a key identifying the directory it came
from (`service:<url>`, `document:<url>`, `file:<name>`), and read it back only
while that key still matches. Point a build somewhere else and what it remembers
is discarded rather than obeyed; a value written by an older build carries no key
at all and is never trusted. `LMSDirectoryState` (iOS) and `LmsDirectoryState`
(Android) hold the whole rule, so the Profile screen asks a question instead of
reading a flag.

The alternative was to clear the flag on every launch and re-ask. Rejected: a
document has nobody to ask, and a service is not reachable at launch, so the
window between launch and the answer would show the wrong screen.
