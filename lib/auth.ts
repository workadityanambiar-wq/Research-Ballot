import { USERS, TEMP_PASSWORD } from './data';
import type { User } from './types';

const SESSION_KEY = 'apex_session';
const PWD_KEY = (id: string) => `apex_pwd_${id}`;
const PWD_CHANGED_KEY = (id: string) => `apex_pwd_changed_${id}`;

export const getUserByEmail = (email: string): User | undefined =>
  USERS.find(u => u.email.toLowerCase() === email.toLowerCase());

export const getUserById = (id: string): User | undefined =>
  USERS.find(u => u.id === id);

export const getStoredPassword = (userId: string): string =>
  localStorage.getItem(PWD_KEY(userId)) ?? TEMP_PASSWORD;

export const setPassword = (userId: string, password: string): void => {
  localStorage.setItem(PWD_KEY(userId), password);
  localStorage.setItem(PWD_CHANGED_KEY(userId), 'true');
};

export const hasChangedPassword = (userId: string): boolean =>
  localStorage.getItem(PWD_CHANGED_KEY(userId)) === 'true';

export const verifyPassword = (userId: string, password: string): boolean =>
  getStoredPassword(userId) === password;

export const saveSession = (user: User): void =>
  localStorage.setItem(SESSION_KEY, user.id);

export const getSession = (): User | null => {
  if (typeof window === 'undefined') return null;
  const id = localStorage.getItem(SESSION_KEY);
  return id ? getUserById(id) ?? null : null;
};

export const clearSession = (): void =>
  localStorage.removeItem(SESSION_KEY);
