import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { cartItems } = useCart();

  return (
    <>
      {/* Top info bar */}
      <div className="bg-green-800 text-white text-xs lg:text-md py-2">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
          <div className="flex flex-wrap justify-center gap-4 md:gap-6 mb-2 md:mb-0">
            <span className="flex items-center">
              <i className="fa-solid fa-envelope mr-2"></i> fruitbunch.tvm@gmail.com
            </span>
            <span className="flex items-center">
              <i className="fa-solid fa-clock mr-2"></i> MON-SAT: 7.30am - 6.00pm
            </span>
            <span className="flex items-center">
              <i className="fa-solid fa-phone mr-2"></i> +918807239379
            </span>
          </div>
          <div className="flex space-x-4">
            <a href="#" className="hover:text-green-200 transition">
              <i className="fa-brands fa-instagram"></i>
            </a>
            <a href="#" className="hover:text-green-200 transition">
              <i className="fa-brands fa-whatsapp"></i>
            </a>
          </div>
        </div>
      </div>

      {/* Main navigation */}
      <nav className="bg-white shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Link to="/" className="flex items-center">
            <img src="/src/assets/images/logo-1.png" alt="Fruit Bunch" className="h-12" />
          </Link>

          {/* Desktop menu */}
          <div className="hidden md:flex items-center space-x-5 lg:space-x-8 text-sm lg:text-md">
            <Link to="/" className="text-gray-700 hover:text-green-600 font-medium transition">Home</Link>
            <Link to="/subscription" className="text-gray-700 hover:text-green-600 font-medium transition">Fruit Bowl Subscription</Link>
            <Link to="/corporate" className="text-gray-700 hover:text-green-600 font-medium transition">Corporate Orders</Link>
            <Link to="/about" className="text-gray-700 hover:text-green-600 font-medium transition">About Us</Link>
            
            <div className="flex items-center space-x-4">
              <Link to="/login" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition">
                Login
              </Link>
              <Link to="/cart" className="relative bg-green-100 hover:bg-green-200 text-green-700 px-4 py-2 rounded-md transition flex items-center">
                <i className="fa-solid fa-cart-shopping mr-2"></i> Cart
                {cartItems.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                    {cartItems.length}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* Mobile menu button */}
          <button 
            className="md:hidden text-gray-700 focus:outline-none"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <i className={`fa-solid ${isMenuOpen ? 'fa-xmark' : 'fa-bars'} text-xl`}></i>
          </button>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white px-4 pb-4">
            <div className="flex flex-col space-y-3">
              <Link to="/" className="text-gray-700 hover:text-green-600 py-2 transition">Home</Link>
              <Link to="/subscription" className="text-gray-700 hover:text-green-600 py-2 transition">Fruit Bowl Subscription</Link>
              <Link to="/corporate" className="text-gray-700 hover:text-green-600 py-2 transition">Corporate Orders</Link>
              <Link to="/about" className="text-gray-700 hover:text-green-600 py-2 transition">About Us</Link>
              
              <div className="flex flex-col space-y-2 pt-2 border-t border-gray-200">
                <Link to="/login" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-center transition">
                  Login
                </Link>
                <Link to="/cart" className="relative bg-green-100 hover:bg-green-200 text-green-700 px-4 py-2 rounded-md text-center transition flex items-center justify-center">
                  <i className="fa-solid fa-cart-shopping mr-2"></i> Cart
                  {cartItems.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                      {cartItems.length}
                    </span>
                  )}
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  );
};

export default Navbar;