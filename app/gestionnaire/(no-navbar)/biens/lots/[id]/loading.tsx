import { Skeleton } from "@/components/ui/skeleton"

export default function LotDetailsLoading() {
  return (
    <>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 -mx-5 sm:-mx-6 lg:-mx-10 -mt-6 mb-4">
        <div className="content-max-width px-5 sm:px-6 lg:px-10 py-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-24" />
            <div className="flex items-center space-x-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        </div>
      </header>

      {/* Lot Info */}
      <div className="content-max-width py-4">
        <div className="flex items-center space-x-4 mb-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-6 w-16" />
        </div>
        <div className="flex items-center space-x-4">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>

      {/* Tabs */}
      <div className="content-max-width">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-24" />
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="content-max-width py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-lg p-6 bg-white">
              <Skeleton className="h-6 w-40 mb-4" />
              <div className="space-y-3">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="flex justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
