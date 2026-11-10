export interface Account {
  id: string;
  name: string;
  role: 'manager' | 'operator';
  salt: string;
  hash: string;
}

async function derive(password: string, salt: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({
    name: 'PBKDF2', salt: encoder.encode(salt), iterations: 600000, hash: 'SHA-256',
  }, key, 256);
  return Array.from(new Uint8Array(bits), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function createAccount(name: string, role: Account['role'], password: string): Promise<Account> {
  const salt = crypto.randomUUID();
  return { id: crypto.randomUUID(), name, role, salt, hash: await derive(password, salt) };
}

export async function verifyPassword(account: Account, password: string) {
  const hash = await derive(password, account.salt);
  return hash === account.hash;
}
