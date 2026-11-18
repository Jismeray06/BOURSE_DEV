import { BadRequestException } from '@nestjs/common';
import { assertPasswordNotCommon } from './password-policy.js';

describe('assertPasswordNotCommon', () => {
  it('refuse un mot de passe courant', () => {
    expect(() => assertPasswordNotCommon('password123')).toThrow(BadRequestException);
    expect(() => assertPasswordNotCommon('  Mahajanga  ')).toThrow(BadRequestException);
  });

  it('refuse un mot de passe fait d’un seul caractère répété', () => {
    expect(() => assertPasswordNotCommon('aaaaaaaaaa')).toThrow(BadRequestException);
  });

  it('refuse un mot de passe identique à l’adresse e-mail', () => {
    expect(() => assertPasswordNotCommon('Jean@Univ.mg', 'jean@univ.mg')).toThrow(BadRequestException);
  });

  it('accepte un mot de passe peu prévisible', () => {
    expect(() => assertPasswordNotCommon('Rouge-Baobab-47!', 'jean@univ.mg')).not.toThrow();
  });
});
