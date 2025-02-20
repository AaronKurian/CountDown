"use client";
import { useState, useEffect } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import io from 'socket.io-client';

const motivationalQuotes = [
  // ... your existing quotes array ...
];

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [socket, setSocket] = useState(null);
  const [time, setTime] = useState(24 * 60 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentQuote, setCurrentQuote] = useState(0);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push('/admin/login');
    }
  }, [status, router]);

  useEffect(() => {
    const newSocket = io('http://localhost:3000', {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setSocket(newSocket);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    newSocket.on('time-sync', (timerState) => {
      console.log('Received timer state:', timerState);
      setTime(timerState.time);
      setIsRunning(timerState.isRunning);
      setIsPaused(timerState.isPaused);
    });

    return () => {
      if (newSocket) newSocket.close();
    };
  }, []);

  const formatTime = (timeInSeconds) => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = timeInSeconds % 60;

    const format = (value) => (value < 10 ? `0${value}` : value);
    return `${format(hours)}:${format(minutes)}:${format(seconds)}`;
  };

  const handleStart = () => {
    console.log('Start button clicked, socket:', socket?.connected);
    if (socket && socket.connected) {
      socket.emit('timer-control', { 
        type: 'START',
        time: 24 * 60 * 60 
      });
      console.log('Start command sent');
    } else {
      console.error('Socket not connected');
    }
  };

  const handlePauseResume = () => {
    if (socket && socket.connected) {
      socket.emit('timer-control', { 
        type: isPaused ? 'RESUME' : 'PAUSE',
        time: time 
      });
    }
  };

  const handleStop = () => {
    if (socket && socket.connected) {
      socket.emit('timer-control', { type: 'STOP' });
    }
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/admin/login');
  };

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Admin Control Panel</h1>
          <div className="flex items-center gap-4">
            <span className={`h-3 w-3 rounded-full ${socket?.connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="bg-gray-900 p-6 rounded-lg shadow-lg">
          {/* Timer Display */}
          <div className="text-center mb-8">
            <span className="text-7xl font-bold timer text-white block mb-4">
              {formatTime(time)}
            </span>
            <div className="text-gray-400">
              Status: {!isRunning ? "Stopped" : isPaused ? "Paused" : "Running"}
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex gap-4 justify-center">
            {!isRunning ? (
              <button
                onClick={handleStart}
                disabled={!socket?.connected}
                className={`px-6 py-2 text-white bg-gradient-to-r from-[#E283BD] to-[#E2CF6C] rounded-[30px] hover:opacity-90 transition-all hover:scale-105 
                  ${!socket?.connected ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Start Timer
              </button>
            ) : (
              <>
                <button
                  onClick={handlePauseResume}
                  disabled={!socket?.connected}
                  className={`px-6 py-2 text-white bg-gradient-to-r from-[#E283BD] to-[#E2CF6C] rounded-[30px] hover:opacity-90 transition-all hover:scale-105
                    ${!socket?.connected ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isPaused ? "Resume" : "Pause"}
                </button>
                <button
                  onClick={handleStop}
                  disabled={!socket?.connected}
                  className={`px-6 py-2 text-white bg-gradient-to-r from-[#E283BD] to-[#E2CF6C] rounded-[30px] hover:opacity-90 transition-all hover:scale-105
                    ${!socket?.connected ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Stop
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 