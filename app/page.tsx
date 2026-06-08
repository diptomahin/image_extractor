"use client";

import { ChangeEvent, useMemo, useState } from "react";

const LABELS: Record<number, string> = {
  0: "০",
  1: "১",
  2: "২",
  3: "৩",
  4: "৪",
  5: "৫",
  6: "৬",
  7: "৭",
  8: "৮",
  9: "৯",
  10: "অ",
  11: "আ",
  12: "ই",
  13: "ঈ",
  14: "উ",
  15: "ঊ",
  16: "ঋ",
  17: "এ",
  18: "ঐ",
  19: "ও",
  20: "ঔ",
  21: "ক",
  22: "খ",
  23: "গ",
  24: "ঘ",
  25: "ঙ",
  26: "চ",
  27: "ছ",
  28: "জ",
  29: "ঝ",
  30: "ঞ",
  31: "ট",
  32: "ঠ",
  33: "ড",
  34: "ঢ",
  35: "ণ",
  36: "ত",
  37: "থ",
  38: "দ",
  39: "ধ",
  40: "ন",
  41: "প",
  42: "ফ",
  43: "ব",
  44: "ভ",
  45: "ম",
  46: "য",
  47: "র",
  48: "ল",
  49: "শ",
  50: "ষ",
  51: "স",
  52: "হ",
  53: "ড়",
  54: "ঢ়",
  55: "য়",
  56: "ৎ",
  57: "ং",
  58: "ঃ",
  59: "ঁ",
};

type Box = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ExtractedGrid = {
  id: number;
  label: string;
  source: string;
  url: string;
  blob: Blob;
  box: Box;
};

type ProcessStatus = "idle" | "working" | "done" | "error";

const TARGET_SIZE = 64;
const MAX_LABELS = 60;

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [items, setItems] = useState<ExtractedGrid[]>([]);
  const [status, setStatus] = useState<ProcessStatus>("idle");
  const [message, setMessage] = useState("Upload scanned or photographed pages to begin.");
  const [filenameLabel, setFilenameLabel] = useState("");

  const cleanFilenameLabel = useMemo(() => sanitizeUserLabel(filenameLabel), [filenameLabel]);
  const canDownload = items.length > 0 && status !== "working" && cleanFilenameLabel.length > 0;
  const coverage = useMemo(() => Math.min(items.length, MAX_LABELS), [items.length]);

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []).filter(isImageFile);

    event.target.value = "";

    if (selected.length === 0) {
      setStatus("idle");
      setMessage("Upload JPG, PNG, or other browser-readable image files.");
      return;
    }

    if (items.length >= MAX_LABELS) {
      setStatus("done");
      setMessage("All 60 labels are already filled. Clear the batch to start again.");
      return;
    }

    setFiles((previous) => [...previous, ...selected]);
    setStatus("working");
    setMessage(`Adding ${selected.length} image${selected.length === 1 ? "" : "s"} to the batch...`);

    try {
      const extracted: ExtractedGrid[] = [...items];

      for (const file of selected) {
        const boxes = await detectGridBoxes(file);
        const remaining = MAX_LABELS - extracted.length;
        const cropped = await cropBoxes(file, boxes.slice(0, remaining), extracted.length);
        extracted.push(...cropped);

        if (extracted.length >= MAX_LABELS) {
          break;
        }
      }

      setItems(extracted);
      setStatus("done");
      setMessage(
        extracted.length === MAX_LABELS
          ? "Ready. All 60 character boxes were extracted without the printed borders."
          : `Batch now has ${extracted.length} boxes. Upload the next page to continue labels chronologically.`,
      );
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not process the uploaded images.");
    }
  }

  function clearBatch() {
    revokeItems(items);
    setItems([]);
    setFiles([]);
    setStatus("idle");
    setMessage("Batch cleared. Upload the first page to begin again.");
  }

  function updateItemId(url: string, nextId: number) {
    const id = clamp(Math.round(nextId), 0, MAX_LABELS - 1);

    setItems((previous) =>
      previous.map((item) =>
        item.url === url
          ? {
              ...item,
              id,
              label: LABELS[id],
            }
          : item,
      ),
    );
  }

  function deleteItem(url: string) {
    setItems((previous) => {
      const item = previous.find((candidate) => candidate.url === url);

      if (item) {
        URL.revokeObjectURL(item.url);
      }

      return previous.filter((candidate) => candidate.url !== url);
    });
  }

  async function replaceItemImage(url: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !isImageFile(file)) {
      return;
    }

    try {
      const blob = await normalizeImageFile(file);
      const nextUrl = URL.createObjectURL(blob);

      setItems((previous) =>
        previous.map((item) => {
          if (item.url !== url) {
            return item;
          }

          URL.revokeObjectURL(item.url);

          return {
            ...item,
            blob,
            source: file.name,
            url: nextUrl,
          };
        }),
      );
      setStatus("done");
      setMessage("Replacement image added to the preview.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not replace that image.");
    }
  }

  async function downloadAll() {
    if (items.length === 0) {
      return;
    }

    if (cleanFilenameLabel.length === 0) {
      setStatus("error");
      setMessage("Enter a filename label before downloading.");
      return;
    }

    setStatus("working");
    setMessage("Building ZIP file...");

    const zipBlob = await createZip(
      items.map((item) => ({
        name: getOutputFileName(item.id, cleanFilenameLabel),
        data: item.blob,
      })),
    );

    const url = URL.createObjectURL(zipBlob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "bangla-character-grids.zip";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);

    setStatus("done");
    setMessage("ZIP downloaded.");
  }

  return (
    <main className="min-h-screen bg-[#f7f6f2] text-[#1f2933]">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-6 sm:px-8 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <aside className="flex flex-col gap-5 rounded-lg border border-[#d8d2c4] bg-white p-5 shadow-sm">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#78634f]">
                Bangla ML Dataset Tool
              </p>
              <h1 className="mt-2 text-2xl font-semibold leading-tight text-[#17212b]">
                Grid image extractor
              </h1>
            </div>

            <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-md border border-dashed border-[#a99c88] bg-[#fbfaf7] px-4 py-8 text-center transition hover:border-[#46685b] hover:bg-[#f2f7f4]">
              <span className="text-base font-semibold text-[#22312d]">Upload or add form pages</span>
              <span className="text-sm leading-6 text-[#65706d]">
                Select one or more images. Later uploads are appended after earlier uploads.
              </span>
              <input
                className="sr-only"
                type="file"
                accept="image/*"
                multiple
                disabled={status === "working"}
                onChange={handleFiles}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#78634f]">
                Filename label
              </span>
              <input
                className="h-11 rounded-md border border-[#d8d2c4] bg-[#fbfaf7] px-3 text-sm font-medium text-[#17212b] outline-none transition placeholder:text-[#9a9185] focus:border-[#46685b] focus:bg-white"
                disabled={status === "working"}
                onChange={(event) => setFilenameLabel(event.target.value)}
                placeholder="example: student_001"
                type="text"
                value={filenameLabel}
              />
              <span className="text-xs leading-5 text-[#65706d]">
                Downloads will use names like {cleanFilenameLabel ? `0_${cleanFilenameLabel}.jpg` : "0_your_label.jpg"}.
              </span>
            </label>

            <div className="grid grid-cols-3 gap-3">
              <Metric label="Files" value={files.length.toString()} />
              <Metric label="Images" value={coverage.toString()} />
              <Metric label="Size" value="64x64" />
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-3">
              <button
                className="h-12 rounded-md bg-[#225143] px-5 text-sm font-semibold text-white transition hover:bg-[#183b31] disabled:cursor-not-allowed disabled:bg-[#9aa7a1]"
                disabled={!canDownload}
                onClick={downloadAll}
                type="button"
              >
                Download all grids
              </button>
              <button
                className="h-12 rounded-md border border-[#cfc5b6] px-4 text-sm font-semibold text-[#4f4438] transition hover:bg-[#f2eee7] disabled:cursor-not-allowed disabled:text-[#9aa7a1]"
                disabled={items.length === 0 || status === "working"}
                onClick={clearBatch}
                type="button"
              >
                Clear
              </button>
            </div>

            <div
              className={`rounded-md border px-4 py-3 text-sm leading-6 ${
                status === "error"
                  ? "border-[#d19a8e] bg-[#fff4f1] text-[#8a3325]"
                  : "border-[#d8d2c4] bg-[#fbfaf7] text-[#52605c]"
              }`}
            >
              {message}
            </div>
          </aside>

          <section className="min-h-[640px] rounded-lg border border-[#d8d2c4] bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#17212b]">Extracted character images</h2>
                <p className="text-sm text-[#65706d]">
                  Edit class ids, remove bad crops, or replace individual images before downloading.
                </p>
              </div>
              <span className="text-sm font-medium text-[#46685b]">{coverage}/60 labels</span>
            </div>

            {items.length === 0 ? (
              <div className="flex min-h-[500px] items-center justify-center rounded-md border border-dashed border-[#d8d2c4] bg-[#fbfaf7] px-4 text-center text-sm leading-6 text-[#65706d]">
                Upload the first form image. Add later pages with the same upload control.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6">
                {items.map((item) => (
                  <article
                    className="rounded-md border border-[#e4dfd4] bg-[#fbfaf7] p-3"
                    key={`${item.source}-${item.url}`}
                  >
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <label className="flex items-center gap-1 text-xs font-semibold text-[#17212b]">
                        ID
                        <input
                          className="h-8 w-14 rounded border border-[#d8d2c4] bg-white px-2 text-sm font-semibold outline-none focus:border-[#46685b]"
                          max={MAX_LABELS - 1}
                          min={0}
                          onChange={(event) => updateItemId(item.url, Number(event.target.value))}
                          type="number"
                          value={item.id}
                        />
                      </label>
                      <span className="font-semibold text-[#225143]">{item.label}</span>
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={`Extracted label ${item.id}`}
                      className="mt-3 aspect-square w-full rounded border border-[#e4dfd4] bg-white object-contain"
                      height={TARGET_SIZE}
                      src={item.url}
                      width={TARGET_SIZE}
                    />
                    <p
                      className="mt-2 truncate text-xs text-[#65706d]"
                      title={getOutputFileName(item.id, cleanFilenameLabel || "your_label")}
                    >
                      {getOutputFileName(item.id, cleanFilenameLabel || "your_label")}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <label className="flex h-9 cursor-pointer items-center justify-center rounded border border-[#cfc5b6] bg-white px-2 text-xs font-semibold text-[#4f4438] transition hover:bg-[#f2eee7]">
                        Replace
                        <input
                          accept="image/*"
                          className="sr-only"
                          onChange={(event) => replaceItemImage(item.url, event)}
                          type="file"
                        />
                      </label>
                      <button
                        className="h-9 rounded border border-[#d7b9ae] bg-white px-2 text-xs font-semibold text-[#84372b] transition hover:bg-[#fff4f1]"
                        onClick={() => deleteItem(item.url)}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
      <footer className="border-t border-[#d8d2c4] bg-[#17212b] px-5 py-6 text-white sm:px-8 lg:px-10">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#b8c8bf]">
              Designed and developed by
            </p>
            <p className="mt-1 text-lg font-semibold">Mahin Ahmed Dipta</p>
          </div>
          <p className="max-w-xl text-sm leading-6 text-[#d7ddd9]">
            This project is made to extract data from handwritten forms for the ML Powered Bangla
            Character Recognition System.
          </p>
        </div>
      </footer>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#e4dfd4] bg-[#fbfaf7] px-3 py-2">
      <p className="text-xs font-medium uppercase tracking-wide text-[#78634f]">{label}</p>
      <p className="mt-1 text-lg font-semibold text-[#17212b]">{value}</p>
    </div>
  );
}

async function detectGridBoxes(file: File): Promise<Box[]> {
  const bitmap = await createImageBitmap(file);
  const originalHeight = bitmap.height;
  const analysisWidth = Math.min(1400, bitmap.width);
  const scale = analysisWidth / bitmap.width;
  const analysisHeight = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = analysisWidth;
  canvas.height = analysisHeight;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Canvas is not available in this browser.");
  }

  ctx.drawImage(bitmap, 0, 0, analysisWidth, analysisHeight);
  bitmap.close();

  const imageData = ctx.getImageData(0, 0, analysisWidth, analysisHeight);
  const darkness = buildDarknessMap(imageData.data, analysisWidth, analysisHeight);
  const rows = findHorizontalGridRows(darkness, analysisWidth, analysisHeight);
  const boxes: Box[] = [];

  for (const row of rows) {
    const columns = findVerticalGridLines(darkness, analysisWidth, row.top, row.bottom);

    for (let index = 0; index < columns.length - 1; index += 1) {
      const left = columns[index];
      const right = columns[index + 1];
      const width = right - left;
      const height = row.bottom - row.top;

      if (
        width < analysisWidth * 0.07 ||
        width > analysisWidth * 0.3 ||
        width < height * 0.75 ||
        width > height * 3.1 ||
        height < analysisHeight * 0.035
      ) {
        continue;
      }

      const inset = Math.max(8, Math.round(Math.min(width, height) * 0.1));
      boxes.push({
        x: (left + inset) / scale,
        y: (row.top + inset) / scale,
        width: (width - inset * 2) / scale,
        height: (height - inset * 2) / scale,
      });
    }
  }

  boxes.sort((a, b) => (Math.abs(a.y - b.y) > originalHeight * 0.025 ? a.y - b.y : a.x - b.x));
  return boxes;
}

function buildDarknessMap(data: Uint8ClampedArray, width: number, height: number) {
  const darkness = new Uint8Array(width * height);

  for (let pixel = 0, index = 0; pixel < data.length; pixel += 4, index += 1) {
    const gray = data[pixel] * 0.299 + data[pixel + 1] * 0.587 + data[pixel + 2] * 0.114;
    darkness[index] = Math.max(0, Math.min(255, Math.round((245 - gray) * 2.2)));
  }

  return darkness;
}

function findHorizontalGridRows(darkness: Uint8Array, width: number, height: number) {
  const scores = new Float32Array(height);

  for (let y = 0; y < height; y += 1) {
    scores[y] = longestDarkRunInRow(
      darkness,
      width,
      y,
      Math.round(width * 0.04),
      Math.round(width * 0.96),
      Math.max(6, Math.round(width * 0.015)),
    );
  }

  smoothScores(scores, Math.max(1, Math.round(height * 0.0015)));

  const peaks = mergePeaks(
    scores,
    Math.max(width * 0.14, strongestThreshold(scores, 0.3)),
    Math.max(2, Math.round(height * 0.006)),
  );
  const minGap = height * 0.035;
  const maxGap = height * 0.24;
  const rows: Array<{ top: number; bottom: number }> = [];

  for (let index = 0; index < peaks.length - 1; index += 1) {
    const top = peaks[index];
    const bestBottom = peaks.slice(index + 1).find((candidate) => {
      const gap = candidate - top;
      const columns = gap >= minGap && gap <= maxGap
        ? findVerticalGridLines(darkness, width, top, candidate)
        : [];

      return gap >= minGap && gap <= maxGap && isLikelyBoxRow(columns, width, gap);
    });

    if (bestBottom) {
      rows.push({ top, bottom: bestBottom });
      index = peaks.indexOf(bestBottom);
    }
  }

  return rows.filter((row, index) => {
    const previous = rows[index - 1];
    return !previous || row.top - previous.top > height * 0.035;
  });
}

function findVerticalGridLines(darkness: Uint8Array, width: number, top: number, bottom: number) {
  const scores = new Float32Array(width);
  const rowHeight = bottom - top;

  for (let x = 0; x < width; x += 1) {
    scores[x] = longestDarkRunInColumn(
      darkness,
      width,
      x,
      top + 3,
      bottom - 3,
      Math.max(3, Math.round(rowHeight * 0.08)),
    );
  }

  smoothScores(scores, Math.max(1, Math.round(width * 0.0015)));

  const lines = mergePeaks(
    scores,
    Math.max(rowHeight * 0.46, strongestThreshold(scores, 0.46)),
    Math.max(2, Math.round(width * 0.004)),
  );

  if (lines.length <= 2) {
    return lines;
  }

  return lines.filter((line, index) => {
    const previous = lines[index - 1] ?? -Infinity;
    return line - previous > width * 0.045;
  });
}

function longestDarkRunInRow(
  darkness: Uint8Array,
  width: number,
  y: number,
  startX: number,
  endX: number,
  allowedGap: number,
) {
  let best = 0;
  let run = 0;
  let gap = 0;

  for (let x = startX; x < endX; x += 1) {
    if (darkness[y * width + x] > 22) {
      run += gap + 1;
      gap = 0;
      best = Math.max(best, run);
      continue;
    }

    if (run > 0 && gap < allowedGap) {
      gap += 1;
    } else {
      run = 0;
      gap = 0;
    }
  }

  return best;
}

function longestDarkRunInColumn(
  darkness: Uint8Array,
  width: number,
  x: number,
  startY: number,
  endY: number,
  allowedGap: number,
) {
  let best = 0;
  let run = 0;
  let gap = 0;

  for (let y = startY; y < endY; y += 1) {
    if (darkness[y * width + x] > 22) {
      run += gap + 1;
      gap = 0;
      best = Math.max(best, run);
      continue;
    }

    if (run > 0 && gap < allowedGap) {
      gap += 1;
    } else {
      run = 0;
      gap = 0;
    }
  }

  return best;
}

function isLikelyBoxRow(columns: number[], pageWidth: number, rowHeight: number) {
  if (columns.length < 2 || columns.length > 8) {
    return false;
  }

  const cellWidths = columns.slice(1).map((line, index) => line - columns[index]);
  const validCells = cellWidths.filter(
    (cellWidth) =>
      cellWidth > pageWidth * 0.07 &&
      cellWidth < pageWidth * 0.3 &&
      cellWidth > rowHeight * 0.75 &&
      cellWidth < rowHeight * 3.1,
  );

  if (validCells.length === 0) {
    return false;
  }

  if (validCells.length === 1) {
    return true;
  }

  const average = validCells.reduce((sum, cellWidth) => sum + cellWidth, 0) / validCells.length;
  const similarCells = validCells.filter(
    (cellWidth) => cellWidth > average * 0.55 && cellWidth < average * 1.6,
  );

  return similarCells.length >= Math.min(2, validCells.length);
}

function mergePeaks(scores: Float32Array, threshold: number, padding: number) {
  const peaks: number[] = [];
  let start = -1;
  let weighted = 0;
  let total = 0;
  let misses = 0;

  for (let index = 0; index < scores.length; index += 1) {
    if (scores[index] >= threshold) {
      if (start < 0) {
        start = index;
        weighted = 0;
        total = 0;
      }

      weighted += index * scores[index];
      total += scores[index];
      misses = 0;
      continue;
    }

    if (start >= 0) {
      misses += 1;

      if (misses <= padding) {
        continue;
      }

      peaks.push(Math.round(weighted / Math.max(total, 1)));
    }

    start = -1;
    misses = 0;
  }

  if (start >= 0) {
    peaks.push(Math.round(weighted / Math.max(total, 1)));
  }

  return peaks;
}

function strongestThreshold(scores: Float32Array, ratio: number) {
  let max = 0;

  for (const score of scores) {
    max = Math.max(max, score);
  }

  return max * ratio;
}

function smoothScores(scores: Float32Array, radius: number) {
  if (radius <= 0) {
    return;
  }

  const copy = new Float32Array(scores);

  for (let index = 0; index < scores.length; index += 1) {
    let total = 0;
    let count = 0;

    for (
      let sample = Math.max(0, index - radius);
      sample <= Math.min(scores.length - 1, index + radius);
      sample += 1
    ) {
      total += copy[sample];
      count += 1;
    }

    scores[index] = total / count;
  }
}

async function cropBoxes(file: File, boxes: Box[], startId: number): Promise<ExtractedGrid[]> {
  const bitmap = await createImageBitmap(file);
  const results: ExtractedGrid[] = [];

  for (let index = 0; index < boxes.length; index += 1) {
    const id = startId + index;

    if (id >= MAX_LABELS) {
      break;
    }

    const canvas = document.createElement("canvas");
    canvas.width = TARGET_SIZE;
    canvas.height = TARGET_SIZE;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Canvas is not available in this browser.");
    }

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, TARGET_SIZE, TARGET_SIZE);

    const box = boxes[index];
    ctx.drawImage(
      bitmap,
      box.x,
      box.y,
      box.width,
      box.height,
      0,
      0,
      TARGET_SIZE,
      TARGET_SIZE,
    );

    const blob = await canvasToBlob(canvas, "image/jpeg", 0.92);

    results.push({
      id,
      label: LABELS[id],
      source: file.name,
      url: URL.createObjectURL(blob),
      blob,
      box,
    });
  }

  bitmap.close();
  return results;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Could not create an image from one of the boxes."));
        }
      },
      type,
      quality,
    );
  });
}

async function normalizeImageFile(file: File) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = TARGET_SIZE;
  canvas.height = TARGET_SIZE;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    bitmap.close();
    throw new Error("Canvas is not available in this browser.");
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, TARGET_SIZE, TARGET_SIZE);
  ctx.drawImage(bitmap, 0, 0, TARGET_SIZE, TARGET_SIZE);
  bitmap.close();

  return canvasToBlob(canvas, "image/jpeg", 0.92);
}

function getOutputFileName(id: number, filenameLabel: string) {
  return `${id}_${filenameLabel}.jpg`;
}

function sanitizeUserLabel(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "");
}

function isImageFile(file: File) {
  return file.type.startsWith("image/") || /\.(avif|bmp|gif|jpe?g|png|webp)$/i.test(file.name);
}

function revokeItems(items: ExtractedGrid[]) {
  for (const item of items) {
    URL.revokeObjectURL(item.url);
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

async function createZip(files: Array<{ name: string; data: Blob }>) {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const fileBytes = new Uint8Array(await file.data.arrayBuffer());
    const crc = crc32(fileBytes);
    const local = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(local.buffer);

    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, 0, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, fileBytes.length, true);
    localView.setUint32(22, fileBytes.length, true);
    localView.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);

    localParts.push(local, fileBytes);

    const central = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(central.buffer);

    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, 0, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, fileBytes.length, true);
    centralView.setUint32(24, fileBytes.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint32(42, offset, true);
    central.set(nameBytes, 46);

    centralParts.push(central);
    offset += local.length + fileBytes.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);

  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);

  return new Blob([...localParts, ...centralParts, end].map(toArrayBuffer), {
    type: "application/zip",
  });
}

function toArrayBuffer(part: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(part.length);
  copy.set(part);
  return copy.buffer;
}

const CRC_TABLE = new Uint32Array(256).map((_, index) => {
  let value = index;

  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }

  return value >>> 0;
});

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}
