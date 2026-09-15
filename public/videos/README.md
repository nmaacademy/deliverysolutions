# Intro video

Copy the opening clip here, named exactly:

```
public/videos/intro.mp4
```

The app requests it at `/videos/intro.mp4` (see `VIDEO_SRC` in `src/features/intro/SiteIntro.tsx`).
Files in `public/` are served as-is and copied straight into `dist/` — the clip is never imported
into the JavaScript bundle and never inlined as a data URL.

Nothing breaks while the file is missing: the `<video>` element fires `error`, the intro hands over
and the site appears. The same happens if playback cannot start within 5 seconds.

## What the clip should be

- **Container / codec:** MP4, H.264 + AAC (or no audio at all — it is played muted).
- **Length:** a few seconds. There is no skip control for the first 1.5s, and playback is never cut
  short once it has begun, so a long clip keeps visitors waiting.
- **Framing:** it is drawn with `object-fit: cover`, so the edges are cropped on a narrow phone.
  Keep anything that matters near the middle, or change `VIDEO_OBJECT_POSITION` in `SiteIntro.tsx`.
- **Size:** keep it small; it is fetched before the site is revealed.

Visitors with "reduce motion" enabled never download it.
