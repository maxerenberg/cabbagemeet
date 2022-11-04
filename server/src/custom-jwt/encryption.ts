import {createCipheriv, createDecipheriv, randomBytes, scrypt as scryptCb} from 'crypto';
import {promisify} from 'util';

const CIPHER_ALGORITHM = 'aes-128-ctr';
const KEY_LENGTH = 16;
const scrypt = promisify(scryptCb);

export async function encryptText(text: string, secret: string): Promise<{
  encrypted: Buffer;
  iv: Buffer;
  salt: Buffer;
}> {
  const iv = randomBytes(16);
  const salt = randomBytes(16);
  const key = await scrypt(secret, salt, KEY_LENGTH) as Buffer;
  const cipher = createCipheriv(CIPHER_ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(text),
    cipher.final(),
  ]);
  return {encrypted, iv, salt};
}

export async function decryptText(encrypted: Buffer, iv: Buffer, salt: Buffer, secret: string): Promise<string> {
  const key = await scrypt(secret, salt, KEY_LENGTH) as Buffer;
  const decipher = createDecipheriv(CIPHER_ALGORITHM, key, iv);
  const decryptedBuffer = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decryptedBuffer.toString('utf8');
}
