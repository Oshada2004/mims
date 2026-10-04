import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export default function Dashboard() {
  const { user, logout } = useContext(AuthContext);

  return (
    <div style={{ padding: '20px' }}>
      <h1>Dashboard</h1>
      <p>Welcome, {user?.first_name || user?.username}!</p>
      <p>Role: {user?.user_role}</p>
      {user?.staff_role && <p>Staff Role: {user?.staff_role}</p>}
      <button onClick={logout}>Logout</button>
    </div>
  );
}