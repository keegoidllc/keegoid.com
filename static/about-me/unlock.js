'use strict';
const gate = document.querySelector('#gate'), profile = document.querySelector('#profile');
const code = document.querySelector('#code'), message = document.querySelector('#message'), submit = document.querySelector('#submit');
const bytes = text => Uint8Array.from(atob(text), c => c.charCodeAt(0));
function lock() {
  document.querySelector('#heading').textContent = '';
  document.querySelector('#paragraphs').replaceChildren();
  document.querySelector('#portrait').removeAttribute('src');
  document.querySelector('#portrait').alt = '';
  document.querySelector('#caption').textContent = '';
  document.querySelector('#photo').hidden = true;
  profile.hidden = true; gate.hidden = false; code.value = ''; message.textContent = ''; code.focus();
}
document.querySelector('#lock').addEventListener('click', lock);
window.addEventListener('pagehide', lock);
document.querySelector('#unlock').addEventListener('submit', async event => {
  event.preventDefault(); submit.disabled = true; message.textContent = 'Opening…';
  try {
    if (!window.crypto?.subtle) throw new Error('unsupported');
    const response = await fetch('./payload.json', {cache:'no-store',credentials:'omit'});
    if (!response.ok) throw new Error('unavailable');
    const payload = await response.json();
    if (payload.version !== 1 || payload.iterations !== 600000) throw new Error('unsupported');
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(code.value.trim()), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt:bytes(payload.salt),iterations:payload.iterations},material,{name:'AES-GCM',length:256},false,['decrypt']);
    const clear = await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(payload.iv)},key,bytes(payload.ciphertext));
    const data = JSON.parse(new TextDecoder().decode(clear));
    if (typeof data.title !== 'string' || !Array.isArray(data.paragraphs) || !data.paragraphs.every(p => typeof p === 'string')) throw new Error('invalid');
    document.querySelector('#heading').textContent = data.title;
    document.querySelector('#paragraphs').replaceChildren(...data.paragraphs.map(text => { const p=document.createElement('p'); p.textContent=text; return p; }));
    if (data.photo) {
      if (typeof data.photo.src !== 'string' || !data.photo.src.startsWith('data:image/jpeg;base64,') || typeof data.photo.alt !== 'string' || typeof data.photo.caption !== 'string') throw new Error('invalid');
      document.querySelector('#portrait').src = data.photo.src;
      document.querySelector('#portrait').alt = data.photo.alt;
      document.querySelector('#caption').textContent = data.photo.caption;
      document.querySelector('#photo').hidden = false;
    }
    code.value=''; message.textContent=''; gate.hidden=true; profile.hidden=false; profile.focus();
  } catch (error) {
    message.textContent = error.name === 'OperationError' ? 'That code did not open the page. Please check it and try again.' : 'The introduction could not be opened. Please try again using the secure website link.';
  } finally { submit.disabled=false; }
});
