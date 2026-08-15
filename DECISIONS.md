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
