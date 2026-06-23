import prisma from "@/lib/prisma"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getSession } from "@/app/actions/auth-actions"
import { ArrowRight } from "lucide-react"
import { InteractivePhoneMockup } from "@/components/InteractivePhoneMockup"

import { HowItWorks } from "@/components/home/how-it-works"
import { FeaturedCarousel } from "@/components/home/featured-carousel"
import { BentoFeatures } from "@/components/home/bento-features"
import { Testimonials } from "@/components/home/testimonials"
import { PartnerCTA } from "@/components/home/partner-cta"
import { cacheLife, cacheTag } from "next/cache"

async function getFeaturedLibraries() {
  'use cache';
  cacheLife('hours');
  cacheTag('libraries:featured');
  const libs = await prisma.library.findMany({
    where: {
      kycStatus: "APPROVED",
    },
    include: {
      plans: { where: { isActive: true } },
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // Sort Kripa Library to the top, limit to 3
  return libs.sort((a, b) => {
    if (a.name === 'Kripa Library') return -1;
    if (b.name === 'Kripa Library') return 1;
    return 0;
  }).slice(0, 3);
}
export default async function HomePage() {
  // Fetch top 3 libraries to showcase in the interactive mockup and carousel
  const libraries = await getFeaturedLibraries();

  return (
    <div className="flex flex-col bg-background overflow-hidden relative w-full">
      
      {/* 1. Hero Section */}
      <section className="flex flex-col min-h-[calc(100vh-80px)] bg-[#eff3f9] relative">
        <div className="container max-w-[1300px] mx-auto px-6 md:px-10 py-12 md:py-24 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16 flex-1">
          
          {/* Left Content */}
          <div className="flex-1 flex flex-col justify-center items-start z-10">
            <h1 className="text-5xl md:text-6xl lg:text-[76px] font-extrabold tracking-tight font-heading leading-[1.05] text-[#0f172a]">
              Book Premium <br />
              <span className="text-[#3b82f6]">Study Libraries</span>
            </h1>
            
            <p className="mt-8 text-lg md:text-xl text-slate-600 max-w-xl leading-relaxed">
              Reserve quiet library spaces, choose your setup, and focus without interruptions.
            </p>
            
            <div className="mt-12">
              <Link 
                href="/libraries" 
                className="inline-flex items-center gap-2 bg-[#2563eb] text-white rounded-full px-8 py-4 font-bold text-lg hover:bg-[#1d4ed8] transition-all hover:scale-105 shadow-[0_10px_30px_-10px_rgba(37,99,235,0.5)]"
              >
                Explore Libraries
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Right Content - Interactive Phone Mockup */}
          <div className="flex-1 w-full flex justify-center lg:justify-center items-center relative z-10 pt-10 lg:pt-0">
            {/* Subtle background glow behind the phone */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[500px] bg-blue-400/20 blur-[100px] rounded-full pointer-events-none" />
            
            <InteractivePhoneMockup libraries={libraries} />
          </div>
        </div>
      </section>

      {/* 2. How It Works */}
      <HowItWorks />

      {/* 3. Featured Libraries Carousel */}
      <FeaturedCarousel libraries={libraries} />

      {/* 4. Bento Box Features */}
      <BentoFeatures />

      {/* 5. Student Testimonials */}
      <Testimonials />

      {/* 6. Partner CTA */}
      <PartnerCTA />

    </div>
  )
}
