// Authentication is now fully server-side via Auth.js v5 + PostgreSQL.
// LocalStorage auth has been removed.
// See: lib/auth-config.ts, app/api/auth/**, proxy.ts

export { auth, signIn, signOut } from '@/lib/auth-config';
