import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

// Traduit les erreurs de base de données en réponses HTTP claires (au lieu d'un 500) sans exposer le détail de la requête SQL.
@Catch(Prisma.PrismaClientKnownRequestError, Prisma.PrismaClientValidationError, Prisma.PrismaClientUnknownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('PrismaExceptionFilter');

  catch(error: Error, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, message } = this.describe(error);
    if (status >= 500) this.logger.error(error.message);
    response.status(status).json({ statusCode: status, message, error: HttpStatus[status] });
  }

  private describe(error: Error): { status: number; message: string } {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') return { status: HttpStatus.CONFLICT, message: 'Cette valeur existe déjà.' };
      if (error.code === 'P2025') return { status: HttpStatus.NOT_FOUND, message: 'Élément introuvable.' };
      if (error.code === 'P2003') return { status: HttpStatus.CONFLICT, message: 'Opération impossible : des données y sont rattachées.' };
      if (['P2000', 'P2006', 'P2007', 'P2011', 'P2012', 'P2020', 'P2023'].includes(error.code)) return { status: HttpStatus.BAD_REQUEST, message: 'Données invalides.' };
    }
    // Validation Prisma (champ inconnu, type incorrect) ou caractère nul interdit par PostgreSQL.
    if (error instanceof Prisma.PrismaClientValidationError || /22021|invalid byte sequence/i.test(error.message)) return { status: HttpStatus.BAD_REQUEST, message: 'Données invalides.' };
    return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error' };
  }
}
