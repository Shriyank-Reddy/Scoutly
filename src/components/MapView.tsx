import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';

export interface Pin {
  id: string;
  lat: number;
  lon: number;
  title: string;
  company: string;
  mode: string;
}

const COLORS: Record<string, string> = { onsite: '#2a62f5', hybrid: '#8fb4ff', unknown: '#96a4c2' };
const icon = (mode: string, active: boolean) =>
  L.divIcon({
    className: '',
    iconSize: [active ? 22 : 16, active ? 22 : 16],
    html: `<span style="display:block;width:100%;height:100%;border-radius:50%;background:${COLORS[mode] ?? COLORS.unknown};border:2px solid ${active ? '#fff' : '#070a12'};box-shadow:0 0 0 ${active ? 4 : 0}px rgba(42,98,245,.45)"></span>`,
  });

/** Leaflet map with OpenStreetMap tiles and clustered pins. Kept in sync with the list via selectedId / onSelect. */
export function MapView({
  pins,
  center,
  radiusKm,
  selectedId,
  onSelect,
}: {
  pins: Pin[];
  center: [number, number] | null;
  radiusKm: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const cluster = useRef<L.MarkerClusterGroup | null>(null);
  const circle = useRef<L.Circle | null>(null);
  const markers = useRef(new Map<string, L.Marker>());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { worldCopyJump: true }).setView([20, 0], 2);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(m);
    cluster.current = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 45,
    }).addTo(m);
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  // Rebuild markers when the pins change.
  useEffect(() => {
    const m = map.current,
      c = cluster.current;
    if (!m || !c) return;
    c.clearLayers();
    markers.current.clear();
    pins.forEach((p, i) => {
      const mk = L.marker([p.lat, p.lon], {
        icon: icon(p.mode, false),
        title: `${p.title} at ${p.company}`,
        keyboard: true,
      });
      mk.bindTooltip(`<strong>${esc(p.title)}</strong><br>${esc(p.company)}`);
      mk.on('click', () => onSelectRef.current(p.id));
      markers.current.set(`${p.id}:${i}`, mk); // a listing can have several places, so several pins
      c.addLayer(mk);
    });
    circle.current?.remove();
    circle.current = null;
    if (center) {
      circle.current = L.circle(center, {
        radius: radiusKm * 1000,
        color: '#8fb4ff',
        weight: 1,
        fillOpacity: 0.05,
      }).addTo(m);
      m.fitBounds(circle.current.getBounds(), { padding: [20, 20], animate: false });
    } else if (pins.length)
      m.fitBounds(L.latLngBounds(pins.map((p) => [p.lat, p.lon] as [number, number])), {
        padding: [30, 30],
        maxZoom: 10,
        animate: false,
      });
  }, [pins, center, radiusKm]);

  // Highlight the selected pin and bring it into view.
  useEffect(() => {
    pins.forEach((p, i) =>
      markers.current.get(`${p.id}:${i}`)?.setIcon(icon(p.mode, p.id === selectedId)),
    );
    const at = pins.findIndex((p) => p.id === selectedId);
    const sel = at >= 0 ? markers.current.get(`${pins[at].id}:${at}`) : null;
    if (sel && cluster.current && map.current)
      cluster.current.zoomToShowLayer(
        sel,
        () =>
          map.current &&
          !map.current.getBounds().contains(sel.getLatLng()) &&
          map.current.panTo(sel.getLatLng()),
      );
  }, [selectedId, pins]);

  return (
    <div
      ref={el}
      className="h-full min-h-[320px] w-full rounded-xl border border-line"
      role="application"
      aria-label="Map of internships"
    />
  );
}
const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
