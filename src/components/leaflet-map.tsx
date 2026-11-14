import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { Linking } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

// Leaflet + OpenStreetMap in a WebView: no Google Play services and no API key needed, so the map works on every
// Android phone. shortcut: OSM's public tile server is for light use; switch the tile URL to a commercial provider
// (or the Naver/Kakao map SDKs) before heavy production traffic.
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const BASE_URL = 'https://kovil.co.kr/';

export type MapView = { lat: number; lng: number; zoom: number; bounds: { swLat: number; swLng: number; neLat: number; neLng: number } };
export type Pin = { id: string; lat: number; lng: number; title: string; subtitle?: string; kind: 'station' | 'campus'; color?: string };
export type LeafletHandle = {
  setPins: (pins: Pin[]) => void;
  setBoundary: (rings: [number, number][][]) => void;
  flyTo: (lat: number, lng: number, zoom?: number) => void;
};

function html(lat: number, lng: number, zoom: number, dark: boolean) {
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
<style>html,body,#m{margin:0;height:100%;background:${dark ? '#0B1220' : '#EEF3FB'}}
.campus{font-size:18px;line-height:24px;text-align:center;background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,.3)}
${dark ? '.leaflet-tile-pane{filter:brightness(.7) invert(1) contrast(.9) hue-rotate(200deg) saturate(.4)}' : ''}</style>
</head><body><div id="m"></div><script>
var send=function(o){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(o))};
if(!window.L){send({type:'error'});}else{
var map=L.map('m',{zoomControl:false}).setView([${lat},${lng}],${zoom});
L.tileLayer('${TILE_URL}',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
var pins=L.layerGroup().addTo(map), area=L.layerGroup().addTo(map);
var esc=function(s){return String(s||'').replace(/[&<>"']/g,function(c){return '&#'+c.charCodeAt(0)+';'})};
var view=function(){var c=map.getCenter(),b=map.getBounds();send({type:'view',lat:c.lat,lng:c.lng,zoom:map.getZoom(),
  bounds:{swLat:b.getSouth(),swLng:b.getWest(),neLat:b.getNorth(),neLng:b.getEast()}})};
map.on('moveend',view);
window.kovil={
  setPins:function(list){pins.clearLayers();list.forEach(function(p){var m=p.kind==='station'
    ?L.circleMarker([p.lat,p.lng],{radius:7,color:'#fff',weight:3,fillColor:p.color||'#1F5EFF',fillOpacity:1})
    :L.marker([p.lat,p.lng],{icon:L.divIcon({className:'campus',html:'🎓',iconSize:[26,26]})});
    m.bindPopup('<b>'+esc(p.title)+'</b>'+(p.subtitle?'<br>'+esc(p.subtitle):'')).addTo(pins)})},
  setBoundary:function(rings){area.clearLayers();rings.forEach(function(r){L.polygon(r,{color:'#1F5EFF',weight:2,fillOpacity:.1}).addTo(area)})},
  flyTo:function(a,b,z){map.flyTo([a,b],z||map.getZoom(),{duration:.6})}
};
send({type:'ready'});view();}
</script></body></html>`;
}

type Props = { lat: number; lng: number; zoom: number; dark: boolean; onView: (v: MapView) => void; onError: () => void; onReady: () => void };

export const LeafletMap = forwardRef<LeafletHandle, Props>(function LeafletMap({ lat, lng, zoom, dark, onView, onError, onReady }, ref) {
  const web = useRef<WebView>(null);
  // The page is built once; later moves go through flyTo so the map never reloads.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const source = useMemo(() => ({ html: html(lat, lng, zoom, dark), baseUrl: BASE_URL }), [dark]);
  const run = (js: string) => web.current?.injectJavaScript(`window.kovil&&(${js});true;`);

  useImperativeHandle(ref, () => ({
    setPins: (pins) => run(`window.kovil.setPins(${JSON.stringify(pins)})`),
    setBoundary: (rings) => run(`window.kovil.setBoundary(${JSON.stringify(rings)})`),
    flyTo: (a, b, z) => run(`window.kovil.flyTo(${Number(a)},${Number(b)},${z ? Number(z) : 'undefined'})`),
  }));

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data) as { type: string } & Partial<MapView>;
      if (msg.type === 'view') onView(msg as MapView);
      else if (msg.type === 'ready') onReady();
      else if (msg.type === 'error') onError();
    } catch {
      // Not ours; ignore.
    }
  };

  return (
    <WebView
      ref={web}
      source={source}
      originWhitelist={['https://*']}
      // The page never navigates: links (e.g. map attribution) open in the browser, everything else is blocked.
      onShouldStartLoadWithRequest={(req) => {
        if (req.url === BASE_URL || req.url.startsWith('about:')) return true;
        if (req.url.startsWith('https://')) Linking.openURL(req.url).catch(() => {});
        return false;
      }}
      onMessage={onMessage}
      onError={onError}
      javaScriptEnabled
      domStorageEnabled
      setSupportMultipleWindows={false}
      style={{ flex: 1, backgroundColor: 'transparent' }}
    />
  );
});
