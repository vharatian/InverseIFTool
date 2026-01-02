import {
  Controller,
  Get,
  Put,
  Query,
  Body,
  Res,
  BadRequestException,
  UploadedFile,
  UseInterceptors
} from '@nestjs/common';
import type { Response } from 'express';
import { GoogleDriveService } from './google-drive.service';
import { FileInterceptor } from '@nestjs/platform-express';


@Controller('google-drive')
export class GoogleDriveController {
  constructor(private readonly googleDriveService: GoogleDriveService) { }

  @Get('download')
  async downloadFile(
    @Query('file') fileIdentifier: string,
    @Res() res: Response,
  ): Promise<void> {
    if (!fileIdentifier) {
      throw new BadRequestException('File parameter is required');
    }

    try {
      const fileBuffer =
        await this.googleDriveService.downloadFile(fileIdentifier);

      // Set appropriate headers
      res.set({
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="downloaded-file"',
        'Content-Length': fileBuffer.length.toString(),
      });

      res.send(fileBuffer);
    } catch (error) {
      throw error;
    }
  }

  @Put('update')
  @UseInterceptors(FileInterceptor('file'))
  async updateFile(
    @Query('file') fileIdentifier: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ message: string }> {
    if (!fileIdentifier) {
      throw new BadRequestException('File parameter is required');
    }

    if (!file) {
      throw new BadRequestException('File content is required');
    }

    await this.googleDriveService.updateFile(fileIdentifier, file.buffer, file.mimetype);

    return { message: 'File updated successfully' };
  }
}
