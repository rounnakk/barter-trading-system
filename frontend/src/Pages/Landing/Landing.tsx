import React from 'react'
import { Button } from "../../Components/ui/button.tsx"
import { Input } from "../../Components/ui/input.tsx"
import { ScrollArea, ScrollBar } from "../../Components/ui/scroll-area.tsx"
import { MapPin, Menu, Plus, Search, User } from "lucide-react"
import { ProductUploadModal } from '../../Components/ProductUploadModal.tsx'

export default function Home() {
  return (
    <main className="min-h-screen bg-blue-50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-sm">
        <div className="container flex h-14 items-center justify-between px-4">
          <Button variant="ghost" size="icon">
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex flex-1 items-center justify-center gap-2 px-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search" className="pl-8" />
            </div>
            <Button variant="outline" className="gap-2">
              <MapPin className="h-4 w-4" />
              Pune - 411004
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
          <h1 className="text-4xl font-bold">For Barter Trade</h1>
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

