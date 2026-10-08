import { Body, Controller, Delete, Get, Headers, Param, Post, Put, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service.js';
import { SiteSettingsService } from './site-settings.service.js';
import type { UpdateSiteSettingsDto } from './site-settings.service.js';

type UploadedAsset = { buffer: Buffer; originalname: string; mimetype: string; size: number };

@Controller()
export class SiteSettingsController {
  constructor(private readonly authService: AuthService, private readonly siteSettings: SiteSettingsService) {}

  @Get('site-settings')
  get() {
    return this.siteSettings.get();
  }

  @Put('admin/site-settings')
  async update(@Body() body: UpdateSiteSettingsDto, @Headers('authorization') authorization?: string) {
    const admin = await this.authService.requireAdmin(authorization);
    const settings = await this.siteSettings.update(body);
    await this.siteSettings.audit(admin, 'HOMEPAGE_CONTENT_UPDATED', 'Réglages de la page d’accueil', Object.keys(body ?? {}).join(', '));
    return settings;
  }

  @Post('admin/site-settings/upload/:asset')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async upload(@Param('asset') asset: string, @UploadedFile() file: UploadedAsset | undefined, @Headers('authorization') authorization?: string) {
    const admin = await this.authService.requireAdmin(authorization);
    const settings = await this.siteSettings.uploadAsset(asset, file);
    await this.siteSettings.audit(admin, 'HOMEPAGE_IMAGE_UPDATED', asset === 'logo' ? 'Logo' : 'Icône du site', file?.originalname);
    return settings;
  }

  @Post('admin/site-settings/hero-images')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async addHeroImage(@UploadedFile() file: UploadedAsset | undefined, @Headers('authorization') authorization?: string) {
    const admin = await this.authService.requireAdmin(authorization);
    const settings = await this.siteSettings.addHeroImage(file);
    await this.siteSettings.audit(admin, 'HOMEPAGE_CAROUSEL_UPDATED', 'Carrousel de la page d’accueil', `Ajout de l’image ${file?.originalname ?? ''}`.trim());
    return settings;
  }

  @Delete('admin/site-settings/hero-images/:index')
  async removeHeroImage(@Param('index') index: string, @Headers('authorization') authorization?: string) {
    const admin = await this.authService.requireAdmin(authorization);
    const settings = await this.siteSettings.removeHeroImage(Number(index));
    await this.siteSettings.audit(admin, 'HOMEPAGE_CAROUSEL_UPDATED', 'Carrousel de la page d’accueil', `Suppression de l’image n° ${Number(index) + 1}`);
    return settings;
  }

  @Post('admin/site-settings/reset')
  async reset(@Headers('authorization') authorization?: string) {
    const admin = await this.authService.requireAdmin(authorization);
    const settings = await this.siteSettings.reset();
    await this.siteSettings.audit(admin, 'HOMEPAGE_CONTENT_UPDATED', 'Réglages de la page d’accueil', 'Réinitialisation');
    return settings;
  }
}
