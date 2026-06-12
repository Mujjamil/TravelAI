function EmptyState({ icon, text }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <div className="text-4xl mb-3">{icon}</div>
      <div className="text-sm text-center">{text}</div>
    </div>
  )
}

export function PackingList({ packingList }) {
  if (!packingList?.sections?.length) return <EmptyState icon="🎒" text="Plan a trip to build a personalized packing list." />

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800">
        Built for {packingList.days} days and {packingList.climate} weather.
      </div>
      {packingList.sections.map(section => (
        <section key={section.title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-bold text-slate-800">{section.title}</h3>
          <div className="space-y-2">
            {section.items.map(item => (
              <label key={item} className="flex items-start gap-2 text-sm text-slate-600">
                <input type="checkbox" className="mt-0.5 rounded border-slate-300" />
                <span>{item}</span>
              </label>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

export function RecommendedPlaces({ places = [] }) {
  if (!places.length) return <EmptyState icon="📍" text="Plan a trip to see the most recommended places." />

  return (
    <div className="space-y-3">
      {places.map(place => (
        <a
          key={place.name}
          href={place.mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md"
        >
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
            {place.rank}
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900">{place.name}</div>
            <div className="mt-1 text-xs leading-relaxed text-slate-500">{place.reason}</div>
            <div className="mt-2 text-xs font-semibold text-blue-600">Open in Google Maps ↗</div>
          </div>
        </a>
      ))}
    </div>
  )
}

const PLATFORM_STYLE = {
  YouTube: 'bg-red-50 text-red-700 border-red-100',
  Instagram: 'bg-pink-50 text-pink-700 border-pink-100',
  Unsplash: 'bg-slate-50 text-slate-800 border-slate-200',
  'Google Images': 'bg-blue-50 text-blue-700 border-blue-100',
}

export function MediaLinks({ media = [] }) {
  if (!media.length) return <EmptyState icon="📷" text="Plan a trip to get destination photo and video links." />

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-slate-500">
        These links open current public search results, so the inspiration stays fresh.
      </p>
      {media.map(item => (
        <a
          key={`${item.platform}-${item.label}`}
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className={`block rounded-2xl border p-4 transition hover:shadow-md ${PLATFORM_STYLE[item.platform] || 'bg-white text-slate-700 border-slate-200'}`}
        >
          <div className="text-xs font-bold uppercase tracking-wide">{item.platform}</div>
          <div className="mt-1 text-sm font-semibold">{item.label} ↗</div>
        </a>
      ))}
    </div>
  )
}
