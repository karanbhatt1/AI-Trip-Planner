import { Clock, MapPin, Navigation, Info } from 'lucide-react';

const RouteSidebar = ({
  checkpoints,
  routeSummary,
  selectedCheckpoint,
  onCheckpointClick,
  isLoading
}) => {
  if (isLoading) {
    return (
      <div className="w-full max-w-md bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-700 rounded mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-slate-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!checkpoints || checkpoints.length === 0) {
    return (
      <div className="w-full max-w-md bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="text-center text-slate-400">
          <Navigation className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No route data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-teal-500/20 rounded-full flex items-center justify-center">
            <Navigation className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Route Overview</h2>
            <p className="text-slate-400 text-sm">{checkpoints.length} stops</p>
          </div>
        </div>

        {/* Route Summary */}
        {routeSummary && (
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="bg-slate-700/50 rounded-lg p-3">
              <div className="text-teal-400 text-sm font-medium">Total Distance</div>
              <div className="text-white font-bold">{routeSummary.totalDistance} km</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3">
              <div className="text-teal-400 text-sm font-medium">Total Time</div>
              <div className="text-white font-bold">{routeSummary.totalTime}</div>
            </div>
          </div>
        )}
      </div>

      {/* Checkpoints List */}
      <div className="max-h-96 overflow-y-auto">
        {checkpoints.map((checkpoint, index) => (
          <div
            key={`${checkpoint.name}-${index}`}
            className={`p-4 border-b border-slate-700/50 cursor-pointer transition-all hover:bg-slate-700/30 ${
              selectedCheckpoint === index ? 'bg-teal-500/10 border-l-4 border-l-teal-400' : ''
            }`}
            onClick={() => onCheckpointClick && onCheckpointClick(index)}
          >
            <div className="flex items-start gap-3">
              {/* Checkpoint Number */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                selectedCheckpoint === index
                  ? 'bg-teal-500 text-white'
                  : 'bg-slate-600 text-slate-300'
              }`}>
                {index + 1}
              </div>

              {/* Checkpoint Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white truncate">{checkpoint.name}</h3>

                {checkpoint.description && (
                  <p className="text-slate-400 text-sm mt-1 line-clamp-2">
                    {checkpoint.description}
                  </p>
                )}

                {/* Travel Time to Next Stop */}
                {index < checkpoints.length - 1 && routeSummary?.segments?.[index] && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    <span>{routeSummary.segments[index].time}</span>
                    <span>•</span>
                    <MapPin className="w-3 h-3" />
                    <span>{routeSummary.segments[index].distance} km</span>
                  </div>
                )}

                {/* Why this checkpoint */}
                {checkpoint.why && (
                  <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-blue-300">
                    <div className="flex items-start gap-1">
                      <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>{checkpoint.why}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 bg-slate-900/50 border-t border-slate-700">
        <p className="text-xs text-slate-500 text-center">
          Click on any checkpoint to highlight it on the map
        </p>
      </div>
    </div>
  );
};

export default RouteSidebar;