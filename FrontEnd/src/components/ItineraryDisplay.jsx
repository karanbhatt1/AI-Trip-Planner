import { useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronDown, ChevronRight, Edit3, MapPin, Save, X, Map } from 'lucide-react';
import { normalizeStructuredItinerary } from '../utils/itineraryParser';

export default function ItineraryDisplay({
  itineraryText,
  itineraryStructured,
  onStructuredChange,
  className = '',
  readOnly = false,
  initialExpandedDays = new Set([0]),
  currentLocation = null,
}) {
  const [expandedDays, setExpandedDays] = useState(initialExpandedDays);
  const [localStructured, setLocalStructured] = useState(
    normalizeStructuredItinerary(itineraryStructured, itineraryText)
  );

  useEffect(() => {
    setLocalStructured(normalizeStructuredItinerary(itineraryStructured, itineraryText));
  }, [itineraryStructured, itineraryText]);

  const days = useMemo(() => localStructured?.days || [], [localStructured]);

  if (!days.length) {
    if (!itineraryText) {
      return (
        <div className={`text-center py-8 text-slate-400 ${className}`}>
          <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No itinerary available</p>
        </div>
      );
    }

    return (
      <div className={`text-slate-200 p-4 rounded-lg bg-slate-800/50 ${className}`}>
        <pre className="whitespace-pre-wrap text-sm leading-relaxed">{itineraryText}</pre>
      </div>
    );
  }

  const toggleDay = (index) => {
    const updated = new Set(expandedDays);
    if (updated.has(index)) {
      updated.delete(index);
    } else {
      updated.add(index);
    }
    setExpandedDays(updated);
  };

  const updateDay = (dayIndex, nextDay) => {
    setLocalStructured((prev) => {
      const nextDays = [...(prev?.days || [])];
      nextDays[dayIndex] = nextDay;
      return { ...(prev || {}), days: nextDays };
    });
  };

  const persistStructured = async (nextStructured) => {
    if (typeof onStructuredChange === 'function') {
      await onStructuredChange(nextStructured);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {days.map((day, index) => (
        <EditableDayCard
          key={`${day.dayNumber}-${index}`}
          day={day}
          dayIndex={index}
          isExpanded={expandedDays.has(index)}
          onToggle={() => toggleDay(index)}
          onDayChange={updateDay}
          onPersist={persistStructured}
          structured={localStructured}
          readOnly={readOnly}
          currentLocation={currentLocation}
        />
      ))}
    </div>
  );
}

function EditableDayCard({
  day,
  dayIndex,
  isExpanded,
  onToggle,
  onDayChange,
  onPersist,
  structured,
  readOnly = false,
  currentLocation = null,
}) {
  const [isEditingDay, setIsEditingDay] = useState(false);
  const [editingCheckpointIndex, setEditingCheckpointIndex] = useState(-1);
  const [draftDay, setDraftDay] = useState(day);

  useEffect(() => {
    setDraftDay(day);
  }, [day]);

  const canEdit = !readOnly;

  const openCheckpointInMaps = (checkpoint) => {
    if (!checkpoint.location) {
      alert('Location not available for this checkpoint');
      return;
    }

    // Build Google Maps URL with origin (current location) and destination (checkpoint)
    const origin = currentLocation ? encodeURIComponent(currentLocation) : 'current location';
    const destination = encodeURIComponent(checkpoint.location);
    
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
    window.open(mapsUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSaveDay = async () => {
    onDayChange(dayIndex, draftDay);
    setIsEditingDay(false);

    const nextDays = [...(structured?.days || [])];
    nextDays[dayIndex] = draftDay;
    await onPersist({ ...(structured || {}), days: nextDays });
  };

  const handleCancelDay = () => {
    setDraftDay(day);
    setIsEditingDay(false);
  };

  const saveCheckpoint = async () => {
    onDayChange(dayIndex, draftDay);
    setEditingCheckpointIndex(-1);

    const nextDays = [...(structured?.days || [])];
    nextDays[dayIndex] = draftDay;
    await onPersist({ ...(structured || {}), days: nextDays });
  };

  return (
    <article className="rounded-xl border border-slate-600 bg-slate-800/60 overflow-hidden">
      <div className="flex items-center justify-between gap-3 p-4 md:p-5 border-b border-slate-700/60">
        <button type="button" onClick={onToggle} className="flex items-center gap-3 text-left">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-slate-300" />
          ) : (
            <ChevronRight className="w-5 h-5 text-slate-300" />
          )}
          <div>
            <p className="text-xs uppercase text-teal-300 tracking-wide">Day {draftDay.dayNumber}</p>
            <h3 className="text-lg font-semibold text-white">{draftDay.title || `Day ${draftDay.dayNumber}`}</h3>
            {draftDay.date ? <p className="text-xs text-slate-400 mt-1">{draftDay.date}</p> : null}
          </div>
        </button>

        {canEdit && !isEditingDay ? (
          <button
            type="button"
            onClick={() => setIsEditingDay(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200 hover:bg-amber-500/20 transition"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit Day
          </button>
        ) : canEdit && isEditingDay ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveDay}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-200 hover:bg-emerald-500/20 transition"
            >
              <Save className="w-3.5 h-3.5" />
              Save
            </button>
            <button
              type="button"
              onClick={handleCancelDay}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-500 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700 transition"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
          </div>
        ) : null}
      </div>

      {isExpanded ? (
        <div className="p-4 md:p-5 space-y-4">
          {canEdit && isEditingDay ? (
            <div className="grid gap-3 md:grid-cols-2">
              <input
                type="text"
                value={draftDay.title || ''}
                onChange={(event) => setDraftDay((prev) => ({ ...prev, title: event.target.value }))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                placeholder="Day title"
              />
              <input
                type="date"
                value={draftDay.date || ''}
                onChange={(event) => setDraftDay((prev) => ({ ...prev, date: event.target.value }))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
              />
              <textarea
                rows={2}
                value={draftDay.summary || ''}
                onChange={(event) => setDraftDay((prev) => ({ ...prev, summary: event.target.value }))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white md:col-span-2"
                placeholder="Day summary"
              />
            </div>
          ) : draftDay.summary ? (
            <p className="text-sm text-slate-300">{draftDay.summary}</p>
          ) : null}

          <div className="space-y-3">
            {(draftDay.checkpoints || []).map((checkpoint, checkpointIndex) => {
              const isEditingCheckpoint = editingCheckpointIndex === checkpointIndex;

              return (
                      <div key={`${checkpoint.title}-${checkpointIndex}`} className="rounded-lg border border-slate-700 bg-slate-900/50 p-3">
                  {!canEdit || !isEditingCheckpoint ? (
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-xs text-teal-300 font-semibold">{checkpoint.time || '-'}</p>
                        <h4 className="text-sm font-semibold text-white mt-1">{checkpoint.title}</h4>
                        <p className="text-xs text-slate-300 mt-1">{checkpoint.description}</p>
                        {checkpoint.location ? (
                          <p className="text-xs text-slate-400 mt-1 inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {checkpoint.location}
                          </p>
                        ) : null}
                        {checkpoint.notes ? <p className="text-xs text-slate-400 mt-1">{checkpoint.notes}</p> : null}
                        
                        {/* Cost and Transport Info */}
                        {checkpoint.cost || checkpoint.transport ? (
                          <div className="mt-2 pt-2 border-t border-slate-600 flex flex-col gap-1">
                            {checkpoint.cost ? (
                              <p className="text-xs text-emerald-300">
                                <span className="text-slate-400">Cost:</span> {checkpoint.cost}
                              </p>
                            ) : null}
                            {checkpoint.transport ? (
                              <p className="text-xs text-cyan-300">
                                <span className="text-slate-400">Transport:</span> {checkpoint.transport}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                        
                        {/* Activities Section */}
                        {checkpoint.activities && checkpoint.activities.length > 0 ? (
                          <div className="mt-3 pt-3 border-t border-slate-600">
                            <p className="text-xs font-semibold text-amber-300 mb-2">Activities:</p>
                            <div className="space-y-2">
                              {checkpoint.activities.map((activity, actIndex) => (
                                <div key={actIndex} className="ml-2 rounded bg-slate-800/50 p-2">
                                  <p className="text-xs font-semibold text-white">{activity.name}</p>
                                  <p className="text-xs text-slate-300">{activity.description}</p>
                                  <div className="flex gap-3 mt-1 text-xs text-slate-400">
                                    <span>Duration: {activity.duration}</span>
                                    <span>Cost: {activity.estimated_cost}</span>
                                  </div>
                                  {activity.notes ? <p className="text-xs text-slate-400 mt-1 italic">{activity.notes}</p> : null}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        
                        {/* Costs Section */}
                        {checkpoint.costs && checkpoint.costs.length > 0 ? (
                          <div className="mt-3 pt-3 border-t border-slate-600">
                            <p className="text-xs font-semibold text-emerald-300 mb-2">Costs:</p>
                            <div className="space-y-1">
                              {checkpoint.costs.map((cost, costIndex) => (
                                <p key={costIndex} className="text-xs text-slate-300">
                                  <span className="text-slate-400 capitalize">{cost.category}:</span> {cost.description} - <span className="text-emerald-300 font-semibold">{cost.estimated_amount}</span>
                                </p>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      {canEdit ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => openCheckpointInMaps(checkpoint)}
                            className="inline-flex items-center gap-1 rounded-lg border border-blue-500/40 bg-blue-500/10 px-2.5 py-1 text-[11px] text-blue-200 hover:bg-blue-500/20 transition"
                            title="Open in Google Maps"
                          >
                            <Map className="w-3 h-3" />
                            Map
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCheckpointIndex(checkpointIndex)}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-200 hover:bg-amber-500/20 transition"
                          >
                            <Edit3 className="w-3 h-3" />
                            Edit
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openCheckpointInMaps(checkpoint)}
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-500/40 bg-blue-500/10 px-2.5 py-1 text-[11px] text-blue-200 hover:bg-blue-500/20 transition"
                          title="Open in Google Maps"
                        >
                          <Map className="w-3 h-3" />
                          Map
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid gap-2 md:grid-cols-2">
                        <input
                          type="text"
                          value={checkpoint.time || ''}
                          onChange={(event) => {
                            const nextCheckpoints = [...(draftDay.checkpoints || [])];
                            nextCheckpoints[checkpointIndex] = {
                              ...nextCheckpoints[checkpointIndex],
                              time: event.target.value,
                            };
                            setDraftDay((prev) => ({ ...prev, checkpoints: nextCheckpoints }));
                          }}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-xs"
                          placeholder="Time"
                        />
                        <input
                          type="text"
                          value={checkpoint.location || ''}
                          onChange={(event) => {
                            const nextCheckpoints = [...(draftDay.checkpoints || [])];
                            nextCheckpoints[checkpointIndex] = {
                              ...nextCheckpoints[checkpointIndex],
                              location: event.target.value,
                            };
                            setDraftDay((prev) => ({ ...prev, checkpoints: nextCheckpoints }));
                          }}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-xs"
                          placeholder="Location"
                        />
                      </div>
                      <input
                        type="text"
                        value={checkpoint.title || ''}
                        onChange={(event) => {
                          const nextCheckpoints = [...(draftDay.checkpoints || [])];
                          nextCheckpoints[checkpointIndex] = {
                            ...nextCheckpoints[checkpointIndex],
                            title: event.target.value,
                          };
                          setDraftDay((prev) => ({ ...prev, checkpoints: nextCheckpoints }));
                        }}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-xs"
                        placeholder="Checkpoint title"
                      />
                      <textarea
                        rows={2}
                        value={checkpoint.description || ''}
                        onChange={(event) => {
                          const nextCheckpoints = [...(draftDay.checkpoints || [])];
                          nextCheckpoints[checkpointIndex] = {
                            ...nextCheckpoints[checkpointIndex],
                            description: event.target.value,
                          };
                          setDraftDay((prev) => ({ ...prev, checkpoints: nextCheckpoints }));
                        }}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-xs"
                        placeholder="Description"
                      />
                      <textarea
                        rows={2}
                        value={checkpoint.notes || ''}
                        onChange={(event) => {
                          const nextCheckpoints = [...(draftDay.checkpoints || [])];
                          nextCheckpoints[checkpointIndex] = {
                            ...nextCheckpoints[checkpointIndex],
                            notes: event.target.value,
                          };
                          setDraftDay((prev) => ({ ...prev, checkpoints: nextCheckpoints }));
                        }}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-xs"
                        placeholder="Notes"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={saveCheckpoint}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-[11px] text-emerald-200 hover:bg-emerald-500/20 transition"
                        >
                          <Save className="w-3 h-3" />
                          Save Checkpoint
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDraftDay(day);
                            setEditingCheckpointIndex(-1);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-500 px-3 py-1.5 text-[11px] text-slate-200 hover:bg-slate-700 transition"
                        >
                          <X className="w-3 h-3" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </article>
  );
}
