import { BadRequestException, Injectable } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

@Injectable()
export class UploadsService {
  async uploadImage(file: Express.Multer.File): Promise<{ url: string }> {
    try {
      const result: UploadApiResponse = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream({ folder: 'uploads' }, (error, result) => {
            if (error) return reject(error);
            if (!result)
              return reject(new Error('Upload failed: no result returned'));
            resolve(result);
          })
          .end(file.buffer);
      });

      return { url: result.secure_url };
    } catch (err) {
      console.error('Upload failed:', err);
      throw err;
    }
  }

  async uploadVideo(file: Express.Multer.File): Promise<{ url: string }> {
    try {
      // ✅ Kiểm tra loại file trước khi upload
      if (!file.mimetype.startsWith('video/')) {
        throw new BadRequestException(
          `Invalid file type: ${file.mimetype}. Please upload a video file.`,
        );
      }

      const result: UploadApiResponse = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: 'videos',
              resource_type: 'video',
            },
            (error, result) => {
              if (error) return reject(error);
              if (!result)
                return reject(new Error('Upload failed: no result returned'));
              resolve(result);
            },
          )
          .end(file.buffer);
      });

      return { url: result.secure_url };
    } catch (err) {
      console.error('Video upload failed:', err);
      throw err;
    }
  }
}
