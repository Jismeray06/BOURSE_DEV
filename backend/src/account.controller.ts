import { BadRequestException, Body, Controller, Delete, Get, Headers, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AccountService } from './account.service.js';
import { AuthService } from './auth.service.js';

type PasswordBody = { currentPassword?: unknown; newPassword?: unknown };
type EmailBody = { newEmail?: unknown; currentPassword?: unknown };

@Controller('account')
export class AccountController {
  constructor(private readonly authService: AuthService, private readonly account: AccountService) {}

  @Get('me')
  async me(@Headers('authorization') authorization?: string) {
    const user = await this.authService.requireUser(authorization);
    return { id: user.id, fullName: user.fullName, email: user.email, role: user.role, avatarUrl: user.avatarUrl };
  }

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 3 * 1024 * 1024 } }))
  async setAvatar(@UploadedFile() file: { buffer: Buffer; mimetype: string; size: number } | undefined, @Headers('authorization') authorization?: string) {
    const user = await this.authService.requireUser(authorization);
    return this.account.setAvatar(user, file);
  }

  @Delete('avatar')
  async removeAvatar(@Headers('authorization') authorization?: string) {
    const user = await this.authService.requireUser(authorization);
    return this.account.removeAvatar(user);
  }

  @Patch('password')
  async changePassword(@Body() body: PasswordBody, @Headers('authorization') authorization?: string) {
    const user = await this.authService.requireUser(authorization);
    return this.account.changePassword(user, this.text(body.currentPassword, 'Le mot de passe actuel'), this.text(body.newPassword, 'Le nouveau mot de passe'));
  }

  @Post('email')
  async requestEmailChange(@Body() body: EmailBody, @Headers('authorization') authorization?: string) {
    const user = await this.authService.requireUser(authorization);
    return this.account.requestEmailChange(user, this.text(body.newEmail, 'La nouvelle adresse e-mail'), this.text(body.currentPassword, 'Le mot de passe actuel'));
  }

  // Public : le jeton reçu à la nouvelle adresse fait office de preuve.
  @Post('email/confirm')
  confirmEmailChange(@Body() body: { token?: unknown }) {
    return this.account.confirmEmailChange(this.text(body.token, 'Le jeton de confirmation'));
  }

  private text(value: unknown, label: string) {
    if (typeof value !== 'string' || !value.trim()) throw new BadRequestException(`${label} est obligatoire.`);
    return value;
  }
}
