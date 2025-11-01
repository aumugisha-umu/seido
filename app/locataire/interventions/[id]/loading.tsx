import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function InterventionDetailsLoading() {
  return (
    <div className="max-w-6xl mx-auto">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="flex items-center space-x-2">
              <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
              <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
          <div className="h-8 w-96 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-5 w-64 bg-gray-200 rounded animate-pulse" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Skeleton */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                    <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                    <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                  <div className="h-20 w-full bg-gray-200 rounded animate-pulse" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="h-6 w-56 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-16 w-full bg-gray-200 rounded animate-pulse" />
                  <div className="h-16 w-full bg-gray-200 rounded animate-pulse" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Skeleton */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                  <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                  <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-24 w-full bg-gray-200 rounded animate-pulse" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
                <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
              </CardContent>
            </Card>
          </div>
      </div>
    </div>
  )
}
