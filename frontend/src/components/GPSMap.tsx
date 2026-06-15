import { useEffect, useRef } from 'react';
import L, { type CircleMarker, type Map as LeafletMap, type Polyline } from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface GPSMapProps {
  lat: number;
  lon: number;
  valid: boolean;
}

const isFiniteCoordinate = (lat: number, lon: number) =>
  Number.isFinite(lat) &&
  Number.isFinite(lon) &&
  lat >= -90 &&
  lat <= 90 &&
  lon >= -180 &&
  lon <= 180;

export const GPSMap = ({ lat, lon, valid }: GPSMapProps) => {
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<CircleMarker | null>(null);
  const trailRef = useRef<Polyline | null>(null);
  const trailPointsRef = useRef<Array<[number, number]>>([]);

  useEffect(() => {
    if (!valid || !isFiniteCoordinate(lat, lon) || !nodeRef.current || mapRef.current) return;

    const start: [number, number] = [lat, lon];

    const map = L.map(nodeRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: false,
      doubleClickZoom: true,
    }).setView(start, 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      crossOrigin: true,
    }).addTo(map);

    const marker = L.circleMarker(start, {
      radius: 7,
      color: '#67e8f9',
      fillColor: '#22d3ee',
      fillOpacity: 0.95,
      weight: 2,
    }).addTo(map);

    const trail = L.polyline([start], {
      color: '#22d3ee',
      weight: 2,
      opacity: 0.72,
    }).addTo(map);

    mapRef.current = map;
    markerRef.current = marker;
    trailRef.current = trail;
    trailPointsRef.current = [start];

    window.setTimeout(() => map.invalidateSize(), 120);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      trailRef.current = null;
      trailPointsRef.current = [];
    };
  }, [valid]);

  useEffect(() => {
    if (!valid || !isFiniteCoordinate(lat, lon) || !mapRef.current || !markerRef.current || !trailRef.current) return;

    const point: [number, number] = [lat, lon];
    markerRef.current.setLatLng(point);

    const previous = trailPointsRef.current.at(-1);
    const moved =
      !previous ||
      Math.abs(previous[0] - lat) > 0.000001 ||
      Math.abs(previous[1] - lon) > 0.000001;

    if (moved) {
      trailPointsRef.current = [...trailPointsRef.current, point].slice(-120);
      trailRef.current.setLatLngs(trailPointsRef.current);
    }

    mapRef.current.setView(point, mapRef.current.getZoom() || 16, {
      animate: true,
      duration: 0.25,
    });
  }, [lat, lon, valid]);

  if (!valid || !isFiniteCoordinate(lat, lon)) {
    return (
      <div className="gps-map gps-map-placeholder">
        <span>GPS WAITING</span>
        <small>Map activates after valid latitude/longitude.</small>
      </div>
    );
  }

  return <div ref={nodeRef} className="gps-map" />;
};
