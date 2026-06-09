import prisma from "@/lib/prisma"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getSession } from "@/app/actions/auth-actions"
import { Star, Heart } from "lucide-react"
import { ClientSearch } from "./ClientSearch"

export const dynamic = 'force-dynamic'

export default async function LibrariesPage(props: any) {
  const session = await getSession();
  if (session?.role === 'LIBRARIAN') {
    redirect('/dashboard');
  }

  const searchParams = await props.searchParams;
  const query = searchParams?.query || "";
  const isNearMe = !!searchParams?.lat && !!searchParams?.lng;

  let libraries = await prisma.library.findMany({
    where: query ? {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { locality: { contains: query, mode: 'insensitive' } },
        { metroStation: { contains: query, mode: 'insensitive' } },
        { city: { contains: query, mode: 'insensitive' } }
      ]
    } : undefined,
    include: {
      plans: true,
      seats: true,
    }
  });

  // Sort by distance if Near Me is active
  libraries.sort((a, b) => {
    if (isNearMe) {
      const distA = a.metroDistance || 999;
      const distB = b.metroDistance || 999;
      return distA - distB;
    }
    return 0;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Search Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border/30 pt-6 pb-4 px-4 md:px-12 flex flex-col items-center">
        <ClientSearch />
      </div>

      {/* Main Grid */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 md:px-12 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10">
          {libraries.map((library, index) => {
            const minPrice = library.plans.length > 0 
              ? Math.min(...library.plans.map(p => p.price)) 
              : 0;

            const locality = library.locality || library.address.split(',')[0];

            // Use uploaded photo if available, otherwise fallback
            let imageUrl = library.photos && library.photos.length > 0 ? library.photos[0] : null;
            if (!imageUrl) {
              const demoImages = [
                "https://images.unsplash.com/photo-1568667256549-094345857637?w=800&q=80",
                "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80",
                "https://images.unsplash.com/photo-1510531704581-5b28709e5a16?w=800&q=80",
                "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80",
                "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=800&q=80"
              ];
              imageUrl = demoImages[index % demoImages.length];
            }

            return (
              <Link key={library.id} href={`/library/${library.id}`} className="group block">
                <div className="flex flex-col gap-3">
                  
                  {/* Image Container */}
                  <div className="aspect-square bg-muted rounded-2xl relative overflow-hidden shadow-sm">
                    <img 
                      src={imageUrl} 
                      alt={library.name}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                    />
                    
                    {/* Heart Icon */}
                    <button className="absolute top-3 right-3 text-white/80 hover:text-white hover:scale-110 transition-all drop-shadow-md">
                      <Heart className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2} />
                    </button>
                  </div>
                  
                  {/* Text Content */}
                  <div className="flex flex-col">
                    <div className="flex justify-between items-start">
                      <h2 className="text-sm sm:text-base font-bold text-foreground line-clamp-1 pr-2">{library.name}</h2>
                      <div className="flex items-center gap-1 text-xs sm:text-sm text-foreground shrink-0 mt-0.5">
                        <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-foreground" />
                        <span>4.8</span>
                      </div>
                    </div>
                    
                    <p className="text-muted-foreground text-xs sm:text-sm line-clamp-1 mt-0.5">
                      {locality}
                    </p>
                    
                    {library.metroStation ? (
                      <p className="text-muted-foreground text-xs sm:text-sm line-clamp-1 mt-0.5">
                        {library.metroDistance ? `${library.metroDistance} km` : 'Near'} from {library.metroStation} metro
                      </p>
                    ) : (
                      <p className="text-muted-foreground text-xs sm:text-sm line-clamp-1 mt-0.5">
                        {library.city}
                      </p>
                    )}
                    
                    <div className="mt-1 sm:mt-2 text-xs sm:text-sm text-foreground">
                      <span className="font-bold">₹{minPrice}</span> onwards
                    </div>
                  </div>

                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
