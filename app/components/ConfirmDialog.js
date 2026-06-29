"use client";
import React, { useState } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

const ConfirmDialog = ({ isOpen, onClose, onConfirm, password, setPassword }) => {
  const [showPassword, setShowPassword] = useState(false); 

  if (!isOpen) return null; // Don't render if not open

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-black opacity-90 p-6 rounded-lg shadow-lg  w-80 sm:w-100 border-2 border-slate-300">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-orange-500">Are you sure you want to stop the timer?</h2>
          <button onClick={onClose} className="cursor-pointer text-gray-500 hover:text-gray-300 p-3">
            &times; {/* Close 'x' mark */}
          </button>
        </div>
        <div className="relative mb-8">
          <input
            type={showPassword ? "text" : "password"} // Toggle between text and password
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border p-2 w-full text-gray-200"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)} 
            className="absolute right-2 top-2 cursor-pointer text-gray-500"
          >
            <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
          </button>
        </div>
        <div className="flex justify-center items-center gap-6 ">
          <button
            onClick={onConfirm}
            className="w-full cursor-pointer rounded bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"
          >
            Yes
          </button>
          <button
            onClick={onClose}
            className="w-full cursor-pointer rounded bg-gray-300 px-4 py-2 font-semibold text-black hover:bg-gray-400"
          >
            No
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog; 
