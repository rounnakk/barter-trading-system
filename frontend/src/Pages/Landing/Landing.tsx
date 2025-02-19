import React from 'react'
import { useState, useEffect } from 'react'
import { Button } from "../../Components/ui/button.tsx"
import { Input } from "../../Components/ui/input.tsx"
import { ScrollArea, ScrollBar } from "../../Components/ui/scroll-area.tsx"
import { Camera, MapPin, Menu, Plus, Search, User } from "lucide-react"
import { ProductUploadModal } from '../../Components/ProductUploadModal.tsx'
import { ImageSearchModal } from '../../Components/ImageSearchModal.tsx'
import { Toaster } from 'sonner';


export default function Home() {
  const [location, setLocation] = useState("Location access needed");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const response = await fetch(
              `https://api.opencagedata.com/geocode/v1/json?q=${position.coords.latitude}+${position.coords.longitude}&key=29a8d0f8953c4dd9916f235c1aefe163`
            );
            const data = await response.json();
            const city = data.results[0].components.city || data.results[0].components.town;
            const postcode = data.results[0].components.postcode;
            setLocation(`${city} - ${postcode}`);
          } catch (error) {
            setLocation("Error fetching location");
          } finally {
            setLoading(false);
          }
        },
        (error) => {
          setLocation("Location access denied");
          setLoading(false);
        }
      );
    } else {
      setLocation("Geolocation not supported");
      setLoading(false);
    }
  }, []);

  return (
    <main className="min-h-screen bg-blue-50">
      <Toaster richColors position='top-right'/>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-sm">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className='h-9 w-9 overflow-hidden rounded-3xl'>
            <img className='filter invert' src='/bt.png' />
          </div>
          <Button variant="ghost" size="icon">
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex flex-1 items-center justify-center gap-2 px-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search" className="pl-8" />
            </div>
            <ImageSearchModal />
            <Button variant="outline" className="gap-2">
              <MapPin className="h-4 w-4" />
              {loading ? (
                <span className="animate-pulse">Loading location...</span>
              ) : (
                location
              )}
            </Button>
            <ProductUploadModal />
          </div>

          <Button variant="ghost" size="icon">
            <User className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="container px-4 py-8">
        <div className="space-y-2 text-center">
          <h1 className="text-4xl font-bold">Barter Trade</h1>
          <p className="text-lg text-muted-foreground">List a product first</p>
        </div>

        {/* Products Section */}
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-semibold">Products near you</h2>
          <ScrollArea>
            <div className="flex gap-4 pb-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <ProductCard key={i} selected={i === 2 || i === 5} />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </section>

        {/* Categories Section */}
        <section className="mt-12">
          <h2 className="mb-4 text-lg font-semibold">Categories</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-lg bg-white shadow-sm transition-colors hover:bg-accent" />
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}

function ProductCard({ selected = false }: { selected?: boolean }) {
  return (
    <div className="relative flex-none">
      <div className="group relative aspect-[3/4] w-[160px] overflow-hidden rounded-lg bg-white p-2 shadow-sm transition-colors hover:bg-accent">
        <div className="aspect-square w-full rounded-md bg-muted" />
        <div className="mt-2">
          <div className="font-medium">Air Pods</div>
          <div className="text-sm text-muted-foreground">Apple</div>
          <div className="mt-1 font-semibold">Rs.10,000</div>
        </div>
      </div>
      {selected && (
        <div className="absolute right-2 top-2 h-6 w-6 rounded-full bg-green-500 text-white">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="absolute inset-0 m-auto h-4 w-4"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}
    </div>
  )
}

