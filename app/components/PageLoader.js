"use client";

export default function PageLoader({ background, label = "Loading" }) {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-black text-white font-satoshi"
      style={
        background
          ? {
              backgroundImage: `url(${background.src})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        <span className="sr-only">{label}</span>
      </div>
    </div>
  );
}
