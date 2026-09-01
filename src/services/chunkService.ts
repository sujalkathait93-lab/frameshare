/**
 * Chunk splitting, reassembly, and QR payload serialization.
 *
 * Each chunk is 1 KB of raw file data, base64-encoded for QR transport.
 * The JSON payload uses short keys to minimize QR code density:
 *   app → "FS"  |  t → transferId  |  n → fileName
 *   m → mimeType  |  c → chunkIndex  |  l → totalChunks  |  d → data
 */

export const CHUNK_SIZE = 1024; // bytes

export interface ChunkData {
  app: string;
  t: string;   // transferId
  n: string;   // fileName
  m: string;   // mimeType
  c: number;   // chunk index (0-based)
  l: number;   // total chunks
  d: string;   // base64-encoded chunk data
}

/** Split an ArrayBuffer into base64-encoded chunk strings. */
export function splitIntoChunks(data: ArrayBuffer): string[] {
  const bytes = new Uint8Array(data);
  const chunks: string[] = [];

  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const slice = bytes.slice(i, Math.min(i + CHUNK_SIZE, bytes.length));
    let binary = '';
    for (let j = 0; j < slice.length; j++) {
      binary += String.fromCharCode(slice[j]);
    }
    chunks.push(btoa(binary));
  }

  return chunks;
}

/** Reassemble base64-encoded chunks into the original file Blob. */
export function reassembleFile(
  chunks: Map<number, string>,
  total: number,
  mimeType: string,
): Blob {
  const parts: Uint8Array[] = [];

  for (let i = 0; i < total; i++) {
    const base64 = chunks.get(i);
    if (!base64) throw new Error(`Missing chunk ${i}`);

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let j = 0; j < binary.length; j++) {
      bytes[j] = binary.charCodeAt(j);
    }
    parts.push(bytes);
  }

  return new Blob(parts as BlobPart[], { type: mimeType });
}

/** Build a compact JSON string for one QR frame. */
export function createChunkPayload(
  transferId: string,
  fileName: string,
  mimeType: string,
  chunkIndex: number,
  totalChunks: number,
  chunkData: string,
): string {
  const payload: ChunkData = {
    app: 'FS',
    t: transferId,
    n: fileName,
    m: mimeType,
    c: chunkIndex,
    l: totalChunks,
    d: chunkData,
  };
  return JSON.stringify(payload);
}

/** Parse a scanned QR string back into a ChunkData object. Returns null for invalid data. */
export function parseChunkPayload(data: string): ChunkData | null {
  try {
    const parsed = JSON.parse(data);
    if (parsed.app !== 'FS') return null;
    if (typeof parsed.t !== 'string') return null;
    if (typeof parsed.n !== 'string') return null;
    if (typeof parsed.m !== 'string') return null;
    if (typeof parsed.c !== 'number') return null;
    if (typeof parsed.l !== 'number') return null;
    if (typeof parsed.d !== 'string') return null;
    return parsed as ChunkData;
  } catch {
    return null;
  }
}
