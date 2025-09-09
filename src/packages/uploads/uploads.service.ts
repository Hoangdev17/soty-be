import { Injectable } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

@Injectable()
export class UploadsService {
  async uploadImage(file: Express.Multer.File): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: 'uploads' },
      (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error('Upload failed: no result returned'));
        resolve(result);
      },
    ).end(file.buffer);
  });
}

  async getImage(publicId: string) {
    try {
      return await cloudinary.api.resource(publicId);
    } catch (error) {
      throw new Error(`Image not found: ${error.message}`);
    }
  }

  async deleteImage(publicId: string) {
    return cloudinary.uploader.destroy(publicId);
  }
}
