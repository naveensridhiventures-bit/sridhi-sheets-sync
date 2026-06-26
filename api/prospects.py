"""
api/prospects.py
─────────────────────────────────────────────────────────────────────────────
Proxy for OpenStreetMap Nominatim + Overpass API.
Runs server-side to avoid browser CORS restrictions.

GET /api/prospects?area=T Nagar Chennai&type=restaurant
Returns: { results: [{name, phone, address, type, lat, lon}] }
"""

import json
import urllib.request
import urllib.parse
from http.server import BaseHTTPRequestHandler


def geocode(area: str):
    url = "https://nominatim.openstreetmap.org/search?q=" + urllib.parse.quote(area) + "&format=json&limit=1"
    req = urllib.request.Request(url, headers={"User-Agent": "SridhiVenturesBOS/1.0 naveen@sridhiventures.com"})
    with urllib.request.urlopen(req, timeout=10) as r:
        data = json.loads(r.read())
    if not data:
        return None, None
    return float(data[0]["lat"]), float(data[0]["lon"])


def overpass_search(lat: float, lon: float, biz_type: str):
    radius = 3000
    type_filters = {
        "restaurant":   'node["amenity"="restaurant"]',
        "meal_provider":'node["amenity"="fast_food"] node["amenity"="food_court"]',
        "catering":     'node["amenity"="catering"] node["catering"="yes"]',
        "hotel":        'node["tourism"="hotel"] node["amenity"="hotel"]',
        "bakery":       'node["shop"="bakery"] node["amenity"="bakery"]',
        "food":         'node["amenity"="restaurant"] node["amenity"="fast_food"] node["shop"="bakery"] node["tourism"="hotel"]',
    }
    nodes = type_filters.get(biz_type, 'node["amenity"="restaurant"]')
    node_lines = "\n".join(f'  {n}(around:{radius},{lat},{lon});' for n in nodes.split())
    query = f"[out:json][timeout:20];(\n{node_lines}\n);out body 40;"

    req = urllib.request.Request(
        "https://overpass-api.de/api/interpreter",
        data=("data=" + urllib.parse.quote(query)).encode(),
        method="POST",
        headers={"User-Agent": "SridhiVenturesBOS/1.0", "Content-Type": "application/x-www-form-urlencoded"},
    )
    with urllib.request.urlopen(req, timeout=25) as r:
        data = json.loads(r.read())
    return data.get("elements", [])


class handler(BaseHTTPRequestHandler):

    def _send(self, code, body):
        payload = json.dumps(body, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.end_headers()
        self.wfile.write(payload)

    def do_OPTIONS(self):
        self._send(200, {})

    def do_GET(self):
        from urllib.parse import urlparse, parse_qs
        parsed = urlparse(self.path)
        qs = parse_qs(parsed.query)
        area = (qs.get("area", ["Koramangala Bengaluru"])[0]).strip()
        biz_type = (qs.get("type", ["restaurant"])[0]).strip()

        try:
            lat, lon = geocode(area)
            if lat is None:
                self._send(404, {"error": "Area not found. Try a more specific area name."})
                return

            elements = overpass_search(lat, lon, biz_type)
            results = []
            seen = set()
            for e in elements:
                name = e.get("tags", {}).get("name", "").strip()
                if not name or name.lower() in seen:
                    continue
                seen.add(name.lower())
                tags = e.get("tags", {})
                phone = tags.get("phone") or tags.get("contact:phone") or tags.get("phone:IN") or ""
                street = tags.get("addr:street", "")
                city = tags.get("addr:city", "")
                address = ", ".join(filter(None, [street, city])) or area
                results.append({
                    "name": name,
                    "phone": phone.strip(),
                    "address": address,
                    "type": tags.get("amenity") or tags.get("shop") or tags.get("tourism") or biz_type,
                    "lat": e.get("lat"),
                    "lon": e.get("lon"),
                })

            self._send(200, {"results": results[:30], "area": area, "count": len(results)})

        except Exception as exc:
            import traceback
            self._send(500, {"error": str(exc), "trace": traceback.format_exc()})

    def log_message(self, *_):
        pass
