"use client";

import { ChangeEvent, useState } from "react";

type RenameMode = "prefix" | "suffix" | "replace" | "sequential";

type ImageItem = {
    file: File;
    url: string;
};

export default function BatchRenamePage() {
    const [images, setImages] = useState<ImageItem[]>([]);
    const [mode, setMode] = useState<RenameMode>("prefix");
    const [text, setText] = useState("");

    function handleUpload(e: ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files ?? [])
            .filter((f) => f.type.startsWith("image/"))
            .slice(0, 60 - images.length);

        setImages((prev) => [
            ...prev,
            ...files.map((file) => ({
                file,
                url: URL.createObjectURL(file),
            })),
        ]);

        e.target.value = "";
    }

    function remove(url: string) {
        setImages((prev) => {
            const img = prev.find((x) => x.url === url);
            if (img) URL.revokeObjectURL(img.url);
            return prev.filter((x) => x.url !== url);
        });
    }

    function clearAll() {
        images.forEach((i) => URL.revokeObjectURL(i.url));
        setImages([]);
    }

    function renamed(file: File, index: number) {
        const dot = file.name.lastIndexOf(".");
        const name = dot === -1 ? file.name : file.name.substring(0, dot);
        const ext = dot === -1 ? "" : file.name.substring(dot + 1);

        switch (mode) {
            case "prefix":
                return `${text}${name}.${ext}`;
            case "suffix":
                return `${name}${text}.${ext}`;
            case "replace":
                return `${text}.${ext}`;
            case "sequential":
                return `${text}_${index}.${ext}`;
        }
    }

    async function downloadZip() {
        if (!images.length) return;

        const zip = await createZip(
            await Promise.all(
                images.map(async (img, i) => ({
                    name: renamed(img.file, i),
                    data: new Blob([await img.file.arrayBuffer()], {
                        type: img.file.type,
                    }),
                }))
            )
        );

        const url = URL.createObjectURL(zip);

        const a = document.createElement("a");
        a.href = url;
        a.download = "renamed-images.zip";
        a.click();

        URL.revokeObjectURL(url);
    }

    return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 p-8">
        <div className="mx-auto max-w-7xl rounded-2xl bg-white p-6 shadow-xl border border-gray-200">
            
            {/* Header */}
            <h1 className="text-3xl font-extrabold text-indigo-700">
                Batch Image Renamer
            </h1>

            {/* Controls */}
            <div className="mt-6 grid gap-4 md:grid-cols-4">
                
                {/* Upload */}
                <label className="rounded-xl border-2 border-dashed border-indigo-400 bg-indigo-50 p-6 text-center cursor-pointer hover:bg-indigo-100 transition font-medium text-indigo-700">
                    Upload Images
                    <input
                        hidden
                        multiple
                        accept="image/*"
                        type="file"
                        onChange={handleUpload}
                    />
                </label>

                {/* Mode */}
                <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as RenameMode)}
                    className="border border-indigo-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                    <option value="prefix">Prefix</option>
                    <option value="suffix">Suffix</option>
                    <option value="replace">Replace Name</option>
                    <option value="sequential">Sequential</option>
                </select>

                {/* Text Input */}
                <input
                    className="border border-indigo-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Enter text (e.g. IMG_ or 01_)"
                />

                {/* Download */}
                <button
                    onClick={downloadZip}
                    className="rounded-lg bg-emerald-600 hover:bg-emerald-700 transition text-white font-semibold shadow px-4 py-2"
                >
                    Download ZIP
                </button>
            </div>

            {/* Stats + Actions */}
            <div className="mt-4 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                    {images.length}/60 Images
                </span>

                <button
                    onClick={clearAll}
                    className="rounded-lg bg-rose-600 hover:bg-rose-700 transition px-4 py-1 text-white font-medium shadow"
                >
                    Clear All
                </button>
            </div>

            {/* Image Grid */}
            <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
                {images.map((img, i) => (
                    <div
                        key={img.url}
                        className="rounded-xl border border-gray-200 bg-white p-2 shadow-sm hover:shadow-md transition"
                    >
                        <img
                            src={img.url}
                            className="aspect-square w-full rounded-lg object-cover"
                            alt=""
                        />

                        <p
                            className="mt-2 truncate text-xs text-gray-700"
                            title={renamed(img.file, i)}
                        >
                            {renamed(img.file, i)}
                        </p>

                        <button
                            onClick={() => remove(img.url)}
                            className="mt-2 w-full rounded-lg border border-gray-300 py-1 text-xs font-medium hover:bg-gray-100 transition"
                        >
                            Remove
                        </button>
                    </div>
                ))}
            </div>
        </div>
    </main>
);
    // return (
    //     <main className="min-h-screen bg-gray-100 p-8">
    //         <div className="mx-auto max-w-7xl rounded-xl bg-white p-6 shadow">
    //             <h1 className="text-3xl font-bold">Batch Image Renamer</h1>

    //             <div className="mt-6 grid gap-4 md:grid-cols-4">
    //                 <label className="rounded-lg border-2 border-dashed p-6 text-center cursor-pointer">
    //                     Upload Images
    //                     <input
    //                         hidden
    //                         multiple
    //                         accept="image/*"
    //                         type="file"
    //                         onChange={handleUpload}
    //                     />
    //                 </label>

    //                 <select
    //                     value={mode}
    //                     onChange={(e) => setMode(e.target.value as RenameMode)}
    //                     className="border rounded px-3 py-2"
    //                 >
    //                     <option value="prefix">Prefix</option>
    //                     <option value="suffix">Suffix</option>
    //                     <option value="replace">Replace Name</option>
    //                     <option value="sequential">Sequential</option>
    //                 </select>

    //                 <input
    //                     className="border rounded px-3 py-2"
    //                     value={text}
    //                     onChange={(e) => setText(e.target.value)}
    //                     placeholder="0_ or digit"
    //                 />

    //                 <button
    //                     onClick={downloadZip}
    //                     className="rounded bg-green-700 text-white"
    //                 >
    //                     Download ZIP
    //                 </button>
    //             </div>

    //             <div className="mt-4 flex gap-4">
    //                 <span>{images.length}/60 Images</span>

    //                 <button
    //                     onClick={clearAll}
    //                     className="rounded bg-red-600 px-3 py-1 text-white"
    //                 >
    //                     Clear
    //                 </button>
    //             </div>

    //             <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
    //                 {images.map((img, i) => (
    //                     <div key={img.url} className="rounded border p-2">
    //                         <img
    //                             src={img.url}
    //                             className="aspect-square w-full rounded object-cover"
    //                             alt=""
    //                         />

    //                         <p
    //                             className="mt-2 truncate text-xs"
    //                             title={renamed(img.file, i)}
    //                         >
    //                             {renamed(img.file, i)}
    //                         </p>

    //                         <button
    //                             onClick={() => remove(img.url)}
    //                             className="mt-2 w-full rounded border py-1 text-xs"
    //                         >
    //                             Remove
    //                         </button>
    //                     </div>
    //                 ))}
    //             </div>
    //         </div>
    //     </main>
    // );
}

async function createZip(files: { name: string, data: Blob }[]) {
    const encoder = new TextEncoder();
    const local: any[] = [];
    const central: any[] = [];
    let offset = 0;

    for (const f of files) {
        const n = encoder.encode(f.name);
        const b = new Uint8Array(await f.data.arrayBuffer());
        const crc = crc32(b);

        const l = new Uint8Array(30 + n.length);
        const lv = new DataView(l.buffer);
        lv.setUint32(0, 0x04034b50, true);
        lv.setUint16(4, 20, true);
        lv.setUint32(14, crc, true);
        lv.setUint32(18, b.length, true);
        lv.setUint32(22, b.length, true);
        lv.setUint16(26, n.length, true);
        l.set(n, 30);
        local.push(l, b);

        const c = new Uint8Array(46 + n.length);
        const cv = new DataView(c.buffer);
        cv.setUint32(0, 0x02014b50, true);
        cv.setUint16(4, 20, true);
        cv.setUint16(6, 20, true);
        cv.setUint32(16, crc, true);
        cv.setUint32(20, b.length, true);
        cv.setUint32(24, b.length, true);
        cv.setUint16(28, n.length, true);
        cv.setUint32(42, offset, true);
        c.set(n, 46);
        central.push(c);

        offset += l.length + b.length;
    }

    const size = central.reduce((s: any, p: any) => s + p.length, 0);
    const end = new Uint8Array(22);
    const ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, size, true);
    ev.setUint32(16, offset, true);

    return new Blob([...local, ...central, end], { type: "application/zip" });
}

const TABLE = new Uint32Array(256).map((_, i) => {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
});

function crc32(bytes: Uint8Array) {
    let crc = 0xffffffff;
    for (const b of bytes) crc = TABLE[(crc ^ b) & 255] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
}
