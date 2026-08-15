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

## The directory has three states, not two, and is re-asked every launch

Only the server can say whether a live catalog is open to anyone, and it says so
on a screen the app stops showing once a platform is picked. So the answer has to
be remembered — and remembering it as a boolean is what went wrong.

A boolean has no room for "nobody has said yet", so the absent value had to mean
something, and it meant *open*. That is the wrong default twice over: an upgraded
install and a build pointed at a new registry both start there, and both would
show a learner a "Report this LMS" button for a catalog nobody had vouched for.

So: `unknown | search | curated`, stored next to a key naming the directory it
came from (`service:<url>`, `document:<url>`, `file:<name>`) and read back only
while that key still matches. Reporting appears only on `search`. A document
settles it locally; `DIRECTORY_MODE` settles it either way; everything else is
unknown until the server answers, and unknown shows nothing.

The answer is refreshed at launch rather than only by the platform picker,
because a learner who has chosen a platform never sees the picker again — without
it, a registry that switched modes at the same address would go unnoticed for the
life of the install. A failed refresh changes nothing: a network error is not
evidence about what kind of catalog this is. And the state is observable
(`@Published` / a `StateFlow`), so the entry point appears when the answer
arrives rather than on the next visit to the screen.
