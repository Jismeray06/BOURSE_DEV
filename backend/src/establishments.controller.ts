import { BadRequestException, Body, Controller, Delete, Get, Headers, Param, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service.js';
import { EstablishmentsService } from './establishments.service.js';

type UploadedLogo = { buffer: Buffer; originalname: string; mimetype: string; size: number };
type EstablishmentBody = { name?: unknown; active?: unknown };
const logoUpload = FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } });

@Controller()
export class EstablishmentsController {
  constructor(private readonly authService: AuthService, private readonly establishments: EstablishmentsService) {}

  // --- Public : liste proposée aux étudiants ---
  @Get('establishments')
  list() {
    return this.establishments.listPublic();
  }

  // --- Administrateur : gestion de tous les établissements ---
  @Get('admin/institutions')
  async adminList(@Headers('authorization') authorization?: string) {
    await this.authService.requireAdmin(authorization);
    return this.establishments.listForAdmin();
  }

  @Post('admin/institutions')
  async adminCreate(@Body() body: EstablishmentBody, @Headers('authorization') authorization?: string) {
    await this.authService.requireAdmin(authorization);
    return this.establishments.create(body.name);
  }

  @Patch('admin/institutions/:id')
  async adminUpdate(@Param('id') id: string, @Body() body: EstablishmentBody, @Headers('authorization') authorization?: string) {
    await this.authService.requireAdmin(authorization);
    return this.establishments.update(id, body);
  }

  @Post('admin/institutions/:id/logo')
  @UseInterceptors(logoUpload)
  async adminSetLogo(@Param('id') id: string, @UploadedFile() file: UploadedLogo | undefined, @Headers('authorization') authorization?: string) {
    await this.authService.requireAdmin(authorization);
    return this.establishments.setLogo(id, file);
  }

  @Delete('admin/institutions/:id/logo')
  async adminRemoveLogo(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    await this.authService.requireAdmin(authorization);
    return this.establishments.removeLogo(id);
  }

  @Delete('admin/institutions/:id')
  async adminRemove(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    await this.authService.requireAdmin(authorization);
    return this.establishments.remove(id);
  }

  // --- Espace établissement : identité de son propre établissement ---
  @Get('establishment/isstm/profile')
  async profile(@Headers('authorization') authorization?: string) {
    const manager = await this.authService.requireEstablishmentManager(authorization);
    const { id, name, logoUrl } = await this.establishments.ensure(this.nameOf(manager.establishment));
    return { id, name, logoUrl };
  }

  @Patch('establishment/isstm/profile')
  async updateProfile(@Body() body: Pick<EstablishmentBody, 'name'>, @Headers('authorization') authorization?: string) {
    const current = await this.ownEstablishment(authorization);
    const { id, name, logoUrl } = await this.establishments.update(current.id, { name: body.name });
    return { id, name, logoUrl };
  }

  @Post('establishment/isstm/profile/logo')
  @UseInterceptors(logoUpload)
  async setProfileLogo(@UploadedFile() file: UploadedLogo | undefined, @Headers('authorization') authorization?: string) {
    const current = await this.ownEstablishment(authorization);
    const { id, name, logoUrl } = await this.establishments.setLogo(current.id, file);
    return { id, name, logoUrl };
  }

  @Delete('establishment/isstm/profile/logo')
  async removeProfileLogo(@Headers('authorization') authorization?: string) {
    const current = await this.ownEstablishment(authorization);
    const { id, name, logoUrl } = await this.establishments.removeLogo(current.id);
    return { id, name, logoUrl };
  }

  // Le nom et le logo ne se modifient que par le responsable de l'établissement.
  private async ownEstablishment(authorization?: string) {
    const manager = await this.authService.requireEstablishmentAdmin(authorization);
    return this.establishments.ensure(this.nameOf(manager.establishment));
  }

  private nameOf(establishment: string | null) {
    if (!establishment?.trim()) throw new BadRequestException('Aucun établissement n’est associé à ce compte.');
    return establishment.trim();
  }
}
