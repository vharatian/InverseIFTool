import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import { google } from 'googleapis';
import { drive_v3 } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class GoogleDriveService {
  private readonly logger = new Logger(GoogleDriveService.name);
  private drive: drive_v3.Drive;

  constructor() {
    this.initializeDriveClient();
  }

  private initializeDriveClient(): void {
    try {
      const credentialsPath = process.env.GOOGLE_DRIVE_CREDENTIALS_PATH;
      const scopes = process.env.GOOGLE_DRIVE_SCOPES?.split(',') || [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/drive.file',
      ];

      if (!credentialsPath) {
        throw new Error(
          'GOOGLE_DRIVE_CREDENTIALS_PATH environment variable is required',
        );
      }

      if (!fs.existsSync(credentialsPath)) {
        throw new Error(`Credentials file not found at: ${credentialsPath}`);
      }

      const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

      const auth = new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: scopes,
      });

      this.drive = google.drive({ version: 'v3', auth });
      this.logger.log('Google Drive client initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Google Drive client', error);
      throw error;
    }
  }

  /**
   * Extracts file ID from various Google Drive and Colab URL formats
   */
  extractFileIdFromUrl(driveUrl: string): string {
    try {
      const url = new URL(driveUrl);

      // Handle different Google Drive URL formats
      if (url.hostname === 'drive.google.com') {
        // https://drive.google.com/file/d/FILE_ID/view?usp=sharing
        const fileMatch = url.pathname.match(/\/file\/d\/([^\/]+)/);
        if (fileMatch) return fileMatch[1];

        // https://drive.google.com/open?id=FILE_ID
        const openMatch = url.searchParams.get('id');
        if (openMatch) return openMatch;
      }

      if (url.hostname.includes('docs.google.com')) {
        // https://docs.google.com/document/d/FILE_ID/edit
        const docMatch = url.pathname.match(/\/[^\/]+\/d\/([^\/]+)/);
        if (docMatch) return docMatch[1];
      }

      if (url.hostname === 'colab.research.google.com') {
        // https://colab.research.google.com/drive/FILE_ID
        const colabMatch = url.pathname.match(/\/drive\/([^\/]+)/);
        if (colabMatch) return colabMatch[1];
      }

      throw new BadRequestException('Unsupported Google Drive URL format');
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Invalid URL format');
    }
  }

  /**
   * Normalizes input to file ID, handling both URLs and direct file IDs
   */
  getFileId(fileIdentifier: string): string {
    if (!fileIdentifier || typeof fileIdentifier !== 'string') {
      throw new BadRequestException('File identifier is required');
    }

    // Check if it's a URL
    try {
      const url = new URL(fileIdentifier);
      if (url.hostname.includes('google.com')) {
        return this.extractFileIdFromUrl(fileIdentifier);
      }
    } catch {
      // Not a URL, continue to treat as fileId
    }

    // Validate file ID format (Google Drive IDs are typically 28-33 characters)
    if (!/^[a-zA-Z0-9_-]{28,33}$/.test(fileIdentifier)) {
      throw new BadRequestException('Invalid file identifier format');
    }

    return fileIdentifier;
  }

  /**
   * Downloads a file from Google Drive
   */
  async downloadFile(fileIdentifier: string): Promise<Buffer> {
    try {
      const fileId = this.getFileId(fileIdentifier);

      this.logger.log(`Downloading file: ${fileId}`);

      const response = await this.drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream' },
      );

      return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        response.data.on('data', (chunk) => chunks.push(chunk));
        response.data.on('end', () => resolve(Buffer.concat(chunks)));
        response.data.on('error', reject);
      });
    } catch (error) {
      this.logger.error(`Failed to download file: ${fileIdentifier}`, error);

      if (error.response?.status === 404) {
        throw new NotFoundException('File not found');
      }
      if (error.response?.status === 403) {
        throw new BadRequestException('Access denied to file');
      }

      throw new BadRequestException('Failed to download file');
    }
  }

  /**
   * Updates a file on Google Drive
   */
  async updateFile(
    fileIdentifier: string,
    content: Buffer | string,
    mimeType?: string,
  ): Promise<void> {
    try {
      const fileId = this.getFileId(fileIdentifier);
      const contentBuffer = Buffer.isBuffer(content)
        ? content
        : Buffer.from(content);

      this.logger.log(
        `Updating file: ${fileId}, size: ${contentBuffer.length} bytes`,
      );

      await this.drive.files.update({
        fileId,
        media: {
          mimeType: mimeType || 'application/octet-stream',
          body: contentBuffer,
        },
      });

      this.logger.log(`Successfully updated file: ${fileId}`);
    } catch (error) {
      this.logger.error(`Failed to update file: ${fileIdentifier}`, error);

      if (error.response?.status === 404) {
        throw new NotFoundException('File not found');
      }
      if (error.response?.status === 403) {
        throw new BadRequestException('Access denied to file');
      }

      throw new BadRequestException('Failed to update file');
    }
  }
}
