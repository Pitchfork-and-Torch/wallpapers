# Wallpapers

Original wallpapers, free, at full resolution. No account.

The homepage features two placements:

- **Newest** is the wallpaper added most recently.
- **Most loved** is the wallpaper with the most loves. A tie goes to the one with more downloads, then to the newer one.

Cowboy Bebop is a separate section of Grok Bot desktop wallpapers in a jazz-noir colony. The set stays out of All wallpapers. Its newest piece opens the large view while it is the newest on the site.

Akira (1988) is a separate section of Grok Bot desktop wallpapers in a late-1980s megacity at night. The set stays out of All wallpapers. Its newest piece opens the large view while it is the newest on the site.

Limited edition is a separate section: spooky scary Halloween Grok Bot desktop wallpapers. While that set is current, the wallpaper marked editionFeatured sits in the large view after the featured wallpaper. If nothing is featured, that piece opens the large view. The set stays out of All wallpapers. Newest and most loved are chosen from the main set. Clear editionFeatured when the set is archived.

Mace Windu is a separate section for edition mace-windu. Those wallpapers stay out of All wallpapers and out of the large view. Newest and most loved stay on the main set.

Veil & Vane Award Winners is a separate section for edition veil-vane. Those honorary wallpapers stay out of All wallpapers and out of Newest and Most loved. An unfeatured one stays out of the large view. A featured pin opens the large view.

The picture on the page is a preview. Download returns the original file. Direct links to the original path are not public. Loves are one per network, remembered on this site. Downloads are counted when the original file is saved. A resumed partial save is not counted again. Download all adds one save to every wallpaper. The number at the top is the sum of the download count listed once on each wallpaper. Where a wallpaper has a phone-shaped file, that download is full resolution too.

## Add a wallpaper

```powershell
py -3 scripts/add_wallpaper.py --src path\to\file.png --id slug --title "Title" --summary "One sentence."
powershell -ExecutionPolicy Bypass -File .\deploy.ps1
```

The script copies the original bytes, writes previews, and rebuilds the share card from the newest wallpaper.

## Deploy

Cloudflare Pages project `wallpapers-jonbailey`, with a KV binding named `COUNTS`.

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy.ps1
```

Live: https://wallpaper.jonbailey.xyz/
