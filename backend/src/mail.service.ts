import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async sendVerificationEmail(recipient: string, fullName: string, token: string) {
    const verificationUrl = new URL('/verify-email', process.env.FRONTEND_URL ?? 'http://localhost:3000');
    verificationUrl.searchParams.set('token', token);
    try {
      this.logSent(await this.transporter().sendMail({
        from: this.required('SMTP_FROM'),
        to: recipient,
        subject: 'Vérifiez votre adresse e-mail',
        text: `Bonjour ${fullName},\n\nVérifiez votre adresse e-mail : ${verificationUrl}\n\nCe lien expire dans 24 heures.`,
        html: `<p>Bonjour ${this.escapeHtml(fullName)},</p><p>Pour activer votre compte, confirmez votre adresse e-mail :</p><p><a href="${verificationUrl}" style="display:inline-block;padding:12px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px">Vérifier mon adresse e-mail</a></p><p>Ce lien expire dans 24 heures.</p>`,
      }));
    } catch {
      throw new ServiceUnavailableException("L'e-mail de vérification n'a pas pu être envoyé. Réessayez plus tard.");
    }
  }

  async sendApplicationDecisionEmail(recipient: string, fullName: string, validated: boolean, note: string | null) {
    const loginUrl = new URL('/login', process.env.FRONTEND_URL ?? 'http://localhost:3000').toString();
    const subject = validated ? 'Votre dossier a été validé' : 'Votre dossier a été refusé';
    const intro = validated
      ? 'Bonne nouvelle : votre dossier a été examiné par la scolarité centrale et il est validé.'
      : 'Votre dossier a été examiné par la scolarité centrale et il a malheureusement été refusé.';
    const noteLabel = validated ? 'Remarque de la scolarité' : 'Motif du refus';
    const outro = validated
      ? 'Vous pouvez suivre votre dossier depuis votre espace étudiant.'
      : 'Vous pouvez consulter votre dossier depuis votre espace étudiant.';
    try {
      this.logSent(await this.transporter().sendMail({
        from: this.required('SMTP_FROM'),
        to: recipient,
        subject,
        text: `Bonjour ${fullName},\n\n${intro}\n${note ? `\n${noteLabel} : ${note}\n` : ''}\n${outro}\n${loginUrl}`,
        html: `<p>Bonjour ${this.escapeHtml(fullName)},</p><p>${intro}</p>${note ? `<p><strong>${noteLabel} :</strong><br>${this.escapeHtml(note).replace(/\n/g, '<br>')}</p>` : ''}<p>${outro}</p><p><a href="${loginUrl}" style="display:inline-block;padding:12px 18px;background:#0b3b60;color:#fff;text-decoration:none;border-radius:6px">Accéder à mon espace</a></p>`,
      }));
    } catch {
      throw new ServiceUnavailableException("L'e-mail de décision n'a pas pu être envoyé.");
    }
  }

  async sendQuitusCodeEmail(recipient: string, fullName: string, code: string) {
    try {
      this.logSent(await this.transporter().sendMail({
        from: this.required('SMTP_FROM'),
        to: recipient,
        subject: 'Votre code de vérification du quitus',
        text: `Bonjour ${fullName},\n\nUne demande de bourse utilise votre quitus. Code de vérification : ${code}\n\nCe code expire dans 10 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.`,
        html: `<p>Bonjour ${this.escapeHtml(fullName)},</p><p>Une demande de bourse utilise votre quitus. Votre code de vérification :</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p><p>Ce code expire dans 10 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>`,
      }));
    } catch {
      throw new ServiceUnavailableException("Le code de vérification n'a pas pu être envoyé.");
    }
  }

  async sendEmailChangeEmail(recipient: string, fullName: string, token: string) {
    const confirmUrl = new URL('/confirm-email-change', process.env.FRONTEND_URL ?? 'http://localhost:3000');
    confirmUrl.searchParams.set('token', token);
    try {
      this.logSent(await this.transporter().sendMail({
        from: this.required('SMTP_FROM'),
        to: recipient,
        subject: 'Confirmez votre nouvelle adresse e-mail',
        text: `Bonjour ${fullName},\n\nConfirmez que cette adresse sera désormais celle de votre compte : ${confirmUrl}\n\nCe lien expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.`,
        html: `<p>Bonjour ${this.escapeHtml(fullName)},</p><p>Confirmez que cette adresse sera désormais celle de votre compte :</p><p><a href="${confirmUrl}" style="display:inline-block;padding:12px 18px;background:#0b3b60;color:#fff;text-decoration:none;border-radius:6px">Confirmer ma nouvelle adresse</a></p><p>Ce lien expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>`,
      }));
    } catch {
      throw new ServiceUnavailableException("L'e-mail de confirmation n'a pas pu être envoyé.");
    }
  }

  // Prévient l'ancienne adresse qu'elle n'est plus celle du compte (alerte de sécurité).
  async sendEmailChangedNotice(recipient: string, fullName: string, newEmail: string) {
    try {
      this.logSent(await this.transporter().sendMail({
        from: this.required('SMTP_FROM'),
        to: recipient,
        subject: "L'adresse e-mail de votre compte a changé",
        text: `Bonjour ${fullName},\n\nL'adresse e-mail de votre compte est désormais ${newEmail}. Si vous n'êtes pas à l'origine de ce changement, contactez immédiatement un administrateur.`,
        html: `<p>Bonjour ${this.escapeHtml(fullName)},</p><p>L'adresse e-mail de votre compte est désormais <strong>${this.escapeHtml(newEmail)}</strong>.</p><p>Si vous n'êtes pas à l'origine de ce changement, contactez immédiatement un administrateur.</p>`,
      }));
    } catch {
      throw new ServiceUnavailableException("L'e-mail d'information n'a pas pu être envoyé.");
    }
  }

  // Réponse du serveur d'envoi : accepté ne veut pas dire reçu (courrier indésirable, expéditeur non validé…).
  private logSent(info: { accepted?: unknown[]; rejected?: unknown[]; response?: string; messageId?: string }) {
    this.logger.log(`E-mail remis au serveur d'envoi — acceptés : ${JSON.stringify(info.accepted ?? [])}, refusés : ${JSON.stringify(info.rejected ?? [])}, réponse : ${info.response ?? '?'} (${info.messageId ?? 'sans identifiant'})`);
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
