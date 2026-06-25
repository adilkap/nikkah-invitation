# Amna & Adil — Nikkah Invitation

An elegant single-page digital wedding (Nikkah) invitation. It opens as a
wax-sealed envelope with scattered watercolour foliage; tapping the seal swings
the envelope open and the invitation card rises into view — ivory damask paper,
a gold ornate frame, floral corners, and gold script names.

Built with plain HTML, CSS and JavaScript — no build step, no dependencies.

## Run locally

Just open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Customise

All wording lives in `index.html`:

| What | Where |
|------|-------|
| Couple's names | `.names` block (`Amna` / `Adil`) |
| Monogram on the wax seal | the `<text>` inside `#seal` (`A&A`) |
| Date & time | `.when` block |
| Venue | `.venue` block |
| RSVP target | `href` on the `.rsvp-btn` link |

> **Note:** date, time and venue are placeholders — update them in
> `index.html`.

Colours and fonts are defined as CSS variables at the top of `styles.css`
(`--gold`, `--ink`, `--cream`, …).

### Artwork

The florals (`assets/floral-corner.svg`), envelope foliage
(`assets/leaves.svg`) and wax seal are hand-built SVG so they scale crisply and
carry no licensing baggage. Swap them for your own art any time.

## Deploy (GitHub Pages)

Push to GitHub, then **Settings → Pages → Deploy from branch → `main` / root**.
