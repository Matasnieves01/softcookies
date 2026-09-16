import type { User } from '../types';

const USERS_KEY = 'softcookies_users';
const CURRENT_USER_KEY = 'softcookies_current_user';

// Default initial admin account for Chef Chelsea
const DEFAULT_ADMIN: User = {
  id: 'admin-chef-chelsea',
  name: 'Chef Chelsea',
  email: 'chef@softcookies.com',
  phone: '6000-0000',
  role: 'admin',
  createdAt: new Date().toISOString()
};

function getStoredUsers(): { user: User; pass: string }[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(USERS_KEY);
  if (!stored) {
    const initial = [{ user: DEFAULT_ADMIN, pass: 'admin123' }];
    localStorage.setItem(USERS_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(CURRENT_USER_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function registerUser(name: string, email: string, phone: string, pass: string): User {
  const users = getStoredUsers();
  const normalizedEmail = email.trim().toLowerCase();

  const existing = users.find((u) => u.user.email.toLowerCase() === normalizedEmail);
  if (existing) {
    throw new Error('Ya existe una cuenta registrada con este correo electrónico.');
  }

  const newUser: User = {
    id: 'user-' + Date.now(),
    name: name.trim(),
    email: normalizedEmail,
    phone: phone.trim(),
    role: 'customer',
    createdAt: new Date().toISOString()
  };

  users.push({ user: newUser, pass });
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));

  // Dispatch custom event for reactive UI updates
  window.dispatchEvent(new CustomEvent('softcookies:auth-changed', { detail: newUser }));
  return newUser;
}

export function loginUser(email: string, pass: string): User {
  const users = getStoredUsers();
  const normalizedEmail = email.trim().toLowerCase();

  const account = users.find(
    (u) => u.user.email.toLowerCase() === normalizedEmail && u.pass === pass
  );

  if (!account) {
    throw new Error('Correo o contraseña incorrectos.');
  }

  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(account.user));
  window.dispatchEvent(new CustomEvent('softcookies:auth-changed', { detail: account.user }));
  return account.user;
}

export function logoutUser(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CURRENT_USER_KEY);
  window.dispatchEvent(new CustomEvent('softcookies:auth-changed', { detail: null }));
}

export function isAdminUser(): boolean {
  const user = getCurrentUser();
  return user !== null && user.role === 'admin';
}
