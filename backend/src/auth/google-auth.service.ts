import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class GoogleAuthService {
  private readonly clientId = process.env.GOOGLE_CLIENT_ID;
  private readonly clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  private readonly callbackUrl =
    process.env.GOOGLE_CALLBACK_URL ?? 'http://localhost:3001/auth/google/callback';

  getAuthorizationUrl(state: string) {
    return this.client().generateAuthUrl({
      access_type: 'offline',
      prompt: 'select_account',
      scope: ['openid', 'email', 'profile'],
      state,
    });
  }

  async getVerifiedProfile(code: string) {
    const client = this.client();
    const { tokens } = await client.getToken(code);

    if (!tokens.id_token) {
      throw new UnauthorizedException('Google n’a pas renvoyé de jeton d’identité.');
    }

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: this.clientId,
    });
    const payload = ticket.getPayload();

    if (!payload?.email || !payload.email_verified) {
      throw new UnauthorizedException('Votre adresse e-mail Google doit être vérifiée.');
    }

    return {
      email: payload.email,
      fullName: payload.name ?? payload.email.split('@')[0],
    };
  }

  private client() {
    if (!this.clientId || !this.clientSecret) {
      throw new ServiceUnavailableException(
        'La connexion Google n’est pas encore configurée sur le serveur.',
      );
    }

    return new OAuth2Client(this.clientId, this.clientSecret, this.callbackUrl);
  }
}
