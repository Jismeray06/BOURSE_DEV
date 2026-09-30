import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  async sendVerificationEmail(recipient: string, fullName: string, token: string) {
    const verificationUrl = new URL('/verify-email', process.env.FRONTEND_URL ?? 'http://localhost:3000');
    verificationUrl.searchParams.set('token', token);
    try {
      await this.transporter().sendMail({
        from: this.required('SMTP_FROM'),
        to: recipient,
        subject: 'Vérifiez votre adresse e-mail',
        text: `Bonjour ${fullName},\n\nVérifiez votre adresse e-mail : ${verificationUrl}\n\nCe lien expire dans 24 heures.`,
        html: `<p>Bonjour ${this.escapeHtml(fullName)},</p><p>Pour activer votre compte, confirmez votre adresse e-mail :</p><p><a href="${verificationUrl}" style="display:inline-block;padding:12px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px">Vérifier mon adresse e-mail</a></p><p>Ce lien expire dans 24 heures.</p>`,
      });
    } catch {
      throw new ServiceUnavailableException("L'e-mail de vérification n'a pas pu être envoyé. Réessayez plus tard.");
    }
  }

  private transporter() {
    const port = Number(process.env.SMTP_PORT ?? 587);
    if (!Number.isInteger(port) || port <= 0) throw new ServiceUnavailableException('SMTP_PORT est invalide.');
    return nodemailer.createTransport({
      host: this.required('SMTP_HOST'), port, secure: process.env.SMTP_SECURE === 'true',
      auth: { user: this.required('SMTP_USER'), pass: this.required('SMTP_PASS') },
    });
  }
  private required(name: string) { const value = process.env[name]?.trim(); if (!value) throw new ServiceUnavailableException(`${name} doit être configuré.`); return value; }
  private escapeHtml(value: string) { return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character); }
}
