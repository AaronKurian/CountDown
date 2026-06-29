"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import io from "socket.io-client";
import VideoPlayer from "./VideoPlayer";
import timelineSvg from "./assets/timeline.svg";
import landingpage3Svg from "./assets/landing_page_3.svg";
import background from "./assets/background.svg";
import logo from "./assets/logo.png";

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

export default function Home() {
  const [time, setTime] = useState(0);
  const [targetTime, setTargetTime] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentQuote, setCurrentQuote] = useState(0);
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [announcements, setAnnouncements] = useState([]);
  const [imageSize, setImageSize] = useState(250);

  useEffect(() => {
    const socket = io({
      transports: ["websocket", "polling"],
      reconnectionAttempts: 8,
      reconnectionDelay: 1000,
      withCredentials: true,
    });

    socket.on("connect", () => {
      setConnectionStatus("connected");
    });

    socket.on("connect_error", () => {
      setConnectionStatus("failed");
    });

    socket.on("state-sync", (state) => {
      setTargetTime(state.targetTime || null);
      setTime(state.time || 0);
      setIsRunning(Boolean(state.isRunning));
      setIsPaused(Boolean(state.isPaused));
      setAnnouncements(state.announcements || []);
    });

    return () => {
      socket.close();
    };
  }, []);

  useEffect(() => {
    const updateSize = () => {
      setImageSize(window.innerWidth < 640 ? 150 : 250);
    };

    updateSize();
    window.addEventListener("resize", updateSize);

    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    if (!isRunning || isPaused || !targetTime) return undefined;

    const interval = setInterval(() => {
      setTime(calculateRemainingTime(targetTime));
    }, 1000);

    const firstVideoTimeout = setTimeout(() => {
      setIsVideoOpen(true);
      setTimeout(() => setIsVideoOpen(false), 30000);
    }, 10000);

    const videoInterval = setInterval(() => {
      setIsVideoOpen(true);
      setTimeout(() => setIsVideoOpen(false), 30000);
    }, 7650000);

    return () => {
      clearInterval(interval);
      clearTimeout(firstVideoTimeout);
      clearInterval(videoInterval);
    };
  }, [isRunning, isPaused, targetTime]);

  useEffect(() => {
    if (!isRunning || isPaused || time <= 0) return undefined;

    setCurrentQuote((prev) => (prev + 1) % motivationalQuotes.length);
    const quoteInterval = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % motivationalQuotes.length);
    }, 3000);

    return () => clearInterval(quoteInterval);
  }, [isRunning, isPaused, time]);

  return (
    <main className="relative flex min-h-screen w-screen flex-col items-center overflow-hidden bg-black p-8 text-white font-satoshi sm:p-16 lg:p-36">
      <Image src={background} fill className="object-cover" alt="Countdown background" priority />

      <div className="absolute right-0 top-0 z-10 -mt-60">
        <Image src={timelineSvg} alt="Timeline decoration" width={350} height={350} />
      </div>

      <div className="absolute left-0 top-0 z-10 -mt-16 scale-x-[-1] scale-y-[-1]">
        <Image src={timelineSvg} alt="Timeline decoration flipped" width={300} height={300} />
      </div>

      <div className="absolute bottom-0 right-0 z-10 -mb-20 overflow-hidden md:-mb-44">
        <Image src={landingpage3Svg} alt="Landing page decoration" width={imageSize} height={imageSize} />
      </div>

      <div className="absolute bottom-0 left-0 z-10 -mb-16 scale-x-[-1] scale-y-[-1] overflow-hidden md:-mb-20">
        <Image src={landingpage3Svg} alt="Landing page decoration flipped" width={imageSize} height={imageSize} />
      </div>

      <div className="z-10 flex h-1/4 w-screen items-center justify-center">
        <div className="relative flex w-screen flex-col items-center justify-center gap-0">
          <Image src={logo} alt="Logo" width={200} className="top-2 -mt-12 mb-12 sm:-mt-24" priority />
        </div>
      </div>

      <section className="z-50 flex-col">
        {isRunning && !isPaused && time > 0 ? (
          announcements.length > 0 ? (
            <div className="mb-2 min-h-16 text-center text-base font-bold transition-opacity duration-500 ease-in-out sm:text-2xl">
              {announcements.map((item) => (
                <div
                  key={item.id}
                  className="mb-4 -mt-6 rounded-md bg-[#1E1E1E] bg-gradient-to-r from-pink-600 to-yellow-600 bg-clip-text px-4 py-2 text-3xl font-extrabold text-transparent shadow-none sm:text-5xl"
                >
                  <p className="font-bold">{item.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mb-2 min-h-16 text-center text-base font-bold text-gray-400 transition-opacity duration-500 ease-in-out sm:text-2xl">
              {motivationalQuotes[currentQuote]}
            </div>
          )
        ) : (
          <div className="mb-2 min-h-16" />
        )}

        <div className="flex flex-col items-center justify-center">
          <div className="flex w-[320px] justify-center sm:w-[480px]">
            <span className="mb-10 mt-10 block text-7xl font-bold tabular-nums text-white sm:mt-0 sm:text-9xl">
              {formatTime(time)}
            </span>
          </div>
        </div>

        {targetTime && time === 0 && <p className="mt-8 text-center text-4xl">Hackathon has Ended!</p>}

        <div className="mt-4 text-center text-transparent">
          {!isRunning ? "Timer Stopped" : isPaused ? "Timer Paused" : "Timer Running"}
        </div>
      </section>

      {connectionStatus === "failed" && (
        <div className="fixed right-4 top-4 z-20 rounded-md bg-red-500 px-4 py-2 text-white">
          Failed to Connect. Please check your internet connection and try again later.
        </div>
      )}

      <VideoPlayer isOpen={isVideoOpen} onClose={() => setIsVideoOpen(false)} />
    </main>
  );
}
