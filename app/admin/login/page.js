"use client";
import React, { useState } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import logo from "../../assets/logo2.png";
import background from "../../assets/background.svg";

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false); // State to toggle password visibility
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await signIn('credentials', {
      username,
      password,
      redirect: false,
    });

    if (result.error) {
      setError('Invalid credentials');
    } else {
      router.push('/admin');
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center font-satoshi"
      style={{
        backgroundImage: `url(${background.src})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <Image src={logo} alt="logo" width={150} className="mb-8 -mt-24" />
      <div className="bg-gray-950 p-6 rounded-lg shadow-lg w-96">
        <h1 className="text-2xl font-bold text-center text-white mb-4">Admin Login</h1>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700"
            />
            
          </div>
          <div className="relative mb-4">
            <input
            type={showPassword ? "text" : "password"} // Toggle between text and password
            placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full relative p-2 rounded bg-gray-800 text-white border border-gray-700"
            />
            <button
            type="button"
            onClick={() => setShowPassword(!showPassword)} // Toggle password visibility
            className="absolute right-2 top-2 text-gray-500"
          >
            <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} /> {/* Use Font Awesome icons */}
          </button>
          </div>
          <button
            type="submit"
            className="w-full py-2 px-4 bg-gradient-to-br from-pink-600 to-yellow-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
} 