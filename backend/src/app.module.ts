import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { GoogleAuthService } from './google-auth.service.js';
import { PrismaService } from './prisma.service.js';
import { AdminController } from './admin.controller.js';
import { EstablishmentController } from './establishment.controller.js';
import { StudentController } from './student.controller.js';
import { CentralRegistrarController } from './central-registrar.controller.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'backend',
    }),
  ],
  controllers: [AppController, AuthController, AdminController, EstablishmentController, StudentController, CentralRegistrarController],
  providers: [AppService, AuthService, GoogleAuthService, PrismaService],
})
export class AppModule {}
