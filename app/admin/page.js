"use client";

import { useEffect, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import io from "socket.io-client";
import logo from "../assets/logo.png";
import background from "../assets/background.svg";
import ConfirmDialog from "../components/ConfirmDialog";
import PageLoader from "../components/PageLoader";

const motivationalQuotes = [
  "Hackathons aren't about coding, they're about creating the future.",
  "Every great innovation starts with a crazy idea and a sleepless night.",
  "Think. Code. Innovate. Repeat.",
  "The only way to do great work is to love what you do. - Steve Jobs",
  "It's not about how many times you fail, it's about how many times you iterate.",
  "Dream big, build fast, break things, and fix them even faster.",
  "Alone we can do so little, together we can do so much. - Helen Keller",
  "A hackathon isn't about being the best coder, it's about solving real problems.",
  "Great things happen when passionate minds come together.",
  "Code like there's no tomorrow. Because the deadline is real!",
  "Sleep is optional. Innovation is not.",
  "Success is built in the hours when others are resting.",
];

const calculateRemainingTime = (targetTime) => {
  if (!targetTime) return 0;
  const diffInSeconds = Math.floor((new Date(targetTime).getTime() - Date.now()) / 1000);
  return Math.max(0, diffInSeconds);
};

const formatTime = (timeInSeconds) => {
  const hours = Math.floor(timeInSeconds / 3600);
  const minutes = Math.floor((timeInSeconds % 3600) / 60);
  const seconds = timeInSeconds % 60;
  const format = (value) => (value < 10 ? `0${value}` : value);

  return `${format(hours)}:${format(minutes)}:${format(seconds)}`;
};

const toDatetimeLocal = (value) => {
  if (!value) return "";
  const date = new Date(value);
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
};

const toIsoFromDatetimeLocal = (value) => {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
};

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [socket, setSocket] = useState(null);
  const [time, setTime] = useState(0);
  const [targetTime, setTargetTime] = useState(null);
  const [targetInput, setTargetInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentQuote, setCurrentQuote] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [announcements, setAnnouncements] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/admin/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return undefined;

    const newSocket = io({
      transports: ["websocket", "polling"],
      reconnectionAttempts: 8,
      reconnectionDelay: 1000,
      withCredentials: true,
    });

    newSocket.on("connect", () => {
      setSocket(newSocket);
      setError("");
    });

    newSocket.on("connect_error", () => {
      setError("Socket connection failed");
    });

    newSocket.on("state-sync", (state) => {
      setTargetTime(state.targetTime || null);
      setTargetInput(toDatetimeLocal(state.targetTime));
      setTime(state.time || 0);
      setIsRunning(Boolean(state.isRunning));
      setIsPaused(Boolean(state.isPaused));
      setAnnouncements(state.announcements || []);
    });

    return () => {
      newSocket.close();
      setSocket(null);
    };
  }, [status]);

  useEffect(() => {
    if (!isRunning || isPaused || !targetTime) return undefined;

    const interval = setInterval(() => {
      setTime(calculateRemainingTime(targetTime));
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, isPaused, targetTime]);

  useEffect(() => {
    if (!isRunning || isPaused || time <= 0) return undefined;

    const quoteInterval = setInterval(() => {
      setCurrentQuote((prevQuote) => (prevQuote + 1) % motivationalQuotes.length);
    }, 3000);

    return () => clearInterval(quoteInterval);
  }, [isRunning, isPaused, time]);

  const emitAdminEvent = (event, payload) =>
    new Promise((resolve) => {
      if (!socket?.connected) {
        resolve({ ok: false, error: "Socket is not connected" });
        return;
      }

      socket.timeout(5000).emit(event, payload, (err, response) => {
        if (err) {
          resolve({ ok: false, error: "Request timed out" });
          return;
        }

        resolve(response || { ok: false, error: "Invalid server response" });
      });
    });

  const applyActionResult = (result) => {
    if (!result.ok) {
      setError(result.error || "Action failed");
      return false;
    }

    setError("");
    return true;
  };

  const handleSetTarget = async () => {
    const nextTargetTime = toIsoFromDatetimeLocal(targetInput);
    if (!nextTargetTime) {
      setError("Choose a valid date and time");
      return;
    }

    applyActionResult(await emitAdminEvent("admin:set-target", { targetTime: nextTargetTime }));
  };

  const handleStart = async () => {
    applyActionResult(await emitAdminEvent("admin:timer-control", { type: "START" }));
  };

  const handlePauseResume = async () => {
    applyActionResult(
      await emitAdminEvent("admin:timer-control", {
        type: isPaused ? "RESUME" : "PAUSE",
      })
    );
  };

  const confirmStopTimer = async () => {
    const result = await signIn("credentials", {
      username: "admin",
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Incorrect password. Timer not stopped.");
      return;
    }

    if (applyActionResult(await emitAdminEvent("admin:timer-control", { type: "STOP" }))) {
      setIsDialogOpen(false);
      setPassword("");
    }
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/admin/login");
  };

  const submitAnnouncement = async () => {
    if (!announcement.trim()) return;

    const result = await emitAdminEvent("admin:announcement", {
      action: "add",
      text: announcement,
    });

    if (applyActionResult(result)) {
      setAnnouncement("");
    }
  };

  const removeAnnouncement = async (id) => {
    applyActionResult(await emitAdminEvent("admin:announcement", { action: "remove", id }));
  };

  const clearAllAnnouncements = async () => {
    applyActionResult(await emitAdminEvent("admin:announcement", { action: "clear" }));
  };

  if (status === "loading") {
    return <PageLoader background={background} label="Loading admin panel" />;
  }

  if (!session) {
    return null;
  }

  return (
    <div
      className="min-h-screen p-8 text-white font-satoshi"
      style={{
        backgroundImage: `url(${background.src})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Admin Control Panel</h1>
          <div className="flex items-center gap-4">
            <span className={`h-3 w-3 rounded-full ${socket?.connected ? "bg-green-500" : "bg-red-500"}`} />
            <button
              onClick={handleLogout}
              className="cursor-pointer rounded bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>

        {error && <div className="mb-4 rounded border border-red-500 bg-red-950/70 p-3 text-red-100">{error}</div>}

        <div className="rounded-lg border border-white/40 bg-transparent p-6 shadow-lg">
          <Image src={logo} alt="Logo" width={200} height={200} className="mx-auto mb-4" />

          <div className="mb-4 text-center">
            <p className="text-sm text-gray-400 sm:text-lg">{motivationalQuotes[currentQuote]}</p>
          </div>

          <div className="mb-8 text-center">
            <span className="timer mb-4 block text-6xl font-bold text-white sm:text-7xl">{formatTime(time)}</span>
            <div className="text-slate-400">
              Status: {!isRunning ? "Stopped" : isPaused ? "Paused" : "Running"}
            </div>
          </div>

          <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              type="datetime-local"
              value={targetInput}
              onChange={(event) => setTargetInput(event.target.value)}
              className="rounded border border-gray-700 bg-gray-900 p-2 text-white"
            />
            <button
              onClick={handleSetTarget}
              disabled={!socket?.connected}
              className="cursor-pointer rounded-[30px] border border-[#E283BD] bg-[#1E1E1E] px-5 py-2 font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[#E283BD] to-[#E2CF6C] transition-all hover:scale-105 hover:border-[#E2CF6C] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
            >
              Set Time
            </button>
          </div>

          <div className="flex justify-center gap-4">
            {!isRunning ? (
              <button
                onClick={handleStart}
                disabled={!socket?.connected || !targetTime}
                className="cursor-pointer rounded-[30px] border border-[#E283BD] bg-[#1E1E1E] px-6 py-2 font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[#E283BD] to-[#E2CF6C] transition-all hover:scale-105 hover:border-[#E2CF6C] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
              >
                Start Timer
              </button>
            ) : (
              <>
                <button
                  onClick={handlePauseResume}
                  disabled={!socket?.connected}
                  className="cursor-pointer rounded-[30px] border border-[#E283BD] bg-[#1E1E1E] px-6 py-2 font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[#E283BD] to-[#E2CF6C] transition-all hover:scale-105 hover:border-yellow-600 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPaused ? "Resume" : "Pause"}
                </button>
                <button
                  onClick={() => setIsDialogOpen(true)}
                  disabled={!socket?.connected}
                  className="cursor-pointer rounded-[30px] border border-[#E283BD] bg-[#1E1E1E] px-6 py-2 font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[#E283BD] to-[#E2CF6C] transition-all hover:scale-105 hover:border-pink-600 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Stop
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mt-12 border-t border-gray-700 pt-6">
          <h2 className="mb-4 text-2xl">Announcements</h2>

          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={announcement}
              onChange={(event) => setAnnouncement(event.target.value)}
              placeholder="Enter announcement text"
              maxLength={240}
              className="flex-grow rounded border border-gray-700 bg-gray-800 p-2 text-white"
            />
            <button onClick={submitAnnouncement} className="cursor-pointer rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700">
              Add
            </button>
          </div>

          {announcements.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 flex justify-between">
                <h3 className="text-xl">Current Announcements</h3>
                <button onClick={clearAllAnnouncements} className="min-w-24 cursor-pointer rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700">
                  Clear All
                </button>
              </div>

              <div className="space-y-2">
                {announcements.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded bg-gray-800 p-3">
                    <p className="text-white">{item.text}</p>
                    <button
                      onClick={() => removeAnnouncement(item.id)}
                      className="ml-2 cursor-pointer rounded bg-red-600 px-2 py-1 text-white hover:bg-red-700"
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

      <ConfirmDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setPassword("");
        }}
        onConfirm={confirmStopTimer}
        password={password}
        setPassword={setPassword}
      />
    </div>
  );
}
