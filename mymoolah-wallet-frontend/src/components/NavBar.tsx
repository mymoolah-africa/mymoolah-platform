import { Link } from 'react-router-dom';

function NavBar() {
  return (
    <nav className="bg-white shadow p-4 flex space-x-4">
      <Link to="/" className="font-bold text-blue-600 hover:underline">Home</Link>
      <Link to="/dashboard" className="text-blue-600 hover:underline">Dashboard</Link>
      <Link to="/profile" className="text-blue-600 hover:underline">Profile</Link>
    </nav>
  );
}

export default NavBar;