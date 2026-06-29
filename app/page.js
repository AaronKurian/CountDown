"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import io from "socket.io-client";
import bg from "./assets/thh1.svg";

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
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [announcements, setAnnouncements] = useState([]);

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
    if (!isRunning || isPaused || !targetTime) return undefined;

    const interval = setInterval(() => {
      setTime(calculateRemainingTime(targetTime));
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, isPaused, targetTime]);

  useEffect(() => {
    if (!isRunning || isPaused || time <= 0) return undefined;

    const quoteInterval = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % motivationalQuotes.length);
    }, 3000);

    return () => clearInterval(quoteInterval);
  }, [isRunning, isPaused, time]);

  return (
    <main className="relative flex min-h-screen w-screen flex-col items-center overflow-hidden bg-black p-8 text-white sm:p-16 lg:p-36 font-satoshi">
      <Image src={bg} fill className="object-cover" alt="Countdown background" priority />

      <section className="z-10 flex min-h-screen flex-col items-center justify-center">
        {isRunning && !isPaused && time > 0 ? (
          announcements.length > 0 ? (
            <div className="mb-2 min-h-16 text-center font-bold transition-opacity duration-500 ease-in-out">
              {announcements.map((item) => (
                <div
                  key={item.id}
                  className="mb-4 rounded-md px-4 py-2 text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-[#ce29ba] via-[#ea7af0] to-[#ce29ba] sm:text-5xl"
                >
                  <p className="font-bold">{item.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mb-2 min-h-16 text-center text-base font-extrabold text-pink-600 transition-opacity duration-500 ease-in-out sm:text-2xl">
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
      </section>

      {connectionStatus === "failed" && (
        <div className="fixed right-4 top-4 z-20 rounded-md bg-red-500 px-4 py-2 text-white">
          Failed to connect. Please check your internet connection.
        </div>
      )}
    </main>
  );
}
