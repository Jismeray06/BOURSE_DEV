import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { GoogleAuthService } from './google-auth.service.js';
import { PrismaService } from './prisma.service.js';
import { MailService } from './mail.service.js';
import { AdminController } from './admin.controller.js';
import { EstablishmentController } from './establishment.controller.js';
import { StudentController } from './student.controller.js';
import { CentralRegistrarController } from './central-registrar.controller.js';
import { DocumentService } from './document.service.js';
import { DocumentController } from './document.controller.js';
import { SiteSettingsService } from './site-settings.service.js';
import { SiteSettingsController } from './site-settings.controller.js';
import { HomepageService } from './homepage.service.js';
import { HomepageController } from './homepage.controller.js';
import { EstablishmentsService } from './establishments.service.js';
import { QuitusService } from './quitus.service.js';
import { AccountService } from './account.service.js';
import { AccountController } from './account.controller.js';
import { NotificationsController } from './notifications.controller.js';
import { EstablishmentsController } from './establishments.controller.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

const observeImports =
  process.env.OBSERVE_APP_KEY && process.env.OBSERVE_APP_SECRET
    ? [
        ObserveModule.forRoot({
          appKey: process.env.OBSERVE_APP_KEY,
          appSecret: process.env.OBSERVE_APP_SECRET,
          serviceId: 'backend',
        }),
      ]
    : [];

@Module({
  imports: [
    ...observeImports,
    // controllers...
  ],
  controllers: [AppController, AuthController, AdminController, EstablishmentController, StudentController, CentralRegistrarController, DocumentController, SiteSettingsController, HomepageController, EstablishmentsController, AccountController, NotificationsController],
  providers: [AppService, AuthService, GoogleAuthService, PrismaService, MailService, DocumentService, SiteSettingsService, HomepageService, EstablishmentsService, QuitusService, AccountService],
})
export class AppModule {}
