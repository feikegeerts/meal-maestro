import sharp from "sharp";

export interface ImageConversionOptions {
  format?: 'webp' | 'jpeg' | 'png';
  quality?: number;
  width?: number;
  height?: number;
}

export interface ConversionResult {
  buffer: Buffer;
  metadata: {
    width: number;
    height: number;
    format: string;
    size: number;
  };
  originalSize: number;
  compressionRatio: number;
}

export async function convertImage(
  inputBuffer: Buffer,
  options: ImageConversionOptions = {}
): Promise<ConversionResult> {
  const {
    format = 'webp',
    quality = 80,
    width,
    height
  } = options;

  let sharpInstance = sharp(inputBuffer);

  // Resize if dimensions provided
  if (width || height) {
    sharpInstance = sharpInstance.resize(width, height, {
      fit: 'inside',
      withoutEnlargement: true
    });
  }

  // Convert format
  let processedBuffer: Buffer;

  switch (format) {
    case 'webp':
      processedBuffer = await sharpInstance.webp({ quality }).toBuffer();
      break;
    case 'jpeg':
      processedBuffer = await sharpInstance.jpeg({ quality }).toBuffer();
      break;
    case 'png':
      processedBuffer = await sharpInstance.png({ 
        quality,
        compressionLevel: 6
      }).toBuffer();
      break;
    default:
      throw new Error(`Unsupported format: ${format}`);
  }

  // Get metadata
  const metadata = await sharp(processedBuffer).metadata();

  const result: ConversionResult = {
    buffer: processedBuffer,
    metadata: {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || format,
      size: processedBuffer.length
    },
    originalSize: inputBuffer.length,
    compressionRatio: ((1 - processedBuffer.length / inputBuffer.length) * 100)
  };

  return result;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function calculateSavings(originalSize: number, newSize: number): {
  savedBytes: number;
  savedPercentage: number;
  formattedSaving: string;
} {
  const savedBytes = originalSize - newSize;
  const savedPercentage = (savedBytes / originalSize) * 100;
  
  return {
    savedBytes,
    savedPercentage,
    formattedSaving: `${formatFileSize(savedBytes)} (${savedPercentage.toFixed(1)}%)`
  };
}