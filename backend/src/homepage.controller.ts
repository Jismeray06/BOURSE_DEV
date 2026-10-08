import { Body, Controller, Delete, Get, Headers, Param, Patch, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { HomepageService } from './homepage.service.js';
import type { HeroDto, NewsDto } from './homepage.service.js';

// Lecture publique ; toute modification exige un ADMIN, contrôlé ici côté serveur (jamais seulement dans l'interface).
@Controller()
export class HomepageController {
  constructor(private readonly authService: AuthService, private readonly homepage: HomepageService) {}

  @Get('homepage')
  get() {
    return this.homepage.get();
  }

  // Sert aussi à l'interface pour confirmer que la session est bien celle d'un administrateur.
  @Get('admin/homepage')
  async getForAdmin(@Headers('authorization') authorization?: string) {
    await this.authService.requireAdmin(authorization);
    return this.homepage.get();
  }

  @Patch('admin/homepage/content')
  async updateContent(@Body() body: unknown, @Headers('authorization') authorization?: string) {
    const admin = await this.authService.requireAdmin(authorization);
    return this.homepage.updateContent(admin, body);
  }

  @Patch('admin/homepage/hero')
  async updateHero(@Body() body: HeroDto, @Headers('authorization') authorization?: string) {
    const admin = await this.authService.requireAdmin(authorization);
    return this.homepage.updateHero(admin, body ?? {});
  }

  @Post('admin/homepage/news')
  async createNews(@Body() body: NewsDto, @Headers('authorization') authorization?: string) {
    const admin = await this.authService.requireAdmin(authorization);
    return this.homepage.createNews(admin, body ?? {});
  }

  @Patch('admin/homepage/news/:id')
  async updateNews(@Param('id') id: string, @Body() body: NewsDto, @Headers('authorization') authorization?: string) {
    const admin = await this.authService.requireAdmin(authorization);
    return this.homepage.updateNews(admin, id, body ?? {});
  }

  @Delete('admin/homepage/news/:id')
  async deleteNews(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    const admin = await this.authService.requireAdmin(authorization);
    return this.homepage.deleteNews(admin, id);
  }
}
