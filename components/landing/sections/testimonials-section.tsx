'use client'

/**
 * Testimonials Section - SEIDO Landing Page
 *
 * Section temoignages clients avec carousel
 * Social proof puissant pour conversion
 *
 * Features:
 * - Carousel auto-rotate (5s)
 * - Pause on hover
 * - Navigation arrows + dots
 * - Responsive (1 col mobile, 2+ desktop)
 * - Dark theme glassmorphism cards
 */

import { Card, CardContent } from '@/components/ui/card'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import { Star } from 'lucide-react'
import { testimonials } from '@/data/testimonials'
import Autoplay from 'embla-carousel-autoplay'
import { useRef } from 'react'

interface TestimonialCardProps {
  quote: string
  author: string
  role: string
  company: string
  rating: number
}

function TestimonialCard({ quote, author, role, company, rating }: TestimonialCardProps) {
  return (
    <Card className="h-full bg-white/5 backdrop-blur-sm border border-white/10 hover:border-blue-500/30 transition-colors duration-300">
      <CardContent className="p-8 flex flex-col h-full">
        {/* Rating Stars */}
        <div className="flex gap-1 mb-4">
          {Array.from({ length: rating }).map((_, i) => (
            <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
          ))}
        </div>

        {/* Quote */}
        <blockquote className="text-white/80 mb-6 flex-1 leading-relaxed">
          &ldquo;{quote}&rdquo;
        </blockquote>

        {/* Author Info */}
        <div className="border-t border-white/10 pt-4">
          <div className="font-semibold text-white">{author}</div>
          <div className="text-sm text-white/60">{role}</div>
          <div className="text-xs text-blue-400 font-medium mt-1">{company}</div>
        </div>
      </CardContent>
    </Card>
  )
}

export function TestimonialsSection() {
  const plugin = useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true })
  )

  return (
    <section className="py-16 md:py-24" aria-labelledby="heading-testimonials">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 id="heading-testimonials" className="landing-h2 text-white mb-4">
            Ils utilisent déjà SEIDO
          </h2>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            Découvrez pourquoi des centaines de professionnels nous font confiance
          </p>
        </div>

        {/* Carousel */}
        <div className="max-w-5xl mx-auto">
          <Carousel
            plugins={[plugin.current]}
            className="w-full"
            onMouseEnter={plugin.current.stop}
            onMouseLeave={plugin.current.reset}
            opts={{
              align: "start",
              loop: true,
            }}
          >
            <CarouselContent className="-ml-4">
              {testimonials.map((testimonial) => (
                <CarouselItem key={testimonial.id} className="pl-4 md:basis-1/2 lg:basis-1/2">
                  <TestimonialCard
                    quote={testimonial.quote}
                    author={testimonial.author}
                    role={testimonial.role}
                    company={testimonial.company}
                    rating={testimonial.rating}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>

            {/* Navigation */}
            <div className="flex justify-center gap-4 mt-8">
              <CarouselPrevious className="relative left-0 translate-y-0 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white" />
              <CarouselNext className="relative right-0 translate-y-0 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white" />
            </div>
          </Carousel>
        </div>

        {/* Trust Badge */}
        <div className="text-center mt-12">
          <p className="text-sm text-white/50">
            Rejoignez les <span className="font-semibold text-blue-400">professionnels de l&apos;immobilier</span> qui ont fermé leurs boucles
          </p>
        </div>
      </div>
    </section>
  )
}
