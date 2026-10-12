import client from '../client';
import { endpoints } from '../endpoints';

/**
 * POST /auth/login. Body: { username, password }.
 * Returns the raw { session_id | token, user } — AuthContext treats the token as opaque.
 */
export async function login(username, password) {
  const response = await client.post(endpoints.auth.login, { username, password });
  return response.data;
}

/**
 * Customer self-registration.
 * TODO: backend endpoint not implemented yet
 */
export async function signup(data) {
  const response = await client.post(endpoints.auth.signup, data);
  return response.data;
}

/** GET /auth/me. Returns { user } for the current session. */
export async function me() {
  const response = await client.get(endpoints.auth.me);
  return response.data;
}

/** POST /auth/logout. Ends the current session on the server. */
export async function logout() {
  const response = await client.post(endpoints.auth.logout);
  return response.data;
}
