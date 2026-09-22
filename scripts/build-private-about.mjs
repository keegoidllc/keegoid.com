import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { randomBytes, pbkdf2Sync, createCipheriv } from 'node:crypto';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const privateDir = resolve(root, '.private-about');
const output = resolve(root, 'static/about-me');
// Private source and code never enter Hugo's content or static trees.
const profile = JSON.parse(await readFile(resolve(privateDir, 'profile.json'), 'utf8'));
if (typeof profile.title !== 'string' || !Array.isArray(profile.paragraphs) || !profile.paragraphs.every(p => typeof p === 'string')) throw Error('Invalid profile');
if (profile.photo) {
  const photo = await readFile(resolve(privateDir, 'about-me.jpg'));
  if (photo[0] !== 0xff || photo[1] !== 0xd8) throw Error('Expected JPEG photo');
  profile.photo.src = 'data:image/jpeg;base64,' + photo.toString('base64');
}
await mkdir(output, { recursive: true });
await mkdir(privateDir, { recursive: true, mode: 0o700 });
let code;
try { code = (await readFile(resolve(privateDir, 'invitation-code.txt'), 'utf8')).trim(); }
catch (e) { if (e.code !== 'ENOENT') throw e; code = randomBytes(18).toString('base64url'); await writeFile(resolve(privateDir, 'invitation-code.txt'), code+'\n', {mode:0o600}); }
if (!/^[A-Za-z0-9_-]{24,}$/.test(code)) throw Error('Use a generated high-entropy invitation code, not a short PIN');
const salt = randomBytes(16), iv = randomBytes(12), iterations = 600000;
const key = pbkdf2Sync(code, salt, iterations, 32, 'sha256');
const cipher = createCipheriv('aes-256-gcm', key, iv);
const ciphertext = Buffer.concat([cipher.update(JSON.stringify(profile), 'utf8'), cipher.final(), cipher.getAuthTag()]);
await writeFile(resolve(output,'payload.bin'), Buffer.concat([Buffer.from([1]), salt, iv, ciphertext]));
console.log('Encrypted profile built. Invitation code stays in .private-about/invitation-code.txt.');
