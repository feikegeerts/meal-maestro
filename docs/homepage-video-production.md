# Homepage Video Production Guide

This guide walks a new teammate through the exact steps required to produce the feature demo videos that appear on the Meal Maestro homepage. Follow the process end to end to capture a polished screen recording, compress it to our delivery formats, add a poster frame, and wire the assets into the site.

## Why These Videos Matter

- They showcase key workflows in context (importing recipes, searching, AI chat, etc.).
- Each clip plays in the `VideoDemo` component and is framed by `/public/video/iphone-template.png` for a mobile-first look.
- Lightweight assets keep the landing page fast; every video must stay small while still looking crisp.

## Current Asset Layout

- Delivery files live under `public/video/<locale>/`.
  - Example: `public/video/nl/search.{webm,mp4}` plus `search-poster.webp`.
- We ship both `webm` (VP9) and `mp4` (H.264) so all browsers have a compatible source.
- Poster images (`*.webp`) are used as the initial frame while the video streams.
- `src/app/[locale]/page-client.tsx` defines which demo loads where.

## Prerequisites

- **Screen recorder**: QuickTime (macOS), OBS, CleanShot, or any tool capable of 60 fps 9:16 recordings.
- **Video editor (optional)**: iMovie, ScreenFlow, Premiere, etc. for trimming, cursor highlighting, or caption overlays.
- **ffmpeg** (command-line encoder). Install via `brew install ffmpeg` on macOS.
- **Node dev server**: `pnpm dev` for final verification.

## Golden Rules

1. Record in 9:16 portrait (target output width 720 px; height will scale automatically).
2. Keep final `mp4` ≤ 3 MB and ≤ 45 s when possible. Shorter is better.
3. Hide sensitive data (emails, tokens) before recording.
4. Use calm pointer movement and zoom so actions are obvious to first-time viewers.
5. Capture a still frame without browser UI for the poster image.

## Step-by-Step Workflow

### 1. Prepare the Environment

1. Start `pnpm dev` and open the feature you want to demonstrate.
2. Set the browser to 390×844 (approx. iPhone 15 Pro) or use the device emulator in Chrome DevTools.
3. Ensure demo data is populated and the UI theme (light/dark) matches the story you want to tell.

### 2. Record the Raw Clip

1. Begin the screen recorder in portrait orientation.
2. Run through the feature slowly:
   - Show any filter/search inputs before typing.
   - Pause briefly after each key interaction so text animates fully.
3. Stop recording once the flow is complete.
4. Save the source file as `feature-name-raw.mov` (or `.mp4`) in a working folder outside the repo.

### 3. Edit & Polish (Recommended)

- Trim dead air at the beginning/end.
- Speed up repetitive waiting time (1.25× speed keeps motion natural).
- Add subtle zoom cuts for critical UI elements, but avoid jump cuts that misalign within the phone frame.
- Export a “mezzanine” master at 1080×2160 or 720×1440, H.264, 60 fps if you edited anything. This file is the input for compression.

### 4. Compress to Delivery Formats

From the repo root, run the following `ffmpeg` commands (adjust file names as needed). They resize to 720 px width, keep portrait aspect, and produce our two browser-friendly codecs.

```bash
# MP4 (H.264) – fast start enabled for streaming
ffmpeg -i ~/captures/recipe-import-master.mp4 \
  -vf "scale=720:-2:flags=lanczos,setsar=1" \
  -c:v libx264 -preset slow -profile:v high -level 4.1 \
  -crf 22 -pix_fmt yuv420p -movflags +faststart \
  -an public/video/nl/recipe-import.mp4

# WEBM (VP9)
ffmpeg -i ~/captures/recipe-import-master.mp4 \
  -vf "scale=720:-2:flags=lanczos,setsar=1" \
  -c:v libvpx-vp9 -b:v 0 -crf 35 -row-mt 1 -deadline good \
  -an public/video/nl/recipe-import.webm
```

Tips:

- Increase `-crf` (e.g., 24 for mp4, 38 for webm) if the output is still >3 MB.
- Include `-r 30` in both commands if you want to halve the frame rate.
- Check size with `stat -f "%z bytes" public/video/nl/recipe-import.mp4`.

### 5. Generate the Poster Frame

Grab a clean still that matches the first interaction. Use the same width so it aligns inside the phone frame.

```bash
ffmpeg -ss 00:00:02 -i ~/captures/recipe-import-master.mp4 \
  -frames:v 1 -vf "scale=720:-2:flags=lanczos,setsar=1" \
  public/video/nl/recipe-import-poster.webp
```

Double-check the output with `file public/video/nl/recipe-import-poster.webp`; it should report `720x1440` (or similar).

### 6. Stage Assets in the Repo

1. Place the three files in `public/video/<locale>/`.
   - Example for Dutch: `public/video/nl/recipe-import.mp4`, `.webm`, `-poster.webp`.
2. If the clip is locale-agnostic (UI in English), store it in `public/video/shared/` and reference that path instead.
3. Keep `iphone-template.png` untouched; it already wraps the video in the UI.

### 7. Wire the Video into the Homepage

Replace the placeholder `VideoDemo` call in `src/app/[locale]/page-client.tsx` with the new sources. Use the existing search demo as a template.

```tsx
<VideoDemo
  disableDefaultContainerChrome
  className="h-full w-full rounded-[34px] bg-black shadow-xl"
  videoClassName="h-full w-full object-cover"
  posterSrc="/video/nl/recipe-import-poster.webp"
  sources={[
    { src: "/video/nl/recipe-import.webm", type: "video/webm" },
    { src: "/video/nl/recipe-import.mp4", type: "video/mp4" },
  ]}
  showControls={false}
  loop
  muted
  playWhenInView
/>
```

Key props:

- `sources`: supply both formats; order matters (`webm` first for browsers that prefer it).
- `playWhenInView`: auto-plays when the section enters the viewport and pauses when it leaves.
- `muted`: ensures autoplay works without browser blocking.
- `loop` + `showControls={false}`: keeps the video seamless and hides native controls inside the mock phone.

Update any translated strings describing the feature in `messages/*` if the copy changes.

### 8. QA Checklist

- [ ] `pnpm dev` → scroll the homepage and confirm the video plays, loops, and resumes if you scroll away/back.
- [ ] Inspect the network tab: the mp4 should be ~2–3 MB, webm usually smaller.
- [ ] Test in Safari (uses mp4) and Chrome/Edge (uses webm).
- [ ] Confirm Lighthouse/LCP does not regress (>250 ms increase suggests the file is too large).
- [ ] Verify no console warnings (CORS, MIME type, missing source).

### 9. Troubleshooting

- **Video freezes on first frame**: autoplay probably blocked—ensure `muted` is true and `playWhenInView` is set.
- **Phone template misaligned**: check the encoded frame size; aim for 720 px width so the aspect matches the CSS container.
- **File keeps re-encoding on commit**: Git LFS is not required; just commit the final compressed assets.
- **Poster looks blurry**: re-export using a frame without motion blur, or capture a still earlier in the video.

### 10. Future Enhancements (Optional Backlog)

- Add locale-specific folders (e.g., `public/video/en/`) once translated UI recordings are available.
- Automate the compression pipeline with an npm script wrapping `ffmpeg`.
- Store source project files (e.g., `.screenflow`) outside the repo and link them in an internal knowledge base.

## Reference Assets

- Existing search demo: `public/video/nl/search.mp4` (45 s, 720×1446, ~2.9 MB).
- Poster frame: `public/video/nl/search-poster.webp`.
- Wrapper template: `public/video/iphone-template.png`.

Use these as quality benchmarks for future recordings.
