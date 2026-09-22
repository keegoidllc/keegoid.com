import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, copyFile, writeFile, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {webcrypto} from 'node:crypto';
test('encrypted profile: correct code, wrong code, tampering, fresh salt and IV', async () => {
 const root=await mkdtemp(join(tmpdir(),'private-about-test-'));
 try {
  await mkdir(join(root,'scripts')); await mkdir(join(root,'.private-about'));
  await copyFile(new URL('./build-private-about.mjs',import.meta.url),join(root,'scripts/build-private-about.mjs'));
  const expected={title:'Private test name',paragraphs:['This private sentence must not appear in ciphertext.']};
  await writeFile(join(root,'.private-about/profile.json'),JSON.stringify(expected));
  const build=()=>execFileSync(process.execPath,[join(root,'scripts/build-private-about.mjs')]);build();
  const code=(await readFile(join(root,'.private-about/invitation-code.txt'),'utf8')).trim();
  const unpack=b=>({version:b[0],iterations:600000,salt:b.subarray(1,17).toString('base64'),iv:b.subarray(17,29).toString('base64'),ciphertext:b.subarray(29).toString('base64')});
  const raw=await readFile(join(root,'static/about-me/payload.bin')),p=unpack(raw);
  assert(!raw.includes(code));assert(!raw.includes(expected.title));assert.equal(code.length,24);
  async function decrypt(secret, data=p) {
   const material=await webcrypto.subtle.importKey('raw',new TextEncoder().encode(secret),'PBKDF2',false,['deriveKey']);
   const key=await webcrypto.subtle.deriveKey({name:'PBKDF2',salt:Buffer.from(data.salt,'base64'),iterations:data.iterations,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['decrypt']);
   return JSON.parse(new TextDecoder().decode(await webcrypto.subtle.decrypt({name:'AES-GCM',iv:Buffer.from(data.iv,'base64')},key,Buffer.from(data.ciphertext,'base64'))));
  }
  assert.deepEqual(await decrypt(code),expected);
  await assert.rejects(decrypt('wrong-code'));
  const corrupt=Buffer.from(p.ciphertext,'base64');corrupt[0]^=1;
  await assert.rejects(decrypt(code,{...p,ciphertext:corrupt.toString('base64')}));
  build();const fresh=unpack(await readFile(join(root,'static/about-me/payload.bin')));
  assert.notEqual(fresh.salt,p.salt);assert.notEqual(fresh.iv,p.iv);assert.deepEqual(await decrypt(code,fresh),expected);
  await writeFile(join(root,'.private-about/invitation-code.txt'),'1234');
  assert.throws(build);
 } finally {await rm(root,{recursive:true,force:true});}
});
