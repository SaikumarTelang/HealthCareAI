import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Heart, Stethoscope, Home } from 'lucide-react';

function Header() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2">
            <Heart className="h-8 w-8 text-primary-600" fill="currentColor" />
            <span className="text-xl font-bold text-gray-900 tracking-tight">HealthCare AI</span>
          </Link>

          <div className="flex items-center space-x-6">
            <nav className="flex items-center space-x-2">
              <Link
                to="/"
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                  isActive('/') ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">Home</span>
              </Link>
              <Link
                to="/patient"
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                  isActive('/patient') ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Heart className="h-4 w-4" />
                <span className="hidden sm:inline">Patient Portal</span>
              </Link>
              <Link
                to="/doctor"
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                  isActive('/doctor') ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Stethoscope className="h-4 w-4" />
                <span className="hidden sm:inline">Clinician Dashboard</span>
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
