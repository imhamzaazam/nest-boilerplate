import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { extname, join } from 'path';

const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const MAX_BYTES = 5 * 1024 * 1024;

@Injectable()
export class UploadsService {
  private readonly uploadDir = join(process.cwd(), 'uploads', 'products');

  constructor() {
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  getPublicBaseUrl(): string {
    const port = process.env.PORT || '3000';
    return process.env.API_PUBLIC_URL || `http://localhost:${port}`;
  }

  saveProductImage(file: Express.Multer.File): { url: string; filename: string } {
    if (!file?.buffer?.length) {
      throw new BadRequestException('No file uploaded');
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException('File exceeds 5MB limit');
    }

    const extension = extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      throw new BadRequestException('Only PNG, JPG, or WEBP images are allowed');
    }

    const filename = `${randomUUID()}${extension}`;
    const filepath = join(this.uploadDir, filename);
    writeFileSync(filepath, Uint8Array.from(file.buffer));

    const url = `${this.getPublicBaseUrl()}/api/uploads/products/${filename}`;
    return { url, filename };
  }
}
