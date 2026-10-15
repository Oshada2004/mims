import client from '../client';
import { endpoints } from '../endpoints';


export async function login(username, password) {
  const response = await client.post(endpoints.auth.login, { username, password });
  return response.data;
}


export async function signup(data) {
  const response = await client.post(endpoints.auth.signup, data);
  return response.data;
}

export async function me() {
  const response = await client.get(endpoints.auth.me);
  return response.data;
}

export async function logout() {
  const response = await client.post(endpoints.auth.logout);
  return response.data;
}

// The user is always the logged-in one (from the session); other sessions are signed out.
export async function changePassword({ currentPassword, newPassword }) {
  const response = await client.post(endpoints.auth.changePassword, { currentPassword, newPassword });
  return response.data;
}
