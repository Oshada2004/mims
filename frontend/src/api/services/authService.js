import client from '../client';
import { endpoints } from '../endpoints';

/**
 * Body: { username, password }.
 * Returns { session_id | token, user } — treat the token as opaque.
 */
export async function login(username, password) {
  const response = await client.post(endpoints.auth.login, { username, password });
  return response.data;
}

/**
 * Customer self-registration.
 * Body: { first_name, last_name, dob, nic, phone_number, address, postal_code, email, username, password }.
 * TODO: backend endpoint not implemented yet
 */
export async function signup(data) {
  const response = await client.post(endpoints.auth.signup, data);
  return response.data;
}

/** No body. Returns { user } for the current token. */
export async function me() {
  const response = await client.get(endpoints.auth.me);
  return response.data;
}

/** No body. Invalidates the current token on the server. */
export async function logout() {
  const response = await client.post(endpoints.auth.logout);
  return response.data;
}
