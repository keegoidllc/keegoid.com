# Invitation-only personal introduction

The standalone `/about-me/` directory is copied by Hugo from static. No Hugo content page, menu entry, sitemap entry, RSS entry or homepage card is created. Do not add plaintext personal copy to the public repository.

Build: `node scripts/build-private-about.mjs`, then `hugo`. Private input lives in ignored `.private-about/profile.json` with title and paragraphs fields; the generated 24-character random invitation code stays in ignored `.private-about/invitation-code.txt`. Both must have owner-only permissions. Output payload is AES-256-GCM ciphertext using a unique random salt and IV, PBKDF2-SHA256 with 600,000 iterations, and a 144-bit random code. Never substitute a memorable short PIN. The unlock code is not embedded in the site, sent to a server, included in a URL, or persisted in browser storage. Browser decryption requires HTTPS or localhost.

The code is a bearer secret: recipients can forward it or save screenshots/plaintext. This is encrypted static content, not identity-verified access. No per-person revocation, audit trail or brute-force rate limiter exists; strong random codes resist offline guessing. To rotate, remove the local code file, rebuild, deploy and send the new code privately. Rotation cannot revoke previously downloaded ciphertext from someone who retained the old code. For per-person revocation use server-side access control instead.

The page carries noindex and no-referrer directives. `_headers` applies no-store and frame denial on Cloudflare Pages. Search exclusion is not the confidentiality mechanism; encryption is. Keep all dating research, city plans and relationship notes out of the site. The generic gate says shared personally, not exclusively shared with one recipient.

Before deployment verify `node --test scripts/private-about.test.mjs`, build, check sitemap/home/navigation for accidental links and search output for plaintext/code. Review age and employment periodically. Local preparation does not publish the page; normal deployment requires authorization. Code delivery to recipients is manual.

The optional photo is read from ignored `.private-about/about-me.jpg` and encrypted inside the payload with its caption. Never place this image in static/images. Locking clears its data URL from the DOM. Preserve the full composition so both kayakers remain visible.
