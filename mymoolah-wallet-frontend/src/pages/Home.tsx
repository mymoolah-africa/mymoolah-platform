import { Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

function Home() {
  const navigate = useNavigate();

  // Check if user is logged in
  const isLoggedIn = !!localStorage.getItem('authToken');
  // Check if user has registered before
  const isRegistered = !!localStorage.getItem('isRegistered');

  // Redirect logged-in users to dashboard
  useEffect(() => {
    if (isLoggedIn) {
      navigate('/dashboard'); // Change to your dashboard route
    }
  }, [isLoggedIn, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 to-green-400 relative px-4">
      <div className="flex flex-col items-center justify-center flex-1 w-full">
        <img src="/MyMoolahLogo1.svg" alt="MyMoolah Logo" className="h-20 w-auto mb-6" />
        <h1 className="text-4xl font-bold text-white mb-4 text-center">Hello – Welcome to MyMoolah!</h1>
        <p className="text-white text-lg mb-8 text-center">Africa's modern, data-efficient digital wallet</p>
      </div>
      <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center">
        <div className="flex gap-6 justify-center">
          <Link to="/login">
            <button className="px-8 py-3 bg-white text-[#2D8CCA] font-semibold rounded shadow hover:bg-[#86BE41] hover:text-white transition">
              Login
            </button>
          </Link>
          {/* Only show Register if not registered */}
          {!isRegistered && (
            <Link to="/register">
              <button className="px-8 py-3 bg-[#2D8CCA] text-white font-semibold rounded shadow hover:bg-[#86BE41] transition">
                Register
              </button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;