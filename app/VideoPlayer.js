"use client";
import React from "react";

const VideoPlayer = ({ isOpen, onClose }) => {
  if (!isOpen) return null; // Don't render if not open

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-95 z-50">
      <video
        autoPlay
        // muted
        className="w-100vw h-100vh"
        onEnded={onClose}
        style={{ pointerEvents: "none" }}
      >
        <source src="/ad.mp4" type="video/mp4" />
        Your browser does not support the video .
      </video>
    </div>
  );
};

export default VideoPlayer;