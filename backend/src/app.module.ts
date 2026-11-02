import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthController } from './auth/auth.controller.js';
import { AuthService } from './auth/auth.service.js';
import { GoogleAuthService } from './auth/google-auth.service.js';
import { PrismaService } from './common/prisma.service.js';
import { MailService } from './mail/mail.service.js';
import { AdminController } from './admin/admin.controller.js';
import { EstablishmentController } from './establishments/establishment.controller.js';
import { StudentController } from './students/student.controller.js';
import { CentralRegistrarController } from './admin/central-registrar.controller.js';
import { DocumentService } from './documents/document.service.js';
import { DocumentController } from './documents/document.controller.js';
import { SiteSettingsService } from './homepage/site-settings.service.js';
import { SiteSettingsController } from './homepage/site-settings.controller.js';
import { HomepageService } from './homepage/homepage.service.js';
import { HomepageController } from './homepage/homepage.controller.js';
import { EstablishmentsService } from './establishments/establishments.service.js';
import { QuitusService } from './students/quitus.service.js';
import { AccountService } from './account/account.service.js';
import { AccountController } from './account/account.controller.js';
import { NotificationsController } from './notifications/notifications.controller.js';
import { EstablishmentsController } from './establishments/establishments.controller.js';

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
