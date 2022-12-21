import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scrypt as scryptCb,
} from 'crypto';
import { promisify } from 'util';

const CIPHER_ALGORITHM = 'aes-128-gcm';
const KEY_LENGTH = 16;
const scrypt = promisify(scryptCb);

export async function encryptText(
  text: string,
  secret: string,
): Promise<{
  encrypted: Buffer;
  iv: Buffer;
  salt: Buffer;
  tag: Buffer;
}> {
  const iv = randomBytes(16);
  const salt = randomBytes(16);
  const key = (await scrypt(secret, salt, KEY_LENGTH)) as Buffer;
  const cipher = createCipheriv(CIPHER_ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { encrypted, iv, salt, tag };
}

export async function decryptText(
  encrypted: Buffer,
  iv: Buffer,
  salt: Buffer,
  tag: Buffer,
  secret: string,
): Promise<string> {
  const key = (await scrypt(secret, salt, KEY_LENGTH)) as Buffer;
  const decipher = createDecipheriv(CIPHER_ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const decryptedBuffer = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decryptedBuffer.toString('utf8');
}
