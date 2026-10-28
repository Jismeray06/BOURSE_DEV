import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import nodemailer from 'nodemailer';

type Accent = 'blue' | 'green' | 'red' | 'amber';

// Teintes des pastilles et encadrés : bleu (information), vert (succès), rouge (refus), orange (alerte).
const ACCENTS: Record<Accent, { background: string; color: string; border: string }> = {
  blue: { background: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  green: { background: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
  red: { background: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  amber: { background: '#fffbeb', color: '#b45309', border: '#fde68a' },
};

// Logo de l'Université intégré à chaque message (pièce jointe « en ligne » référencée par son cid) : il s'affiche sans
// dépendre d'une adresse publique du site, ce qui n'est pas possible en développement (localhost).
const LOGO_CID = 'logo-universite-mahajanga';
const logoPath = () => join(process.cwd(), 'assets', 'email-logo.png');

type Layout = {
  preheader: string;
  title: string;
  fullName: string;
  // Paragraphes déjà en HTML : les données saisies par les utilisateurs doivent y être échappées par l'appelant.
  paragraphs: string[];
  badge?: { label: string; accent: Accent };
  // Encadré mis en avant (code de vérification, motif de refus, identifiants…).
  highlight?: { html: string; accent: Accent };
  button?: { label: string; url: string };
  // Remarques secondaires (HTML), en petit sous le bouton.
  notes?: string[];
};

type Message = { to: string; subject: string; text: string; content: Layout };

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async sendVerificationEmail(recipient: string, fullName: string, token: string) {
    const verificationUrl = new URL('/verify-email', process.env.FRONTEND_URL ?? 'http://localhost:3000');
    verificationUrl.searchParams.set('token', token);
    try {
      await this.deliver({
        to: recipient,
        subject: 'Vérifiez votre adresse e-mail',
        text: `Bonjour ${fullName},\n\nMerci d'avoir créé votre compte. Pour l'activer, confirmez votre adresse e-mail :\n${verificationUrl}\n\nCe lien est valable 24 heures. Si vous n'êtes pas à l'origine de cette inscription, ignorez ce message.`,
        content: {
          preheader: 'Confirmez votre adresse e-mail pour activer votre compte.',
          title: 'Confirmez votre adresse e-mail',
          fullName,
          paragraphs: ['Merci d’avoir créé votre compte sur la plateforme de demande de bourse nationale.', 'Pour l’activer et pouvoir vous connecter, il vous suffit de confirmer votre adresse e-mail.'],
          button: { label: 'Confirmer mon adresse e-mail', url: verificationUrl.toString() },
          notes: ['Ce lien est valable 24 heures.', 'Si vous n’êtes pas à l’origine de cette inscription, ignorez simplement ce message : aucun compte ne sera activé.'],
        },
      });
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
      ? 'Vous pouvez suivre votre dossier et imprimer votre attestation depuis votre espace étudiant.'
      : 'Vous pouvez consulter votre dossier depuis votre espace étudiant, corriger les éléments signalés puis le soumettre à nouveau.';
    const validationNote = 'La validation de votre dossier ne signifie pas que la bourse est accordée : son attribution relève des autorités compétentes.';
    try {
      await this.deliver({
        to: recipient,
        subject,
        text: `Bonjour ${fullName},\n\n${intro}\n${note ? `\n${noteLabel} : ${note}\n` : ''}\n${outro}\n${validated ? `\n${validationNote}\n` : ''}\n${loginUrl}`,
        content: {
          preheader: intro,
          title: validated ? 'Votre dossier a été validé' : 'Votre dossier a été refusé',
          fullName,
          badge: validated ? { label: 'Dossier validé', accent: 'green' } : { label: 'Dossier refusé', accent: 'red' },
          paragraphs: [this.escapeHtml(intro), this.escapeHtml(outro)],
          highlight: note ? { accent: validated ? 'green' : 'red', html: `<strong style="display:block;margin-bottom:6px;">${noteLabel}</strong>${this.escapeHtml(note).replace(/\n/g, '<br>')}` } : undefined,
          button: { label: 'Accéder à mon espace', url: loginUrl },
          notes: validated ? [validationNote] : undefined,
        },
      });
    } catch {
      throw new ServiceUnavailableException("L'e-mail de décision n'a pas pu être envoyé.");
    }
  }

  async sendQuitusCodeEmail(recipient: string, fullName: string, code: string) {
    try {
      await this.deliver({
        to: recipient,
        subject: 'Votre code de vérification du quitus',
        text: `Bonjour ${fullName},\n\nUne demande de bourse utilise votre quitus. Code de vérification : ${code}\n\nCe code expire dans 10 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.`,
        content: {
          preheader: `Votre code de vérification : ${code}`,
          title: 'Code de vérification de votre quitus',
          fullName,
          paragraphs: ['Une demande de bourse vient d’utiliser votre quitus. Pour confirmer que vous en êtes bien le titulaire, saisissez ce code sur la plateforme :'],
          highlight: { accent: 'blue', html: `<span style="display:block;text-align:center;font-size:32px;font-weight:bold;letter-spacing:10px;font-family:'Courier New',monospace;">${this.escapeHtml(code)}</span>` },
          notes: ['Ce code est valable 10 minutes et ne peut être saisi que 5 fois.', 'Si vous n’êtes pas à l’origine de cette demande, ignorez ce message et ne communiquez ce code à personne.'],
        },
      });
    } catch {
      throw new ServiceUnavailableException("Le code de vérification n'a pas pu être envoyé.");
    }
  }

  async sendEmailChangeEmail(recipient: string, fullName: string, token: string) {
    const confirmUrl = new URL('/confirm-email-change', process.env.FRONTEND_URL ?? 'http://localhost:3000');
    confirmUrl.searchParams.set('token', token);
    try {
      await this.deliver({
        to: recipient,
        subject: 'Confirmez votre nouvelle adresse e-mail',
        text: `Bonjour ${fullName},\n\nConfirmez que cette adresse sera désormais celle de votre compte :\n${confirmUrl}\n\nCe lien est valable 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.`,
        content: {
          preheader: 'Confirmez votre nouvelle adresse e-mail.',
          title: 'Confirmez votre nouvelle adresse e-mail',
          fullName,
          paragraphs: ['Vous avez demandé à utiliser cette adresse pour votre compte. Tant que vous ne l’avez pas confirmée, votre ancienne adresse reste active.'],
          button: { label: 'Confirmer cette adresse', url: confirmUrl.toString() },
          notes: ['Ce lien est valable 1 heure.', 'Si vous n’êtes pas à l’origine de cette demande, ignorez ce message : rien ne sera modifié.'],
        },
      });
    } catch {
      throw new ServiceUnavailableException("L'e-mail de confirmation n'a pas pu être envoyé.");
    }
  }

  // Prévient l'ancienne adresse qu'elle n'est plus celle du compte (alerte de sécurité).
  async sendEmailChangedNotice(recipient: string, fullName: string, newEmail: string) {
    try {
      await this.deliver({
        to: recipient,
        subject: "L'adresse e-mail de votre compte a changé",
        text: `Bonjour ${fullName},\n\nL'adresse e-mail de votre compte est désormais ${newEmail}. Si vous n'êtes pas à l'origine de ce changement, contactez immédiatement un administrateur.`,
        content: {
          preheader: 'L’adresse e-mail de votre compte a été modifiée.',
          title: 'L’adresse e-mail de votre compte a changé',
          fullName,
          badge: { label: 'Alerte de sécurité', accent: 'amber' },
          paragraphs: ['L’adresse e-mail associée à votre compte a été modifiée.'],
          highlight: { accent: 'amber', html: `<strong style="display:block;margin-bottom:6px;">Nouvelle adresse</strong>${this.escapeHtml(newEmail)}` },
          notes: ['Si vous n’êtes pas à l’origine de ce changement, contactez immédiatement un administrateur de la plateforme.'],
        },
      });
    } catch {
      throw new ServiceUnavailableException("L'e-mail d'information n'a pas pu être envoyé.");
    }
  }

  // Prévient un secrétaire de la scolarité que son compte vient d'être créé. Le mot de passe n'est volontairement pas envoyé par e-mail :
  // le responsable qui a créé le compte le lui communique séparément.
  async sendCentralSecretaryCreatedEmail(recipient: string, fullName: string, createdBy: string) {
    const loginUrl = new URL('/login', process.env.FRONTEND_URL ?? 'http://localhost:3000').toString();
    try {
      await this.deliver({
        to: recipient,
        subject: 'Votre compte secrétaire de la scolarité centrale a été créé',
        text: `Bonjour ${fullName},\n\n${createdBy} vient de créer votre compte de secrétaire de la scolarité centrale sur la plateforme de demande de bourse nationale de l'Université de Mahajanga.\n\nVotre identifiant de connexion est cette adresse e-mail : ${recipient}\nVotre mot de passe vous est communiqué séparément par ${createdBy}. Changez-le dès votre première connexion, depuis la rubrique « Mon compte ».\n\nVous pourrez consulter les dossiers de bourse, les valider ou les refuser en indiquant un motif.\n\nSe connecter : ${loginUrl}`,
        content: {
          preheader: 'Votre compte secrétaire de la scolarité centrale est prêt.',
          title: 'Votre compte secrétaire a été créé',
          fullName,
          badge: { label: 'Scolarité centrale', accent: 'blue' },
          paragraphs: [
            `${this.escapeHtml(createdBy)} vient de créer votre compte de <strong>secrétaire de la scolarité centrale</strong> sur la plateforme de demande de bourse nationale de l’Université de Mahajanga.`,
            'Vous pourrez consulter les dossiers de bourse, les valider ou les refuser en indiquant un motif.',
          ],
          highlight: { accent: 'blue', html: `<strong style="display:block;margin-bottom:6px;">Votre identifiant de connexion</strong>${this.escapeHtml(recipient)}` },
          button: { label: 'Me connecter', url: loginUrl },
          notes: [`Votre mot de passe vous est communiqué séparément par ${this.escapeHtml(createdBy)}.`, 'Changez-le dès votre première connexion, depuis la rubrique « Mon compte ».'],
        },
      });
    } catch {
      throw new ServiceUnavailableException("L'e-mail de création du compte n'a pas pu être envoyé.");
    }
  }

  // Envoi commun : ajoute le logo de l'Université (s'il est présent sur le serveur) puis remet le message au serveur d'envoi.
  private async deliver(message: Message) {
    const hasLogo = existsSync(logoPath());
    this.logSent(await this.transporter().sendMail({
      from: this.required('SMTP_FROM'),
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: this.layout(message.content, hasLogo),
      attachments: hasLogo ? [{ filename: 'logo-universite-mahajanga.png', path: logoPath(), cid: LOGO_CID }] : [],
    }));
  }

  // Gabarit commun : bandeau de l'Université avec son logo, carte de contenu, bouton d'action centré et pied de page.
  // Mise en page en tableaux et styles en ligne, seule méthode fiable pour un rendu identique dans Gmail, Outlook et les applications mobiles.
  private layout(options: Layout, hasLogo: boolean) {
    const font = "font-family:Arial,Helvetica,sans-serif;";
    const logo = hasLogo
      ? `<td width="68" height="68" align="center" valign="middle" bgcolor="#ffffff" style="width:68px;height:68px;border-radius:14px;background:#ffffff;"><img src="cid:${LOGO_CID}" width="56" alt="Logo de l’Université de Mahajanga" style="display:block;margin:0 auto;border:0;outline:none;width:56px;height:auto;"></td><td width="18" style="width:18px;font-size:0;line-height:0;">&nbsp;</td>`
      : '';
    const badge = options.badge
      ? `<p style="margin:0 0 14px;"><span style="display:inline-block;padding:5px 12px;border-radius:999px;border:1px solid ${ACCENTS[options.badge.accent].border};background:${ACCENTS[options.badge.accent].background};color:${ACCENTS[options.badge.accent].color};font-size:12px;font-weight:bold;">${this.escapeHtml(options.badge.label)}</span></p>`
      : '';
    const highlight = options.highlight
      ? `<div style="margin:20px 0;padding:16px 18px;border-radius:10px;border:1px solid ${ACCENTS[options.highlight.accent].border};background:${ACCENTS[options.highlight.accent].background};color:#1e293b;font-size:14px;line-height:1.6;">${options.highlight.html}</div>`
      : '';
    // Bouton dans un tableau centré (technique « bulletproof ») : même rendu centré dans Gmail, Outlook et les applications mobiles.
    const button = options.button
      ? `<table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:28px auto 14px;"><tr><td align="center" bgcolor="#1d4ed8" style="border-radius:8px;background:#1d4ed8;"><a href="${this.escapeHtml(options.button.url)}" style="display:inline-block;padding:14px 30px;border-radius:8px;background:#1d4ed8;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;text-align:center;">${this.escapeHtml(options.button.label)}</a></td></tr></table><p style="margin:0 0 4px;font-size:12px;line-height:1.5;color:#64748b;text-align:center;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br><a href="${this.escapeHtml(options.button.url)}" style="color:#1d4ed8;word-break:break-all;">${this.escapeHtml(options.button.url)}</a></p>`
      : '';
    const notes = options.notes?.length
      ? `<div style="margin-top:22px;padding-top:18px;border-top:1px solid #e2e8f0;">${options.notes.map((note) => `<p style="margin:0 0 6px;font-size:13px;line-height:1.5;color:#64748b;">${note}</p>`).join('')}</div>`
      : '';
    return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${this.escapeHtml(options.title)}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f1f5f9;">${this.escapeHtml(options.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:28px 12px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">
<tr><td style="background:#0b3b60;border-radius:12px 12px 0 0;border-bottom:4px solid #fbbf24;padding:24px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>${logo}<td valign="middle">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:23px;font-weight:bold;color:#ffffff;">Université de Mahajanga</div>
<div style="${font}margin-top:5px;font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:#cbd5e1;">Demande de bourse nationale</div>
</td></tr></table>
</td></tr>
<tr><td style="${font}background:#ffffff;padding:32px;color:#1e293b;font-size:15px;line-height:1.65;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
${badge}<h1 style="margin:0 0 18px;font-size:22px;line-height:1.3;color:#0b3b60;">${this.escapeHtml(options.title)}</h1>
<p style="margin:0 0 14px;">Bonjour ${this.escapeHtml(options.fullName)},</p>
${options.paragraphs.map((paragraph) => `<p style="margin:0 0 14px;">${paragraph}</p>`).join('')}
${highlight}${button}${notes}
</td></tr>
<tr><td style="${font}background:#f8fafc;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 12px 12px;padding:20px 32px;font-size:12px;line-height:1.6;color:#64748b;">
Ce message a été envoyé automatiquement par la plateforme de demande de bourse nationale de l’Université de Mahajanga. Merci de ne pas y répondre.
</td></tr>
</table>
</td></tr></table>
</body></html>`;
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
