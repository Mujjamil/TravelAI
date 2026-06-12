/**
 * ItineraryView — day-by-day itinerary timeline display.
 * Used in: ChatPage ResultsDashboard (itinerary tab).
 *
 * Props:
 *   itinerary — array of { day, title, morning, afternoon, evening, estimatedDailyBudget }
 */

export default function ItineraryView({ itinerary = [] }) {
  if (!itinerary || itinerary.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <div className="text-4xl mb-3">📅</div>
        <div className="text-sm font-medium text-center">No itinerary generated yet.</div>
        <div className="text-xs mt-1 text-center max-w-xs">
          Ask the AI to plan a day-by-day schedule for your trip.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {itinerary.map((day, i) => (
        <div key={i} className="relative pl-6">
          {/* Timeline line */}
          {i < itinerary.length - 1 && (
            <div className="absolute left-2.5 top-8 bottom-0 w-px bg-blue-100" />
          )}
          {/* Day dot */}
          <div className="absolute left-0 top-2 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
            {day.day}
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <div className="font-semibold text-sm text-gray-900 mb-2">
              Day {day.day}{day.title ? `: ${day.title}` : ''}
            </div>

            {day.morning && (
              <div className="mb-1.5">
                <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">Morning</span>
                <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{day.morning}</p>
              </div>
            )}
            {day.afternoon && (
              <div className="mb-1.5">
                <span className="text-xs font-medium text-orange-500 uppercase tracking-wide">Afternoon</span>
                <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{day.afternoon}</p>
              </div>
            )}
            {day.evening && (
              <div className="mb-1.5">
                <span className="text-xs font-medium text-purple-500 uppercase tracking-wide">Evening</span>
                <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{day.evening}</p>
              </div>
            )}

            {day.estimatedDailyBudget && (
              <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
                💰 Est. daily budget: <span className="font-semibold text-gray-700">₹{day.estimatedDailyBudget}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
