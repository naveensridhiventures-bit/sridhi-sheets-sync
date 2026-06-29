"""
api/prospects.py - High performance prospect finder using Google Places Text Search
Uses Google Places API (free tier: 1000 calls/month) for much better results than OSM
Falls back to Overpass if no Google key configured
"""
import json, urllib.request, urllib.parse, threading, os
from http.server import BaseHTTPRequestHandler


def google_places_search(query: str, location: str) -> list:
    """Use Google Places Text Search API - much better phone numbers and data."""
    api_key = os.environ.get("GOOGLE_PLACES_API_KEY", "")
    if not api_key:
        return []
    
    search_query = query + " " + location
    url = "https://maps.googleapis.com/maps/api/place/textsearch/json?query=" + \
          urllib.parse.quote(search_query) + "&key=" + api_key
    
    req = urllib.request.Request(url, headers={"User-Agent": "SridhiVenturesBOS/1.0"})
    with urllib.request.urlopen(req, timeout=15) as r:
        data = json.loads(r.read())
    
    results = []
    place_ids = []
    for place in data.get("results", [])[:20]:
        place_ids.append(place.get("place_id"))
        results.append({
            "name": place.get("name", ""),
            "address": place.get("formatted_address", ""),
            "phone": "",  # Need details call
            "type": ",".join(place.get("types", ["restaurant"])),
            "rating": place.get("rating", 0),
            "lat": place.get("geometry", {}).get("location", {}).get("lat"),
            "lon": place.get("geometry", {}).get("location", {}).get("lng"),
            "place_id": place.get("place_id"),
        })
    
    # Fetch phone numbers in parallel
    def fetch_phone(idx, place_id):
        try:
            detail_url = "https://maps.googleapis.com/maps/api/place/details/json?place_id=" + \
                        place_id + "&fields=formatted_phone_number&key=" + api_key
            req2 = urllib.request.Request(detail_url, headers={"User-Agent": "SridhiVenturesBOS/1.0"})
            with urllib.request.urlopen(req2, timeout=8) as r2:
                d = json.loads(r2.read())
            phone = d.get("result", {}).get("formatted_phone_number", "")
            if phone:
                results[idx]["phone"] = phone.replace(" ", "").replace("-", "")
        except:
            pass
    
    threads = [threading.Thread(target=fetch_phone, args=(i, pid)) for i, pid in enumerate(place_ids) if pid]
    for t in threads: t.start()
    for t in threads: t.join(timeout=10)
    
    return results


def geocode(area: str):
    url = "https://nominatim.openstreetmap.org/search?q=" + urllib.parse.quote(area) + \
          "&format=json&limit=1&countrycodes=in"
    req = urllib.request.Request(url, headers={"User-Agent": "SridhiVenturesBOS/1.0"})
    with urllib.request.urlopen(req, timeout=10) as r:
        data = json.loads(r.read())
    if not data:
        return None, None
    return float(data[0]["lat"]), float(data[0]["lon"])


def overpass_search_parallel(lat: float, lon: float, biz_type: str) -> list:
    """Parallel Overpass queries for maximum coverage."""
    radius = 8000  # 8km
    
    queries_map = {
        "restaurant": [
            f'[out:json][timeout:20];(node["amenity"="restaurant"](around:{radius},{lat},{lon});way["amenity"="restaurant"](around:{radius},{lat},{lon}););out body 60;',
            f'[out:json][timeout:20];(node["amenity"="fast_food"](around:{radius},{lat},{lon});node["cuisine"](around:{radius},{lat},{lon}););out body 40;',
        ],
        "meal_provider": [
            f'[out:json][timeout:20];(node["amenity"="fast_food"](around:{radius},{lat},{lon});node["amenity"="canteen"](around:{radius},{lat},{lon});node["amenity"="cafe"](around:{radius},{lat},{lon}););out body 60;',
            f'[out:json][timeout:20];(node["amenity"="food_court"](around:{radius},{lat},{lon});node["takeaway"="yes"](around:{radius},{lat},{lon}););out body 40;',
        ],
        "hotel": [
            f'[out:json][timeout:20];(node["tourism"="hotel"](around:{radius},{lat},{lon});way["tourism"="hotel"](around:{radius},{lat},{lon}););out body 60;',
            f'[out:json][timeout:20];(node["tourism"="guest_house"](around:{radius},{lat},{lon});node["building"="hotel"](around:{radius},{lat},{lon}););out body 40;',
        ],
        "bakery": [
            f'[out:json][timeout:20];(node["shop"="bakery"](around:{radius},{lat},{lon});way["shop"="bakery"](around:{radius},{lat},{lon}););out body 60;',
        ],
        "catering": [
            f'[out:json][timeout:20];(node["catering"](around:{radius},{lat},{lon});node["amenity"="restaurant"](around:{radius},{lat},{lon}););out body 60;',
        ],
        "food": [
            f'[out:json][timeout:20];(node["amenity"="restaurant"](around:{radius},{lat},{lon});node["amenity"="fast_food"](around:{radius},{lat},{lon}););out body 60;',
            f'[out:json][timeout:20];(node["tourism"="hotel"](around:{radius},{lat},{lon});node["shop"="bakery"](around:{radius},{lat},{lon});node["amenity"="cafe"](around:{radius},{lat},{lon}););out body 40;',
        ],
    }
    
    queries = queries_map.get(biz_type, queries_map["food"])
    all_elements = []
    lock = threading.Lock()

    def run_query(q):
        try:
            req = urllib.request.Request(
                "https://overpass-api.de/api/interpreter",
                data=("data=" + urllib.parse.quote(q)).encode(),
                method="POST",
                headers={"User-Agent": "SridhiVenturesBOS/1.0", "Content-Type": "application/x-www-form-urlencoded"},
            )
            with urllib.request.urlopen(req, timeout=18) as r:
                data = json.loads(r.read())
            with lock:
                all_elements.extend(data.get("elements", []))
        except:
            pass

    threads = [threading.Thread(target=run_query, args=(q,)) for q in queries]
    for t in threads: t.start()
    for t in threads: t.join(timeout=20)
    
    seen, results = set(), []
    for e in all_elements:
        tags = e.get("tags", {})
        name = (tags.get("name") or "").strip()
        if not name or name.lower() in seen:
            continue
        seen.add(name.lower())
        phone = (tags.get("phone") or tags.get("contact:phone") or tags.get("mobile") or "").strip()
        if phone:
            phone = phone.replace(" ","").replace("-","").replace("+91","").replace("091","")
            if len(phone) > 10: phone = phone[-10:]
        street = tags.get("addr:street","")
        suburb = tags.get("addr:suburb","") or tags.get("addr:city","")
        address = ", ".join(filter(None,[street, suburb])) or ""
        results.append({
            "name": name, "phone": phone, "address": address,
            "type": tags.get("amenity") or tags.get("shop") or tags.get("tourism") or biz_type,
            "website": tags.get("website",""), "lat": e.get("lat"), "lon": e.get("lon"),
        })
    
    return results


class handler(BaseHTTPRequestHandler):

    def _send(self, code, body):
        payload = json.dumps(body, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(payload)

    def do_OPTIONS(self): self._send(200, {})

    def do_GET(self):
        from urllib.parse import urlparse, parse_qs
        qs = parse_qs(urlparse(self.path).query)
        area = (qs.get("area", ["T Nagar Chennai"])[0]).strip()
        biz_type = (qs.get("type", ["restaurant"])[0]).strip()

        try:
            # Try Google Places first (better data)
            type_query = {
                "restaurant": "restaurants mess tiffin",
                "meal_provider": "mess tiffin canteen",
                "hotel": "hotels lodges",
                "bakery": "bakery sweet shop",
                "catering": "catering food service",
                "food": "restaurant hotel mess bakery",
            }.get(biz_type, "restaurant")
            
            results = google_places_search(type_query, area)
            source = "google"
            
            # If no Google key or no results, use Overpass
            if not results:
                lat, lon = geocode(area)
                if lat is None:
                    self._send(404, {"error": "Area not found. Try: T Nagar Chennai, Anna Nagar Chennai etc."}); return
                results = overpass_search_parallel(lat, lon, biz_type)
                source = "osm"
            
            # Sort: with phone first, then alphabetical
            results.sort(key=lambda x: (0 if x.get("phone") else 1, x.get("name","")))
            
            self._send(200, {"results": results[:50], "area": area, "count": len(results), "source": source})

        except Exception as exc:
            import traceback
            self._send(500, {"error": str(exc), "trace": traceback.format_exc()})

    def log_message(self, *_): pass
