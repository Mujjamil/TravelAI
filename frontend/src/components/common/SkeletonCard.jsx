/**
 * SkeletonCard — animated loading placeholders
 * type: 'flight' | 'hotel' | 'trip' | 'message'
 */

function FlightSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gray-200" />
          <div>
            <div className="h-3 w-24 bg-gray-200 rounded mb-1" />
            <div className="h-2 w-16 bg-gray-100 rounded" />
          </div>
        </div>
        <div className="h-6 w-16 bg-gray-200 rounded" />
      </div>
      <div className="flex items-center gap-3 mb-3">
        <div className="h-5 w-10 bg-gray-200 rounded" />
        <div className="flex-1 h-2 bg-gray-100 rounded" />
        <div className="h-5 w-10 bg-gray-200 rounded" />
      </div>
      <div className="h-8 bg-gray-100 rounded-lg" />
    </div>
  )
}

function HotelSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
      <div className="flex justify-between mb-2">
        <div className="flex-1 mr-2">
          <div className="h-3 w-36 bg-gray-200 rounded mb-2" />
          <div className="h-2 w-24 bg-gray-100 rounded" />
        </div>
        <div className="h-6 w-12 bg-gray-200 rounded" />
      </div>
      <div className="flex gap-2 mb-3">
        <div className="h-3 w-20 bg-gray-100 rounded" />
        <div className="h-3 w-10 bg-green-100 rounded" />
      </div>
      <div className="h-8 bg-gray-100 rounded-lg" />
    </div>
  )
}

function TripSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
      <div className="flex justify-between mb-3">
        <div>
          <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
          <div className="h-3 w-20 bg-gray-100 rounded" />
        </div>
        <div className="h-5 w-16 bg-gray-100 rounded-full" />
      </div>
      <div className="h-2 w-full bg-gray-100 rounded mb-1" />
      <div className="h-2 w-3/4 bg-gray-100 rounded" />
    </div>
  )
}

function MessageSkeleton() {
  return (
    <div className="flex items-end gap-2 mb-4 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
      <div className="max-w-xs">
        <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
          <div className="h-2 w-48 bg-gray-200 rounded mb-2" />
          <div className="h-2 w-36 bg-gray-200 rounded mb-2" />
          <div className="h-2 w-24 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  )
}

const SKELETONS = {
  flight:  FlightSkeleton,
  hotel:   HotelSkeleton,
  trip:    TripSkeleton,
  message: MessageSkeleton,
}

export default function SkeletonCard({ type = 'flight', count = 3 }) {
  const Comp = SKELETONS[type] || FlightSkeleton
  return (
    <>
      {Array.from({ length: count }, (_, i) => <Comp key={i} />)}
    </>
  )
}
