"use client";
import { useState, useEffect } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import io from "socket.io-client";
import logo from "../assets/logo.png";
import background from "../assets/background.svg";
import ConfirmDialog from "../components/ConfirmDialog";

const motivationalQuotes = [
  "Hackathons aren't about coding, they're about creating the future.",
  "Every great innovation starts with a crazy idea and a sleepless night.",
  "Think. Code. Innovate. Repeat.",
  "The only way to do great work is to love what you do. – Steve Jobs",  
  "It's not about how many times you fail, it's about how many times you iterate.",
  "Dream big, build fast, break things, and fix them even faster.",
  "Alone we can do so little, together we can do so much. – Helen Keller",  
  "A hackathon isn't about being the best coder, it's about solving real problems.",
  "Great things happen when passionate minds come together.",
  "Code like there's no tomorrow. Because the deadline is real!",
  "Sleep is optional. Innovation is not.",
  "Success is built in the hours when others are resting.",
];

const END_DATE = new Date('2026-04-23T15:00:00+05:30');

const calculateRemainingTime = () => {
  const now = new Date();
  const diffInSeconds = Math.floor((END_DATE - now) / 1000);
  return Math.max(0, diffInSeconds);
};

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [socket, setSocket] = useState(null);
  const [time, setTime] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentQuote, setCurrentQuote] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/admin/login");
    }
  }, [status, router]);

  const socketURL =
    process.env.NODE_ENV === "development"
      ? process.env.NEXT_PUBLIC_SOCKET_URL_LOCAL
      : process.env.NEXT_PUBLIC_SOCKET_URL_PROD;

  useEffect(() => {
    // Always set the correct remaining time first
    setTime(calculateRemainingTime());

    const newSocket = io(socketURL, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on("connect", () => {
      console.log("Socket connected:", newSocket.id);
      setSocket(newSocket);
      // Reset time to correct value on connection
      setTime(calculateRemainingTime());
    });

    newSocket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    newSocket.on("time-sync", (timerState) => {
      // Always use calculated time for consistency
      setTime(calculateRemainingTime());
      setIsRunning(timerState.isRunning);
      setIsPaused(timerState.isPaused);
    });

    return () => {
      if (newSocket) newSocket.close();
    };
  }, []);

  // Change quote every 3 seconds only if the timer is running
  useEffect(() => {
    let quoteInterval;

    if (isRunning && !isPaused && time > 0) {
      quoteInterval = setInterval(() => {
        setCurrentQuote((prevQuote) => (prevQuote + 1) % motivationalQuotes.length);
      }, 3000); // Change quote every 3000 milliseconds (3 seconds)
    }

    return () => clearInterval(quoteInterval); // Cleanup interval on component unmount or when isRunning changes
  }, [isRunning, isPaused]); // Depend on isRunning and isPaused

  // Timer update effect
  useEffect(() => {
    let interval;
    if (isRunning && !isPaused) {
      // Update time every second when running
      interval = setInterval(() => {
        setTime(calculateRemainingTime());
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, isPaused]);

  useEffect(() => {
    // Fetch the current announcements on component mount
    const fetchAnnouncements = async () => {
      try {
        const response = await fetch('/api/announcement');
        if (response.ok) {
          const data = await response.json();
          setAnnouncements(data.announcements || []);
        }
      } catch (error) {
        console.error("Error fetching announcements:", error);
      }
    };
    
    fetchAnnouncements();
    
    // Fetch periodically to keep in sync
    const interval = setInterval(fetchAnnouncements, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (timeInSeconds) => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = timeInSeconds % 60;

    const format = (value) => (value < 10 ? `0${value}` : value);
    return `${format(hours)}:${format(minutes)}:${format(seconds)}`;
  };

  const handleStart = () => {
    console.log("Start button clicked, socket:", socket?.connected);
    if (socket && socket.connected) {
      socket.emit("timer-control", {
        type: "START",
        time: calculateRemainingTime(),
      });
      setIsRunning(true);
      console.log("Start command sent");
    } else {
      console.error("Socket not connected");
    }
  };

  const handlePauseResume = () => {
    if (socket && socket.connected) {
      if (isPaused) {
        socket.emit("timer-control", {
          type: "RESUME",
          time: calculateRemainingTime(),
        });
      } else {
        socket.emit("timer-control", {
          type: "PAUSE",
          time: time,
        });
      }
      setIsPaused(!isPaused);
    }
  };

  const handleStop = () => {
    setIsDialogOpen(true); // Open the dialog when stop is pressed
  };

  const confirmStopTimer = async () => {
    const result = await signIn('credentials', {
      username: 'admin',
      password: password,
      redirect: false,
    });

    if (result.error) {
      alert("Incorrect password. Timer not stopped.");
    } else {
      if (socket && socket.connected) {
        socket.emit("timer-control", { 
          type: "STOP",
          time: calculateRemainingTime()
        });
        setIsRunning(false);
      }
      setIsDialogOpen(false);
      setPassword("");
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false); // Close the dialog
    setPassword(""); // Clear the password input
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/admin/login");
  };

  const submitAnnouncement = async () => {
    if (!announcement.trim()) return;
    
    try {
      console.log("Adding announcement:", announcement);
      const response = await fetch('/api/announcement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'add',
          text: announcement 
        }),
      });
      
      if (response.ok) {
        console.log("Announcement added successfully");
        setAnnouncement(""); // Clear the input field
        
        // Update the announcements list
        const result = await response.json();
        setAnnouncements(result.announcements || []);
      } else {
        console.error("Failed to add announcement");
      }
    } catch (error) {
      console.error("Error adding announcement:", error);
    }
  };

  const removeAnnouncement = async (id) => {
    try {
      const response = await fetch('/api/announcement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'remove',
          id: id 
        }),
      });
      
      if (response.ok) {
        console.log("Announcement removed successfully");
        
        // Update the announcements list
        const result = await response.json();
        setAnnouncements(result.announcements || []);
      } else {
        console.error("Failed to remove announcement");
      }
    } catch (error) {
      console.error("Error removing announcement:", error);
    }
  };

  const clearAllAnnouncements = async () => {
    try {
      const response = await fetch('/api/announcement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'clear' }),
      });
      
      if (response.ok) {
        console.log("All announcements cleared");
        setAnnouncements([]);
      } else {
        console.error("Failed to clear announcements");
      }
    } catch (error) {
      console.error("Error clearing announcements:", error);
    }
  };

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (!session) {
    return null;
  }

  return (
    <div 
      className="min-h-screen text-white p-8 font-satoshi" 
      style={{ 
        backgroundImage: `url(${background.src})`,
        backgroundSize: 'cover', 
        backgroundPosition: 'center' 
      }}
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Admin Control Panel</h1>
          <div className="flex items-center gap-4">
            <span
              className={`h-3 w-3 rounded-full ${
                socket?.connected ? "bg-green-500" : "bg-red-500"
              }`}
            ></span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="bg-transparent border-1 border-white p-6 rounded-lg shadow-lg">
          {/* Add logo here */}
          <Image src={logo} alt="Logo" width={200} height={200} className="mx-auto mb-4" />
          
          {/* Add the motivational quotes here */}
          <div className="text-center mb-4">
            <p className="text-sm sm:text-lg text-gray-400">{motivationalQuotes[currentQuote]}</p>
          </div>

          {/* Timer Display */}
          <div className="text-center mb-8">
            <span className="text-6xl sm:text-7xl font-bold timer text-white block mb-4">
              {formatTime(time)}
            </span>
            <div className="text-slate-400">
              Status: {!isRunning ? "Stopped" : isPaused ? "Paused" : "Running"}
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex gap-4 justify-center">
            {!isRunning ? (
              <button
                onClick={handleStart}
                disabled={!socket?.connected}
                className={` px-6 py-2 text-transparent bg-clip-text bg-gradient-to-r from-[#E283BD] to-[#E2CF6C] bg-[#1E1E1E] rounded-[30px] border-[1px] border-[#E283BD] hover:border-[#E2CF6C] hover:shadow-lg transition-all hover:scale-105
                  ${!socket?.connected ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                Start Timer
              </button>
            ) : (
              <>
                <button
                  onClick={handlePauseResume}
                  disabled={!socket?.connected}
                  className={`px-6 py-2 text-transparent bg-clip-text bg-gradient-to-r from-[#E283BD] to-[#E2CF6C] bg-[#1E1E1E] rounded-[30px] border-[1px] border-[#E283BD] hover:border-yellow-600 hover:shadow-lg transition-all hover:scale-105
                    ${
                      !socket?.connected ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                >
                  {isPaused ? "Resume" : "Pause"}
                </button>
                <button
                  onClick={handleStop} // Open dialog on stop button click
                  disabled={!socket?.connected}
                  className={`px-6 py-2 text-transparent bg-clip-text bg-gradient-to-r from-[#E283BD] to-[#E2CF6C] bg-[#1E1E1E] rounded-[30px] border-[1px] border-[#E283BD] hover:border-pink-600 hover:shadow-lg transition-all hover:scale-105
                    ${
                      !socket?.connected ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                >
                  Stop
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mt-12 border-t pt-6 border-gray-700">
          <h2 className="text-2xl mb-4">Announcements</h2>
          
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <input
              type="text"
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              placeholder="Enter announcement text"
              className="flex-grow p-2 rounded bg-gray-800 text-white border border-gray-700"
            />
            <button
              onClick={submitAnnouncement}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Add
            </button>
          </div>
          
          {announcements.length > 0 && (
            <div className="mt-4">
              <div className="flex justify-between mb-2">
                <h3 className="text-xl">Current Announcements</h3>
                <button
                  onClick={clearAllAnnouncements}
                  className="bg-red-600 text-white px-3 py-1 min-w-24 text-sm rounded hover:bg-red-700"
                >
                  Clear All
                </button>
              </div>
              
              <div className="space-y-2">
                {announcements.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-3 bg-gray-800 rounded">
                    <p className="text-white">{item.text}</p>
                    <button
                      onClick={() => removeAnnouncement(item.id)}
                      className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 ml-2"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        onConfirm={confirmStopTimer}
        password={password}
        setPassword={setPassword}
      />
    </div>
  );
}