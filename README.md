# companion-module-tfc

Companion connection for NEP TFC routing panels.

You point it at a TFC host and a panel slug. The module loads that panel’s sources and targets, lets you take routes from Stream Deck (or whatever surface Companion is driving), and keeps button feedback in sync when routes change — including routes taken somewhere else, like a physical TFC panel.

Requires **Companion 4.3+** (module API 2 / Node 22).

## Config

| Field | What to put |
| --- | --- |
| **TFC QFDN** | Host only, e.g. `secp.nepgroup.io` (not `https://…`) |
| **Panel slug** | From TFC: All Panels → Edit → slug |
| **Username / password** | Normal TFC user credentials |

Password is stored as a Companion secret.

## How it talks to TFC

Two REST surfaces:

1. **Take a route** — `POST /v1/api/routing/tag/{targetTagId}`  
   Body is a list of `{ level, source_tag }` (video / audio1 / meta).  
   A `200` means the routing service accepted the request and handed instructions to the drivers. The crosspoint itself finishes a moment later.

2. **See what’s actually routed** — `GET /v1/api/tags/{id}` and read `_embedded.route_state`  
   On connect we load every target on the panel that way. After that we poll those tags about once a second so feedback follows other operators and hardware panels.

Auth is the usual TFC JWT from `/v1/api/login_check`, sent as `Authorization: Bearer …` with `x-context: user`. Tokens are refreshed when they expire.

OpenAPI for the routing calls lives in [`companion/Routing_uSVC.yaml`](companion/Routing_uSVC.yaml).

## Mental model in Companion

- **Sources / targets** come from the first section on the configured panel.
- **Routing domain** is a local Companion idea (a number on actions/feedbacks). It’s just “which selected-target slot am I talking about?” so you can run more than one independent take bank on the same surface. It is not a TFC routing domain.
- Selecting a target stores a reference to that panel target object. When poll (or a successful take) updates `sources` on that object, the green “routed” feedbacks update with it.

### Actions

- **Select Target** — toggle the selected target for a routing domain
- **Route Source to Selected Target** — take using the current selection
- **Route Source to Target** — take with both ends picked in the action
- **Route by SectionIndex** — same thing, but addressed by the panel button index (handy with variables)
- **Route by UUID** — take with source/target tag UUIDs (text fields, variables allowed). Targets used on Stream Deck buttons are added to the poll set automatically, even if they are not on the TFC panel.

Levels are checkboxes: video, audio, meta.

### Feedbacks

- **Selected Target** — is this target selected in that domain?
- **Routed source of selected target** — is this source currently on the selected target?
- **Feedback on SectionIndex** — is source index N routed to target index M (optional per level)?
- **Routed source to target by UUID** — is this source UUID currently on that target UUID (polls the target even when it is outside the configured panel)

### Variables

For each source/target on the panel you get `sectionIndex{n}` with the button label.

For each panel target and level (`video`, `audio1`, `meta`) you also get:

- `target_{n}_{level}_source` — label of the source currently routed on that level
- `target_{n}_{level}_source_index` — SectionIndex of that source (empty if unknown / not on the panel)

These update when route state changes (own takes and polled external routes).

## Develop

```bash
yarn install
yarn build
yarn lint
```

`yarn package` builds a Companion module package. Use `yarn --ignore-engines` if your local Node isn’t in the Companion runtime range; the module still runs under Companion’s Node 22.
