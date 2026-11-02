import { BadRequestException } from '@nestjs/common';

// Le type annoncé par le navigateur ne suffit pas : on contrôle aussi les premiers octets du fichier.
export function looksLikeFile(buffer: Buffer, mimeType: string) {
  if (mimeType === 'image/png') return buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimeType === 'image/jpeg') return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === 'image/webp') return buffer.length > 12 && buffer.subarray(0, 4).toString('latin1') === 'RIFF' && buffer.subarray(8, 12).toString('latin1') === 'WEBP';
  if (mimeType === 'application/pdf') return buffer.subarray(0, 1024).toString('latin1').includes('%PDF-');
  if (mimeType === 'image/svg+xml') return isSafeSvg(buffer);
  return false;
}

// Un SVG est du texte exécutable : on refuse ceux qui contiennent des scripts, des gestionnaires d'événements ou des contenus externes.
function isSafeSvg(buffer: Buffer) {
  const text = buffer.toString('utf8');
  if (!/<svg[\s>]/i.test(text)) return false;
  return !/<\s*(script|foreignObject|iframe|embed|object)\b|\son\w+\s*=|javascript:|data:text\/html|<!ENTITY/i.test(text);
}

export function assertFileMatchesType(file: { buffer: Buffer; mimetype: string }, message = "Le contenu du fichier ne correspond pas au format annoncé.") {
  if (!looksLikeFile(file.buffer, file.mimetype)) throw new BadRequestException(message);
}
