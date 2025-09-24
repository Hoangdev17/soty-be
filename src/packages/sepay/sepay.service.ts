import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreatePaymentDto, CompletePaymentResponseDto } from './dto/sepay.dto';
import { SnowflakeID } from '../../utils/snowflake';
import th from 'zod/v4/locales/th.js';

export interface CreatePaymentRequest {
  amount: number;
  content: string;
  userId: string;
  nitroId?: string;
  nitroAmount?: number;
}

export interface SepayPaymentResponse {
  code: number;
  desc: string;
  data?: {
    qr_code: string;
    qr_data: string;
    account_number: string;
    account_name: string;
    amount: number;
    content: string;
  };
}

export interface SepayBankResponse {
  code: number;
  desc: string;
  data: Array<{
    id: string;
    bank_name: string;
    bank_code: string;
    account_number: string;
    account_name: string;
  }>;
}

export interface SepayTransactionResponse {
  code: number;
  desc: string;
  data: Array<{
    id: string;
    transaction_date: string;
    account_number: string;
    sub_account: string;
    amount_in: number;
    amount_out: number;
    accumulated: number;
    content: string;
    description: string;
    transaction_fee: number;
    channel: string;
    reference_number: string;
  }>;
}

@Injectable()
export class SepayService {
  private readonly logger = new Logger(SepayService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly snowflakeService: SnowflakeID,
  ) {
    this.apiUrl =
      this.configService.get<string>('SEPAY_API_URL') || 'https://my.sepay.vn/';
    this.apiKey = this.configService.get<string>('SEPAY_API_KEY') || '';
  }

  /**
   * Tạo payment với QR code VietQR
   */
  async createPayment(request: CreatePaymentDto, userId: string) {
    try {
      // 1. Tạo Payment record trong DB
      const payment = await this.prismaService.payment.create({
        data: {
          id: this.snowflakeService.generate(),
          userId: userId,
          amount: request.amount,
          status: 0, // PENDING
          nitroId: request.nitroId || null,
          nitroAmount: request.nitroAmount || null,
          boostId: request.boostId || null,
          paymentMethod: 4, // Bank Transfer
        },
      });

      // 2. Tạo QR code VietQR thủ công (không cần gọi Sepay API)
      const qrData = this.generateVietQRData(
        request.amount,
        `${request.content} - Order: ${payment.id}`,
      );

      // 3. Cập nhật payment với transaction ID
      await this.prismaService.payment.update({
        where: { id: payment.id },
        data: {
          transactionId: `manual_${payment.id}`,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Payment created successfully: ${payment.id}`);

      return {
        paymentId: payment.id,
        qrCode: qrData.qrCode,
        qrData: qrData.qrString,
        bankCode: this.configService.get<string>('SEPAY_BANK_CODE') || 'MBBank',
        amount: request.amount,
        content: `${request.content}`,
        instructions:
          'Vui lòng quét mã QR hoặc chuyển khoản theo thông tin trên. Nội dung chuyển khoản CHÍNH XÁC để được xử lý tự động.',
      };
    } catch (error) {
      this.logger.error('Error creating payment:', error);
      throw error;
    }
  }

  /**
   * Kiểm tra trạng thái thanh toán
   */
  async checkPaymentStatus(paymentId: string) {
    try {
      const payment = await this.prismaService.payment.findUnique({
        where: { id: paymentId },
        include: {
          user: true,
          nitro: true,
          boost: true,
        },
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      return {
        paymentId: payment.id,
        status: payment.status,
        amount: payment.amount,
        gemsAmount: Math.floor((payment.amount / 25000) * 2),
        createdAt: payment.createdAt,
        paidAt: payment.paidAt,
      };
    } catch (error) {
      this.logger.error('Error checking payment status:', error);
      throw error;
    }
  }

  /**
   * Xử lý webhook từ Sepay (được gọi từ webhook controller)
   */
  async processWebhook(webhookData: any) {
    try {
      const { content, transferAmount, transferType } = webhookData;

      // Parse payment ID từ content (match "Order " hoặc "Order:")
      const orderMatch = content.match(/Order[:\s]+([a-zA-Z0-9]+)/);
      if (!orderMatch) {
        this.logger.warn(
          'Cannot parse order ID from webhook content:',
          content,
        );
        return;
      }

      const paymentId = orderMatch[1];
      const payment = await this.prismaService.payment.findUnique({
        where: { id: paymentId },
      });

      if (!payment) {
        this.logger.warn('Payment not found for ID:', paymentId);
        return;
      }

      if (payment.status === 1) {
        this.logger.log('Payment already completed:', paymentId);
        return;
      }

      // Dùng transferAmount và transferType từ Sepay
      if (transferType === 'in' && transferAmount >= payment.amount) {
        const result = await this.completePayment(payment.id);
        this.logger.log('Payment completed via webhook:', result);
      } else if (transferType === 'out' || transferAmount < payment.amount) {
        await this.failPayment(paymentId);
      }
    } catch (error) {
      this.logger.error('Error processing webhook:', error);
      throw error;
    }
  }

  /**
   * Hoàn thành thanh toán nitro
   */
  async completePayment(paymentId: string) {
    const payment = await this.prismaService.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status === 0) {
      let gemsAmount = 0;

      await this.prismaService.$transaction(async (tx) => {
        // 1. Cập nhật payment status
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 1, // COMPLETED
            paidAt: new Date(),
            updatedAt: new Date(),
          },
        });

        if (payment.nitroId) {
          const nitro = await tx.nitro.findUnique({
            where: { id: payment.nitroId },
          });
          if (nitro) {
            gemsAmount = Math.floor((nitro.price / 25000) * 2); // Tính từ price của nitro
          }
        } else if (payment.boostId) {
          // For Boost purchases, calculate gems from payment amount (similar to nitro)
          gemsAmount = Math.floor((payment.amount / 25000) * 2);
        } else {
          gemsAmount = Math.floor((payment.amount / 25000) * 2); // Tính từ amount
        }

        if (gemsAmount > 0) {
          const userNitro = await tx.userNitro.findUnique({
            where: { userId: payment.userId || '' },
          });

          if (userNitro) {
            await tx.userNitro.update({
              where: { userId: payment.userId || '' },
              data: {
                balance: { increment: gemsAmount },
                updatedAt: new Date(),
              },
            });
          } else {
            await tx.userNitro.create({
              data: {
                id: this.snowflakeService.generate(),
                userId: payment.userId || '',
                balance: gemsAmount,
              },
            });
          }
        }

        // 3. Tạo wallet transaction
        const userWallet = await tx.wallet.findFirst({
          where: { userId: payment.userId, walletType: 0 },
        });

        if (userWallet) {
          await tx.walletTransaction.create({
            data: {
              id: this.snowflakeService.generate(),
              walletId: userWallet.id,
              transactionType: 5, // NITRO_PURCHASE
              amount: payment.amount,
              description: `Mua Nitro - Payment: ${payment.id}`,
              metadata: {
                paymentId: payment.id,
                gemsAmount,
              },
            },
          });
        }

        this.logger.log(`Payment completed successfully: ${payment.id}`);
      });

      return {
        paymentId: payment.id,
        status: 1,
        amount: payment.amount,
        gemsAmount,
        completedAt: new Date(),
      };
    } else {
      throw new Error('Payment is not in a completable state');
    }
  }

  /**
   * Đánh dấu thanh toán thất bại
   */
  private async failPayment(paymentId: string) {
    await this.prismaService.payment.update({
      where: { id: paymentId },
      data: {
        status: 2, // FAILED
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Payment failed: ${paymentId}`);
  }

  /**
   * Lấy danh sách giao dịch từ Sepay API
   */
  async getTransactions(): Promise<SepayTransactionResponse['data']> {
    try {
      const response = await axios.get<SepayTransactionResponse>(
        `${this.apiUrl}userapi/transactions/list`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      if (response.data.code !== 200) {
        throw new Error(`Sepay API error: ${response.data.desc}`);
      }

      return response.data.data || [];
    } catch (error) {
      this.logger.error('Error fetching transactions from Sepay:', error);
      throw error;
    }
  }

  /**
   * Xử lý giao dịch từ Sepay (cronjob sẽ gọi)
   */
  async processTransactions() {
    try {
      const transactions = await this.getTransactions();

      for (const tx of transactions) {
        // Match dựa trên content chứa "Order: <paymentId>"
        const orderMatch = tx.content.match(/Order: ([a-zA-Z0-9]+)/);
        if (!orderMatch) continue;

        const paymentId = orderMatch[1];
        const payment = await this.prismaService.payment.findUnique({
          where: { id: paymentId },
        });

        if (!payment || payment.status === 1) continue; // Đã hoàn thành

        if (tx.amount_in >= payment.amount) {
          const result = await this.completePayment(payment.id);
          this.logger.log('Payment completed via cronjob:', result);
        } else if (tx.amount_in < payment.amount) {
          // Có thể đánh dấu failed nếu amount không đủ, nhưng tùy logic
          this.logger.warn(
            `Insufficient amount for payment ${paymentId}: ${tx.amount_in} < ${payment.amount}`,
          );
        }
      }
    } catch (error) {
      this.logger.error('Error processing transactions:', error);
      throw error;
    }
  }

  /**
   * Tạo QR code VietQR thủ công
   */
  private generateVietQRData(amount: number, content: string) {
    // Tạo QR string theo chuẩn VietQR
    // Format: https://qr.sepay.vn/img?acc=<account>&bank=<bank_code>&amount=<amount>&des=<description>
    const bankCode =
      this.configService.get<string>('SEPAY_BANK_CODE') || 'MBBank';
    const accountNumber =
      this.configService.get<string>('SEPAY_ACCOUNT_NUMBER') || '0866609196';

    const qrString = `https://qr.sepay.vn/img?acc=${accountNumber}&bank=${bankCode}&amount=${amount}&des=${encodeURIComponent(content)}`;
    const qrCode = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`; // Placeholder QR code

    return {
      qrString,
      qrCode,
    };
  }
}
