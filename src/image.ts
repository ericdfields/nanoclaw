import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

import { logger } from './logger.js';

const MAX_DIMENSION = 1024;

export interface ProcessedImage {
  /** Absolute path to the saved resized image */
  filePath: string;
  /** Original filename */
  filename: string;
  /** MIME type (image/jpeg, image/png, image/webp, image/gif) */
  mediaType: string;
  /** Width after resize */
  width: number;
  /** Height after resize */
  height: number;
}

/**
 * Process an image buffer: resize if needed, save to the group's images directory.
 * Returns metadata needed to pass the image to the agent.
 */
export async function processImage(
  buffer: Buffer,
  groupDir: string,
  filename: string,
): Promise<ProcessedImage> {
  const imagesDir = path.join(groupDir, 'images');
  fs.mkdirSync(imagesDir, { recursive: true });

  const image = sharp(buffer);
  const metadata = await image.metadata();

  const width = metadata.width || 0;
  const height = metadata.height || 0;
  const needsResize = width > MAX_DIMENSION || height > MAX_DIMENSION;

  const pipeline = needsResize
    ? image.resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
    : image;

  // Convert to JPEG for consistent format and smaller size
  const outputBuffer = await pipeline.jpeg({ quality: 85 }).toBuffer();
  const outputMetadata = await sharp(outputBuffer).metadata();

  const outputFilename = filename.replace(/\.[^.]+$/, '') + '.jpg';
  const outputPath = path.join(imagesDir, outputFilename);
  fs.writeFileSync(outputPath, outputBuffer);

  logger.info(
    {
      original: `${width}x${height}`,
      resized: `${outputMetadata.width}x${outputMetadata.height}`,
      size: outputBuffer.length,
      path: outputPath,
    },
    'Processed image',
  );

  return {
    filePath: outputPath,
    filename: outputFilename,
    mediaType: 'image/jpeg',
    width: outputMetadata.width || 0,
    height: outputMetadata.height || 0,
  };
}

/**
 * Read an image file and return a base64-encoded content block
 * suitable for the Anthropic API multimodal format.
 */
export function imageToContentBlock(filePath: string, mediaType: string): {
  type: 'image';
  source: { type: 'base64'; media_type: string; data: string };
} {
  const data = fs.readFileSync(filePath).toString('base64');
  return {
    type: 'image',
    source: {
      type: 'base64',
      media_type: mediaType,
      data,
    },
  };
}
