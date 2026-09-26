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
- Edition `cowboy-bebop` is the Cowboy Bebop shelf. Edition `akira-1988` is the Akira (1988) shelf. Edition `final-fantasy-7` is the Final Fantasy 7 shelf. Edition `halloween` is the Limited edition shelf. Edition `mace-windu` is the Mace Windu shelf. Edition `veil-vane` is the Veil & Vane Award Winners shelf. All six stay out of All wallpapers and out of Most loved. The large view always opens on the newest wallpaper that is not Mace Windu or Veil & Vane. A Halloween item with editionFeatured follows that opener. Mace Windu and Veil & Vane stay out of the large view. Shelf order after the large view is Cowboy Bebop, Akira (1988), Final Fantasy 7, All wallpapers, Limited edition, Veil & Vane, then Mace Windu. Most recent and Most popular reorder each section. Most popular follows download counts.
- Deploy: `powershell -ExecutionPolicy Bypass -File .\deploy.ps1`
- Version lives in `public/catalog.json` (`version`) and `public/VERSION`. Keep them together. Share-card query uses that version.
- Fonts: Clash Display + Satoshi, self-hosted. Do not swap in Inter.
