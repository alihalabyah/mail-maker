import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class MailerService {
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get('SMTP_HOST', 'localhost'),
      port: Number(this.config.get('SMTP_PORT', '1025')),
      secure: false,
      ignoreTLS: true,
    });
  }

  async sendMail(options: SendMailOptions): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.get('SMTP_FROM', 'mailmaker@mail-maker.local'),
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
  }
}
