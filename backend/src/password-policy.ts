import { BadRequestException } from '@nestjs/common';

// Mots de passe les plus courants (la longueur minimale de 8 caractères reste contrôlée à part).
const commonPasswords = new Set([
  '12345678', '123456789', '1234567890', '87654321', '11111111', '00000000', 'password', 'password1', 'password123', 'motdepasse',
  'azertyui', 'azertyuiop', 'azerty123', 'qwertyui', 'qwerty123', 'iloveyou', 'abcd1234', 'admin123', 'administrateur', 'bienvenue', 'madagascar', 'mahajanga',
]);

export function assertPasswordNotCommon(password: string, email?: string) {
  const normalized = password.trim().toLowerCase();
  if (commonPasswords.has(normalized) || /^(.)\1+$/.test(normalized) || (email && normalized === email.trim().toLowerCase())) {
    throw new BadRequestException('Ce mot de passe est trop courant. Choisissez-en un moins prévisible.');
  }
}
