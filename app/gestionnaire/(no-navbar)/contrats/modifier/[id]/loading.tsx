import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton */}
      <header className="bg-card border-b border-border">
        <div className="content-max-width px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-48" />
          </div>
          {/* Step progress skeleton */}
          <div className="flex items-center gap-4 mt-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-16 hidden sm:block" />
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Main content skeleton */}
      <main className="content-max-width px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="p-6">
            {/* Title skeleton */}
            <Skeleton className="h-6 w-64 mb-2" />
            <Skeleton className="h-4 w-96 mb-6" />

            {/* Form fields skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>

            {/* Navigation buttons skeleton */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-10 w-28" />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
