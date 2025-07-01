import React from 'react';

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-3xl font-bold text-red-600 mb-2">404 - Page Not Found</h1>
      <p className="text-gray-600">Sorry, the page you are looking for does not exist.</p>
    </div>
  );
}

export default NotFound;