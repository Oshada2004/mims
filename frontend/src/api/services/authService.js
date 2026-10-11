import client from '../client';
import { endpoints } from '../endpoints';

export async function login(username, password) {
  const response = await client.post(endpoints.auth.login, { username, password });
  return response.data;
}

/*Customer self-registration.*/
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