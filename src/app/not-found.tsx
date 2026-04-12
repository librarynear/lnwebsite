import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="flex-1 w-full flex flex-col items-center justify-center bg-[#E5EDF4] px-4 py-8 md:py-12 min-h-[70vh]">
      {/* 404 Text Background */}
      <h1
        className="text-[100px] md:text-[140px] font-black leading-none mb-[-25px] md:mb-[-35px] z-0 tracking-widest relative"
        style={{
          color: "white",
          WebkitTextStroke: "6px #111827",
          textShadow: "10px 10px 0px #111827"
        }}
      >
        404
      </h1>

      {/* Mug Character Image */}
      <div className="relative w-56 h-48 md:w-72 md:h-64 z-10">
        <Image
          src="/404 character.svg"
          alt="404 Error"
          fill
          className="object-contain"
          priority
        />
      </div>

      {/* Error Text Section */}
      <div className="text-center z-20 mt-4 md:mt-6 space-y-3">
        <h2 className="text-3xl md:text-5xl font-extrabold text-[#0F74C5]">
          Something gone wrong!
        </h2>
        <p className="text-[#2F5A8F] text-base md:text-lg font-medium max-w-sm mx-auto">
          The page you were looking for doesn't exist
        </p>

        {/* Go Back Button */}
        <Link
          href="/"
          className="mt-6 inline-block px-8 py-3 bg-[#0F74C5] hover:bg-[#0F74C5]/90 text-white font-semibold rounded-full shadow-lg hover:-translate-y-0.5 transition-transform"
        >
          Go Back!
        </Link>
      </div>
    </div>
  );
}
