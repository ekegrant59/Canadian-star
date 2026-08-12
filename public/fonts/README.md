# Fonts

Self-hosted via `next/font/local` (see `src/lib/fonts.ts`). No external font
requests: keeps the CSP tight, removes a third party from the critical path, and
avoids a disclosure in the privacy policy.

## Files expected

| File                            | Family        | Use               |
| ------------------------------- | ------------- | ----------------- |
| `Epilogue-Variable.woff2`       | Epilogue      | Body copy, UI     |
| `Epilogue-VariableItalic.woff2` | Epilogue      | Italic body copy  |
| `ClashGrotesk-Variable.woff2`   | Clash Grotesk | Headings, display |

Drop the `.woff2` files in this directory using exactly these names and the app
picks them up. Nothing else needs to change.

## Where to get them

- **Epilogue** — SIL Open Font License. Available from Google Fonts. Convert the
  variable TTF to WOFF2 (`fonttools`, `woff2_compress`, or an online converter).
- **Clash Grotesk** — Indian Type Foundry, distributed through Fontshare. Check
  the licence terms cover web embedding for this use before launch.

## Licensing note

Confirm both licences permit web embedding for a commercial event site, and keep
a copy of the licence with the project handoff. This is a public-facing brand
with sponsors attached, so an unlicensed webfont is a real liability rather than
a technicality.

## Until the files are added

`next/font/local` throws at build time if a referenced file is missing, so the
app falls back to the system sans stack through the CSS variables in
`globals.css`. Once the files land, no code change is needed.
