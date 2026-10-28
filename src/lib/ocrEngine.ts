import { createWorker } from 'tesseract.js';
import { parseRawRecipeText } from './recipeParser';
import { Recipe } from '../types';

export interface OCRProgress {
  status: string;
  progress: number;
}

export async function runImageOCR(
  imageSource: string | File | Blob | HTMLCanvasElement,
  onProgress?: (p: OCRProgress) => void
): Promise<{ rawText: string; recipeDraft: Partial<Recipe> }> {
  try {
    const worker = await createWorker('eng', 1, {
      logger: (m) => {
        if (onProgress && m.status) {
          onProgress({
            status: m.status,
            progress: Math.round((m.progress || 0) * 100),
          });
        }
      },
    });

    const ret = await worker.recognize(imageSource);
    const rawText = ret.data.text;
    await worker.terminate();

    const recipeDraft = parseRawRecipeText(rawText, 'image');

    return {
      rawText,
      recipeDraft,
    };
  } catch (error: any) {
    console.error('OCR Error:', error);
    throw new Error(error.message || 'Failed to process optical text from image');
  }
}

// Capture frame from an HTMLVideoElement onto a canvas and extract OCR text
export async function runVideoFrameOCR(
  videoElement: HTMLVideoElement,
  onProgress?: (p: OCRProgress) => void
): Promise<{ rawText: string; recipeDraft: Partial<Recipe>; frameDataUrl: string }> {
  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth || 640;
  canvas.height = videoElement.videoHeight || 360;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Unable to create canvas rendering context');
  }

  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
  const frameDataUrl = canvas.toDataURL('image/jpeg', 0.9);

  const { rawText, recipeDraft } = await runImageOCR(canvas, onProgress);
  recipeDraft.sourceType = 'video';
  recipeDraft.imageUrl = frameDataUrl;

  return {
    rawText,
    recipeDraft,
    frameDataUrl,
  };
}
