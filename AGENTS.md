# Wallpapers

Public download site for original wallpapers. Live: https://wallpaper.jonbailey.xyz/

- The file under `public/files/` is the original. Do not recompress it.
- The page shows previews only. Downloads go through `/dl/:id`, which counts the save and attaches the original filename.
- A wallpaper may also have a phone file. The page shows Download for phone only when that file is present. `/dl/:id?screen=phone` serves it, and a real save of that file counts on its own.
- The header total is the sum of each wallpaper's download count. That count is listed once, on the shelf when the shelf is present.
- `/files/*` stays closed. `env.ASSETS.fetch` is how `/dl/` reads the bytes.
- Most loved and newest are computed in `functions/_lib/rank.js`. Do not hard-code a featured id.
- No accounts. One love per network is the KV key `loverl:{hash}:{id}`.
- KV binding: `COUNTS` on Pages project `wallpapers-jonbailey`.
- English only.
- Edition `halloween` is the Limited edition shelf. Edition `mace-windu` is the Mace Windu shelf. Edition `veil-vane` is the Veil & Vane Award Winners shelf. All three stay out of All wallpapers and out of Newest and Most loved. A wallpaper with `featured` opens the large view, including a pin that lives on a side shelf. A Halloween item with editionFeatured follows it. When nothing is featured, that Halloween item opens the large view. An unfeatured Veil & Vane wallpaper stays out of the large view.
- Deploy: `powershell -ExecutionPolicy Bypass -File .\deploy.ps1`
- Version lives in `public/catalog.json` (`version`) and `public/VERSION`. Keep them together. Share-card query uses that version.
- Fonts: Clash Display + Satoshi, self-hosted. Do not swap in Inter.
