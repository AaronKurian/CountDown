"use client";
import React, { useEffect, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";  
import { useRouter } from "next/navigation";
import Image from "next/image";
import io from 'socket.io-client';
import VideoPlayer from "./VideoPlayer";
import timelineSvg from "./assets/timeline.svg";
import landingpage3Svg from "./assets/landing_page_3.svg";

const img = "/assets/images/2.0.png";
const i = "/assets/images/original_i_kuthu.png";

import background from "./assets/background.svg";
import logo from "./assets/logo.png";

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

const END_DATE = new Date('2025-03-23T15:00:00+05:30');

const calculateRemainingTime = () => {
  const now = new Date();
  const diffInSeconds = Math.floor((END_DATE - now) / 1000);
  return Math.max(0, diffInSeconds);
};

const Home = () => {
  const [socket, setSocket] = useState(null);
  const [time, setTime] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentQuote, setCurrentQuote] = useState(0);
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [announcements, setAnnouncements] = useState([]);

  const socketURL = process.env.NODE_ENV === "development"
    ? process.env.NEXT_PUBLIC_SOCKET_URL_LOCAL
    : process.env.NEXT_PUBLIC_SOCKET_URL_PROD;

  useEffect(() => {
    setTime(calculateRemainingTime());

    const newSocket = io(socketURL, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on("connect", () => {
      console.log("Socket connected:", newSocket.id);
      setSocket(newSocket);
      setConnectionStatus('connected');
      setTime(calculateRemainingTime());
    });

    newSocket.on("connect_error", () => {
      setConnectionStatus('failed');
    });

    newSocket.on("time-sync", (timerState) => {
      setTime(calculateRemainingTime());
      setIsRunning(timerState.isRunning);
      setIsPaused(timerState.isPaused);
    });

    return () => {
      if (newSocket) newSocket.close();
    };
  }, [socketURL]);

  // Timer update effect
  useEffect(() => {
    let interval;
    let videoTimeout;

    if (isRunning && !isPaused) {
      interval = setInterval(() => {
        setTime(calculateRemainingTime());
      }, 1000);

      // Start the video playback sequence
      const startVideoSequence = () => {
        setTimeout(() => {
          setIsVideoOpen(true); // Play the video
          setTimeout(() => {
            setIsVideoOpen(false); // Close the video modal after 30 seconds
          }, 30000); // Video duration
        }, 10000); // Wait for 10 seconds before playing the video initially
      };

      // Call the video sequence every 2 hours and 7 minutes (plus 30 seconds for video duration)
      videoTimeout = setInterval(() => {
        if (isRunning && !isPaused) {
          // For subsequent plays, we don't need the initial 10-second delay
          setIsVideoOpen(true); // Play the video
          setTimeout(() => {
            setIsVideoOpen(false); // Close the video modal after 30 seconds
          }, 30000); // Video duration
        }
      }, 7620000 + 30000); // 2hrs 7min (7620000ms) + 30sec for video duration

      // Start the first video sequence with the initial 10-second delay
      startVideoSequence();
    }

    return () => {
      clearInterval(interval);
      clearInterval(videoTimeout);
    };
  }, [isRunning, isPaused]);

  useEffect(() => {
    let quoteInterval;
    if (isRunning && !isPaused && time > 0) {
      setCurrentQuote((prev) => (prev + 1) % motivationalQuotes.length);
      quoteInterval = setInterval(() => {
        setCurrentQuote((prev) => (prev + 1) % motivationalQuotes.length);
      }, 3000);
    }
    return () => {
      if (quoteInterval) {
        clearInterval(quoteInterval);
      }
    };
  }, [isRunning, isPaused]);

  const formatTime = (timeInSeconds) => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = timeInSeconds % 60;

    const format = (value) => (value < 10 ? `0${value}` : value);
    return `${format(hours)}:${format(minutes)}:${format(seconds)}`;
  };

    const playVideo = () => {
      setIsVideoOpen(true);
    };
    const [imageSize, setImageSize] = useState(250); // Default size for larger screens

    useEffect(() => {
      const updateSize = () => {
        setImageSize(window.innerWidth < 640 ? 150 : 250); // Resize dynamically
      };

      updateSize(); // Set size on mount
      window.addEventListener("resize", updateSize); // Listen for window resize

      return () => window.removeEventListener("resize", updateSize); // Cleanup
    }, []);

  useEffect(() => {
    // Fetch the current announcements
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

  return (
    <main className="relative flex min-h-screen flex-col items-center p-36 bg-black text-white w-screen font-satoshi overflow-hidden">
      <Image src={background} className="bg-img" alt="Countdown background" layout="fill" objectFit="cover" />
      
      {/* Top right corner - timeline.svg */}
      <div className="absolute top-0 -mt-60 right-0 z-10">
        <Image 
          src={timelineSvg} 
          alt="Timeline decoration" 
          width={350} 
          height={350}
        />
      </div>
      
      {/* Top left corner - timeline.svg flipped */}
      <div className="absolute top-0 -mt-16 left-0 z-10" style={{ transform: 'scale(-1, -1)' }}>
        <Image 
          src={timelineSvg} 
          alt="Timeline decoration flipped" 
          width={300} 
          height={300}
        />
      </div>
      
      {/* Bottom right corner */}
      <div className="absolute bottom-0 -mb-20 md:-mb-44 overflow-hidden right-0 z-10">
        <Image 
          src={landingpage3Svg} 
          alt="Landing page decoration" 
          width={imageSize} 
          height={imageSize} 
        />
      </div>

      {/* Bottom left corner */}
      <div className="absolute bottom-0 left-0 -mb-16 md:-mb-20 overflow-hidden z-10" style={{ transform: "scale(-1,-1)" }}>
        <Image 
          src={landingpage3Svg} 
          alt="Landing page decoration flipped" 
          width={imageSize} 
          height={imageSize} 
        />
      </div>

      <div className="z-10 flex items-center justify-center h-1/4 w-screen">
        <div className="flex flex-col items-center justify-center gap-0 w-screen relative">
          <Image 
            src={logo} 
            alt="Logo" 
            width={200}
            className="top-2 -mt-12 sm:-mt-24 mb-12"
          />
          {/* <div className="filter blur-[0.5px] font-productsansbold font-bold text-center -px-8
            text-[2.2rem] mt-20 
            sm:text-[3rem] sm:mt-20 
            md:text-[4rem] md:-mt-20 
            lg:text-[5rem] lg:-mt-14 
            relative">
            T
            <span className="relative inline-block">
              i
              <Image
                src={i}
                alt="Dot Image"
                width={38}
                height={30}
                className="absolute filter -blur-[8px] 
                top-[0.6rem] left-[0.1px] w-[1rem] h-[10px] 
                sm:top-[0.8rem] sm:left-[0.1px] sm:w-[12px] sm:h-[14px] 
                md:w-[24px] md:h-[22px] md:top-[1rem] md:left-[0.0rem] 
                lg:top-[1.5rem] lg:-left-[1.3px] lg:w-[28px] lg:h-[24px] lg:pl-0.5 
                rounded-3xl"
              />
            </span>
            n
            <div className="absolute filter -blur-[8px] -top-4 right-5
              max-lg:right-2 max-lg:-top-6
              max-md:right-4 max-md:-top-1
              max-sm:-top-1 max-sm:right-3">
              <Image
                src={img}
                alt="2.0 Image"
                width={96}
                height={96}
                className="w-24 h-24 brightness-150 max-md:w-12 max-md:h-12 max-sm:w-9 max-sm:h-9"
                priority
              />
            </div>
            k
          </div>

          <div className="relative">
            <h1 className="relative z-10 blur-[0.1px] sm:blur-[0.2px] font-khuja font-medium text-center 
              text-[1.6rem] -mt-3 -pl-1 mb-16    
              sm:text-[2rem] sm:-mt-4 sm:pl-2 
              md:text-[2.7rem] md:-mt-5 md:pl-2 md:opacity-90
              lg:text-[3.3rem] leading-none scale-y-[1.2] lg:-mt-6 lg:pl-4 
              bg-gradient-to-br from-[#f3f302] via-[#e23be6] to-[#0000ff] text-transparent bg-clip-text">
              <span className="relative inline-block">
                <span className="absolute -z-10 text-transparent bg-clip-text bg-gradient-to-br from-[#f3f302] via-[#e23be6] to-[#0000ff] 
                  text-[1.6rem] -top-[1px] -left-0.5
                  sm:text-[2rem] sm:-top-0.4 sm:-left-0.5
                  md:text-[2.7rem] md:-top-0.5 md:-left-0.5
                  lg:text-[3.3rem] lg:-left-1 blur-[0.6px] md:blur-[1px] lg:-top-0.5" 
                  style={{
                    transform: 'translateX(3px) translateY(1px) scale(0.999)',
                  }}>
                  HACK
                </span>
                <span className="relative">HACK</span>
              </span>
            </h1>
          </div> */}
        </div>
      </div>

      <section className="flex-col z-50">
        {isRunning && !isPaused && time > 0 ? (
          <>
            {announcements.length > 0 ? (
              // Show announcements instead of quotes
              <div className="text-md sm:text-2xl font-bold text-center mb-2 transition-opacity duration-500 ease-in-out min-h-[4rem]">
                {announcements.map((item) => (
                  <div 
                    key={item.id} 
                    className="font-extrabold text-3xl sm:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-yellow-600 bg-[#1E1E1E] rounded-[30px] px-4 py-2 rounded-md shadow-none mb-4 -mt-6"
                  >
                    <p className="font-bold">{item.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              // Show motivational quotes when no announcements
              <div className="text-md sm:text-2xl font-bold text-center mb-2 text-gray-400 transition-opacity duration-500 ease-in-out min-h-[4rem]">
                {motivationalQuotes[currentQuote]}
              </div>
            )}
          </>
        ) : (
          <div className="mb-2 min-h-[4rem]"></div>
        )}

        {time !== null && (
          <div className="flex flex-col items-center justify-center">
            <div className="w-[320px] sm:w-[480px] flex justify-center">
              <span className="text-7xl sm:text-9xl font-bold text-white block mb-10 mt-10 sm:mt-0 tabular-nums">
                {formatTime(time)}
              </span>
            </div>
          </div>
        )}

        {time === 0 && (
          <p className="text-4xl text-center mt-8">Hackathon has Ended! 🎉</p>
        )}

        <div className="text-center text-transparent mt-4">
          {!isRunning ? "Timer Stopped" : isPaused ? "Timer Paused" : "Timer Running"}
        </div>
      </section>

      {connectionStatus === 'failed' && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-md">
          Failed to Connect. Please check your internet connection and try again later.
        </div>
      )}

      <VideoPlayer isOpen={isVideoOpen} onClose={() => setIsVideoOpen(false)} />
    </main>
  );
};

export default Home; 