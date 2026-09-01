/**
 * QR code generation using the `qrcode` library.
 */

import QRCode from 'qrcode';

/** Render a QR code directly onto an HTML5 canvas element for zero-flicker 60fps performance. */
export async function renderQRToCanvas(
  canvas: HTMLCanvasElement,
  data: string,
  width = 380,
): Promise<void> {
  return new Promise((resolve, reject) => {
    QRCode.toCanvas(
      canvas,
      data,
      {
        errorCorrectionLevel: 'L', // low error correction → smaller QR, faster scan
        margin: 2,
        width,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      },
      (err) => {
        if (err) reject(err);
        else resolve();
      },
    );
  });
}

/** Generate a data-URL image of a QR code from the given string payload. */
export async function generateQRDataURL(data: string): Promise<string> {
  return QRCode.toDataURL(data, {
    errorCorrectionLevel: 'L',
    margin: 2,
    width: 400,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });
}

