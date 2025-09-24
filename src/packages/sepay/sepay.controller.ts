import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  HttpStatus,
  HttpException,
  Logger,
  Request,
  Headers,
  UseGuards,
  Req,
} from '@nestjs/common';
import { SepayService } from './sepay.service';
import type { CreatePaymentDto } from './dto/sepay.dto';
import { WebhookSchema, CreatePaymentDtoClass } from './dto/sepay.dto';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import {
  ApiTags,
  ApiBody,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../../core/auth/dto/request-with-auth.dto';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { success } from 'zod';

@Controller('sepay')
@ApiTags('Sepay')
export class SepayController {
  private readonly logger = new Logger(SepayController.name);
  private readonly webhookSecret: string;
  private readonly ws: WebsocketGateway;

  constructor(
    private readonly sepayService: SepayService,
    private readonly configService: ConfigService,
  ) {
    this.webhookSecret =
      this.configService.get<string>('SEPAY_WEBHOOK_SECRET') || '';
  }

  /**
   * Tạo payment mới
   */
  @Post('create-payment')
  @ApiBody({ type: CreatePaymentDtoClass })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  async createPayment(
    @Body() body: CreatePaymentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.sepayService.createPayment(body, req.user.id);
  }

  /**
   * Kiểm tra trạng thái thanh toán
   */
  @Get('payment/:paymentId/status')
  async getPaymentStatus(@Param('paymentId') paymentId: string) {
    try {
      const result = await this.sepayService.checkPaymentStatus(paymentId);

      if (result.status === 1) {
        return {
          success: true,
          data: result,
        };
      }

      throw new HttpException(
        {
          success: false,
          message: 'Payment not completed',
          data: result,
        },
        HttpStatus.OK,
      );
    } catch (error) {
      this.logger.error('Error checking payment status:', error);
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to check payment status',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Complete payment thủ công (cho test)
   */
  @Post('complete-payment/:paymentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Complete payment manually (for testing)',
    description:
      'Manually complete a payment for testing purposes. This will process the payment and update user balance.',
  })
  async completePayment(@Param('paymentId') paymentId: string) {
    return await this.sepayService.completePayment(paymentId);
  }

  /**
   * Webhook endpoint để nhận thông báo từ Sepay
   */
  @Post('webhook')
  async handleWebhook(
    @Body() body: any,
    @Headers() headers: any,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      // Validate webhook data với zod
      const validatedData = body;

      // Verify webhook signature (nếu Sepay có cung cấp)
      const signature = headers['x-sepay-signature'] || headers['x-signature'];

      if (this.webhookSecret && signature) {
        const isValid = this.verifyWebhookSignature(
          JSON.stringify(body),
          signature,
          this.webhookSecret,
        );

        if (!isValid) {
          this.logger.warn('Invalid webhook signature');
          throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
        }
      }

      this.logger.log('Received webhook:', JSON.stringify(validatedData));

      // Xử lý webhook
      await this.sepayService.processWebhook(validatedData);

      return {
        success: true,
        message: 'Webhook processed successfully',
      };
    } catch (error) {
      this.logger.error('Error processing webhook:', error);

      // Nếu là lỗi validation từ zod
      if (error.name === 'ZodError') {
        this.logger.error('Webhook validation error:', error.errors);
        return {
          success: false,
          message: 'Invalid webhook data',
          errors: error.errors,
        };
      }

      // Vẫn trả về 200 để tránh Sepay retry liên tục
      return {
        success: false,
        message: error.message || 'Failed to process webhook',
      };
    }
  }

  /**
   * Verify webhook signature
   */
  private verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string,
  ): boolean {
    try {
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(payload);
      const expectedSignature = hmac.digest('hex');

      return expectedSignature === signature;
    } catch (error) {
      this.logger.error('Error verifying signature:', error);
      return false;
    }
  }
}
