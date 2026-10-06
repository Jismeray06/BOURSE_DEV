import { Controller, Get, Headers, Param, Patch, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { PrismaService } from './prisma.service.js';

// Notifications de l'utilisateur connecté (cloche de l'en-tête).
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly authService: AuthService, private readonly prisma: PrismaService) {}

  @Get()
  async list(@Headers('authorization') authorization?: string) {
    const user = await this.authService.requireUser(authorization);
    const [items, unread] = await Promise.all([
      this.prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 50, select: { id: true, type: true, title: true, message: true, readAt: true, createdAt: true } }),
      this.prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    ]);
    return { items, unread };
  }

  // Déclarée avant « :id/read » pour ne pas être confondue avec un identifiant.
  @Post('read-all')
  async readAll(@Headers('authorization') authorization?: string) {
    const user = await this.authService.requireUser(authorization);
    const result = await this.prisma.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
    return { updated: result.count };
  }

  // Chaque utilisateur ne peut marquer comme lues que ses propres notifications.
  @Patch(':id/read')
  async read(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    const user = await this.authService.requireUser(authorization);
    const result = await this.prisma.notification.updateMany({ where: { id, userId: user.id, readAt: null }, data: { readAt: new Date() } });
    return { updated: result.count };
  }
}
