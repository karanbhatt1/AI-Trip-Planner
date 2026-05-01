import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const RouteMap = ({ checkpoints, onCheckpointClick, selectedCheckpoint, startingLocation, mapHeight = 'h-96' }) => {
  const [map, setMap] = useState(null);
  const [routingControl, setRoutingControl] = useState(null);

  const isValidPoint = (point) => Number.isFinite(point?.lat) && Number.isFinite(point?.lng);

  const formatCoordinate = (value) => (Number.isFinite(value) ? value.toFixed(4) : 'N/A');

  const createMapsUrl = (point) => {
    if (!point) return '';

    if (Number.isFinite(point.lat) && Number.isFinite(point.lng)) {
      return `https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}`;
    }

    const query = point.location || point.name || '';
    if (!query) return '';

    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  };

  // Calculate center point of all checkpoints including starting location
  const getCenter = () => {
    let allPoints = [...(checkpoints || []).filter(isValidPoint)];
    
    if (isValidPoint(startingLocation)) {
      allPoints.unshift(startingLocation);
    }
    
    if (allPoints.length === 0) return [28.6139, 77.2090]; // Default to Delhi

    const lats = allPoints.map((cp) => cp.lat);
    const lngs = allPoints.map((cp) => cp.lng);

    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

    return [centerLat, centerLng];
  };

  // Create route waypoints for routing machine
  const getWaypoints = () => {
    let allPoints = [];
    
    if (isValidPoint(startingLocation)) {
      allPoints.push(startingLocation);
    }
    
    if (checkpoints && checkpoints.length > 0) {
      allPoints = [...allPoints, ...checkpoints.filter(isValidPoint)];
    }
    
    if (allPoints.length === 0) return [];
    return allPoints.map(cp => L.latLng(cp.lat, cp.lng));
  };

  useEffect(() => {
    if (map && checkpoints && checkpoints.filter(isValidPoint).length > 1) {
      // Remove existing routing control
      if (routingControl) {
        map.removeControl(routingControl);
      }

      // Create new routing control
      const waypoints = getWaypoints();
      const newRoutingControl = L.Routing.control({
        waypoints,
        routeWhileDragging: false,
        addWaypoints: false,
        createMarker: () => null, // We'll handle markers ourselves
        lineOptions: {
          styles: [{ color: '#3b82f6', weight: 4, opacity: 0.8 }]
        }
      }).addTo(map);

      setRoutingControl(newRoutingControl);
    }

    return () => {
      if (routingControl && map) {
        map.removeControl(routingControl);
      }
    };
  }, [map, checkpoints]);

  const createCustomIcon = (index, isSelected) => {
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];
    const color = colors[index % colors.length];

    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          background-color: ${isSelected ? '#1f2937' : color};
          border: 3px solid ${isSelected ? color : 'white'};
          border-radius: 50%;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 12px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          transition: all 0.2s ease;
        ">
          ${index + 1}
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
  };

  const createStartIcon = () =>
    L.divIcon({
      className: 'custom-start-marker',
      html: `
        <div style="
          background-color: #0f172a;
          border: 3px solid #14b8a6;
          border-radius: 9999px;
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #14b8a6;
          font-weight: 700;
          font-size: 11px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.25);
        ">
          YOU
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });

  if (!checkpoints || checkpoints.length === 0) {
    return (
      <div className="w-full h-96 bg-slate-800 rounded-lg flex items-center justify-center">
        <div className="text-slate-400 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-slate-700 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <p>No route to display</p>
          <p className="text-sm mt-1">Generate an itinerary to see the map</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${mapHeight} rounded-lg overflow-hidden border border-slate-700`}>
      <MapContainer
        center={getCenter()}
        zoom={10}
        style={{ height: '100%', width: '100%' }}
        ref={setMap}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {isValidPoint(startingLocation) ? (
          <Marker position={[startingLocation.lat, startingLocation.lng]} icon={createStartIcon()}>
            <Popup>
              <div className="p-2">
                <h3 className="font-bold text-base">Current Location</h3>
                <p className="text-sm text-gray-600 mt-1">{startingLocation.name || 'Detected location'}</p>
                <div className="mt-2 text-xs text-gray-500">
                  Lat: {formatCoordinate(startingLocation.lat)}, Lng: {formatCoordinate(startingLocation.lng)}
                </div>
              </div>
            </Popup>
          </Marker>
        ) : null}

        {checkpoints.filter(isValidPoint).map((checkpoint, index) => (
          <Marker
            key={`${checkpoint.name}-${index}`}
            position={[checkpoint.lat, checkpoint.lng]}
            icon={createCustomIcon(index, selectedCheckpoint === index)}
            eventHandlers={{
              click: () => onCheckpointClick && onCheckpointClick(index)
            }}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-bold text-lg">{checkpoint.name}</h3>
                {checkpoint.description && (
                  <p className="text-sm text-gray-600 mt-1">{checkpoint.description}</p>
                )}
                {createMapsUrl(checkpoint) ? (
                  <a
                    href={createMapsUrl(checkpoint)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    Open location in Maps
                  </a>
                ) : null}
                {checkpoint.why && (
                  <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                    <strong>Why here?</strong> {checkpoint.why}
                  </div>
                )}
                <div className="mt-2 text-xs text-gray-500">
                  Lat: {formatCoordinate(checkpoint.lat)}, Lng: {formatCoordinate(checkpoint.lng)}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default RouteMap;