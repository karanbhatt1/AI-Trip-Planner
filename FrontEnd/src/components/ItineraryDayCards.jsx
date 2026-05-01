import { useMemo } from 'react';
import { CalendarDays, ExternalLink, MapPin } from 'lucide-react';
import { normalizeStructuredItinerary } from '../utils/itineraryParser';

const createMapsUrl = (checkpoint) => {
  const hasCoordinates = Number.isFinite(checkpoint?.lat) && Number.isFinite(checkpoint?.lng);

  if (hasCoordinates) {
    return `https://www.google.com/maps/search/?api=1&query=${checkpoint.lat},${checkpoint.lng}`;
  }

  const query = checkpoint?.location || checkpoint?.title || checkpoint?.name || '';
  if (!query) return '';

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
};

export default function ItineraryDayCards({
  itineraryText,
  itineraryStructured,
  className = '',
  maxDays,
}) {
  const normalized = useMemo(
    () => normalizeStructuredItinerary(itineraryStructured, itineraryText),
    [itineraryStructured, itineraryText]
  );

  const days = Array.isArray(normalized?.days) ? normalized.days : [];
  const visibleDays = typeof maxDays === 'number' ? days.slice(0, maxDays) : days;

  if (!visibleDays.length) {
    return (
      <div className={`rounded-xl border border-slate-700 bg-slate-950/50 p-4 text-sm text-slate-400 ${className}`}>
        <CalendarDays className="w-5 h-5 mb-2 text-slate-500" />
        No structured day cards available yet.
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {visibleDays.map((day) => (
        <article key={`day-preview-${day.dayNumber}`} className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-teal-300">Day {day.dayNumber}</p>
              <h3 className="text-base font-semibold text-white mt-1">{day.title || `Day ${day.dayNumber}`}</h3>
              {day.date ? <p className="text-xs text-slate-500 mt-1">{day.date}</p> : null}
            </div>

            {day.summary ? (
              <span className="rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-[11px] text-teal-200">
                {day.checkpoints?.length || 0} stops
              </span>
            ) : null}
          </div>

          {day.summary ? <p className="text-sm text-slate-300 mb-3">{day.summary}</p> : null}

          <div className="space-y-2">
            {(day.checkpoints || []).map((checkpoint, index) => {
              const mapsUrl = createMapsUrl(checkpoint);
              const placeLabel = checkpoint.location || checkpoint.title || checkpoint.name || `Stop ${index + 1}`;

              return (
                <div key={`${day.dayNumber}-${checkpoint.title || checkpoint.location || index}`} className="rounded-lg border border-slate-700/70 bg-slate-900/60 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-teal-300 flex-shrink-0" />
                        <h4 className="truncate text-sm font-semibold text-white">{checkpoint.title}</h4>
                      </div>
                      {checkpoint.time ? <p className="mt-1 text-xs text-teal-200">{checkpoint.time}</p> : null}
                      {checkpoint.description ? <p className="mt-1 text-xs text-slate-300">{checkpoint.description}</p> : null}
                      {checkpoint.notes ? <p className="mt-1 text-xs text-slate-400">{checkpoint.notes}</p> : null}
                      {mapsUrl ? (
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs text-cyan-300 hover:text-cyan-200 transition"
                        >
                          {placeLabel}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : null}
                    </div>

                    {mapsUrl ? (
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-200 hover:bg-cyan-500/20 transition"
                      >
                        View on map
                      </a>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      ))}
    </div>
  );
}