# Bangla Grid Image Extractor

Bangla Grid Image Extractor is a browser-based tool for extracting individual handwritten Bangla character samples from scanned data collection forms. It is designed for preparing 64x64 image datasets for an ML Powered Bangla Character Recognition System.

The app runs locally in the browser. Uploaded form images are processed client-side, previewed for correction, and downloaded as a ZIP of labeled `.jpg` files.

## Features

- Upload one or more scanned form images.
- Add pages chronologically, one upload after another.
- Detect grid boxes from form borders.
- Crop each grid cell into a uniform `64x64` JPEG image.
- Remove visible grid borders by cropping inside the detected cell.
- Preview every extracted image before download.
- Edit individual class IDs from the preview.
- Delete incorrect crops.
- Replace a crop manually with another image.
- Download all prepared images with one button.
- Use a user-provided filename label for the output files.

## Character Labels

The numeric class ID represents the Bangla character label. The project uses labels `0-59`:

```ts
0-9     Bangla digits
10-20   Bangla vowels
21-59   Bangla consonants and signs
```

Example:

```text
0  -> ০
10 -> অ
21 -> ক
59 -> ঁ
```

## Output Format

Every downloaded image is:

- JPEG format
- `64x64` pixels
- named with the class ID and user-provided filename label

Example, if the filename label is `student_001`:

```text
0_student_001.jpg
1_student_001.jpg
2_student_001.jpg
...
59_student_001.jpg
```

The filename label must be entered before downloading.

## Workflow

1. Run the app locally.
2. Enter a filename label, such as a student ID, collector ID, or form ID.
3. Upload the first scanned form page.
4. Review the extracted images in the preview grid.
5. Upload the next page if needed. New images are appended after the existing ones.
6. Correct any wrong preview item:
   - change its numeric class ID,
   - delete it,
   - or replace it with a manually prepared image.
7. Click `Download all grids` to download a ZIP file.

## Local Development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL printed by Next.js, usually:

```text
http://localhost:3000
```

## Scripts

```bash
npm run dev
```

Runs the local development server.

```bash
npm run build
```

Builds the app for production.

```bash
npm run start
```

Starts the production server after building.

```bash
npm run lint
```

Runs ESLint.

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Browser Canvas API

## Notes

- For best results, upload clear scans or photos where grid borders are visible.
- If a crop is wrong, use the preview editing controls before downloading.
- The app processes images in the browser and does not require a backend upload service.

## Credit

Designed and developed by **Mahin Ahmed Dipta**.

This project is made to extract data from handwritten forms for the ML Powered Bangla Character Recognition System.
