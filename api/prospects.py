"""
api/prospects.py - High performance multi-query prospect finder
Runs multiple Overpass queries in parallel for maximum results
"""
import json
import urllib.request
import urllib.parse
import threading
from http.server import BaseHTTPRequestHandler


def geocode(area: str):
    url = "https://nominatim.openstreetmap.org/search?q=" + urllib.parse.quote(area) + "&format=json&limit=1&countrycodes=in"
    req = urllib.request.Request(url, headers={"User-Agent": "SridhiVenturesBOS/1.0 contact@sridhiventures.com"})
    with urllib.request.urlopen(req, timeout=10) as r:
        data = json.loads(r.read())
    if not data:
        return None, None
    return float(data[0]["lat"]), float(data[0]["lon"])


def run_overpass_query(query: str, results_list: list, lock: threading.Lock):
    """Run a single overpass query and append results to shared list."""
    try:
        req = urllib.request.Request(
            "https://overpass-api.de/api/interpreter",
            data=("data=" + urllib.parse.quote(query)).encode(),
            method="POST",
            headers={
                "User-Agent": "SridhiVenturesBOS/1.0",
                "Content-Type": "application/x-www-form-urlencoded",
            },
        )
        with urllib.request.urlopen(req, timeout=20) as r:
            data = json.loads(r.read())
        with lock:
            results_list.extend(data.get("elements", []))
    except Exception:
        pass  # Silently skip failed queries


def build_queries(lat: float, lon: float, biz_type: str) -> list:
    """Build multiple targeted queries for maximum coverage."""
    r5 = 5000   # 5km radius
    r10 = 10000  # 10km radius

    base = f"[out:json][timeout:25];"

    # Different query sets based on business type
    if biz_type == "restaurant":
        queries = [
            base + f"(node[\"amenity\"=\"restaurant\"](around:{r5},{lat},{lon});way[\"amenity\"=\"restaurant\"](around:{r5},{lat},{lon}););out body 50;",
            base + f"(node[\"amenity\"=\"fast_food\"](around:{r5},{lat},{lon});way[\"amenity\"=\"fast_food\"](around:{r5},{lat},{lon}););out body 50;",
            base + f"(node[\"amenity\"=\"food_court\"](around:{r5},{lat},{lon});node[\"cuisine\"](around:{r5},{lat},{lon}););out body 30;",
        ]
    elif biz_type == "meal_provider":
        queries = [
            base + f"(node[\"amenity\"=\"fast_food\"](around:{r10},{lat},{lon});way[\"amenity\"=\"fast_food\"](around:{r10},{lat},{lon}););out body 60;",
            base + f"(node[\"amenity\"=\"canteen\"](around:{r10},{lat},{lon});node[\"amenity\"=\"cafe\"](around:{r5},{lat},{lon}););out body 40;",
            base + f"(node[\"shop\"=\"food\"](around:{r5},{lat},{lon});node[\"takeaway\"=\"yes\"](around:{r5},{lat},{lon}););out body 30;",
        ]
    elif biz_type == "catering":
        queries = [
            base + f"(node[\"catering\"](around:{r10},{lat},{lon});node[\"amenity\"=\"catering\"](around:{r10},{lat},{lon}););out body 40;",
            base + f"(node[\"amenity\"=\"restaurant\"](around:{r10},{lat},{lon});way[\"amenity\"=\"restaurant\"](around:{r10},{lat},{lon}););out body 60;",
        ]
    elif biz_type == "hotel":
        queries = [
            base + f"(node[\"tourism\"=\"hotel\"](around:{r10},{lat},{lon});way[\"tourism\"=\"hotel\"](around:{r10},{lat},{lon}););out body 60;",
            base + f"(node[\"tourism\"=\"guest_house\"](around:{r10},{lat},{lon});node[\"amenity\"=\"hotel\"](around:{r10},{lat},{lon}););out body 40;",
            base + f"(node[\"tourism\"=\"hostel\"](around:{r10},{lat},{lon});node[\"building\"=\"hotel\"](around:{r10},{lat},{lon}););out body 30;",
        ]
    elif biz_type == "bakery":
        queries = [
            base + f"(node[\"shop\"=\"bakery\"](around:{r10},{lat},{lon});way[\"shop\"=\"bakery\"](around:{r10},{lat},{lon}););out body 60;",
            base + f"(node[\"amenity\"=\"bakery\"](around:{r10},{lat},{lon});node[\"shop\"=\"confectionery\"](around:{r10},{lat},{lon}););out body 40;",
        ]
    else:  # food / all
        queries = [
            base + f"(node[\"amenity\"=\"restaurant\"](around:{r5},{lat},{lon});way[\"amenity\"=\"restaurant\"](around:{r5},{lat},{lon}););out body 50;",
            base + f"(node[\"amenity\"=\"fast_food\"](around:{r5},{lat},{lon});node[\"amenity\"=\"cafe\"](around:{r5},{lat},{lon}););out body 50;",
            base + f"(node[\"tourism\"=\"hotel\"](around:{r5},{lat},{lon});way[\"tourism\"=\"hotel\"](around:{r5},{lat},{lon}););out body 30;",
            base + f"(node[\"shop\"=\"bakery\"](around:{r5},{lat},{lon});node[\"amenity\"=\"canteen\"](around:{r5},{lat},{lon}););out body 30;",
        ]

    return queries


def fetch_all_parallel(queries: list) -> list:
    """Run all queries in parallel threads."""
    results = []
    lock = threading.Lock()
    threads = []

    for q in queries:
        t = threading.Thread(target=run_overpass_query, args=(q, results, lock))
        t.daemon = True
        threads.append(t)
        t.start()

    for t in threads:
        t.join(timeout=22)

    return results


def parse_results(elements: list, area: str) -> list:
    """Deduplicate and format results."""
    seen = set()
    results = []

    for e in elements:
        tags = e.get("tags", {})
        name = (tags.get("name") or tags.get("name:en") or "").strip()
        if not name or name.lower() in seen or len(name) < 2:
            continue
        seen.add(name.lower())

        # Get phone - try multiple tag formats
        phone = (
            tags.get("phone") or
            tags.get("contact:phone") or
            tags.get("phone:IN") or
            tags.get("mobile") or
            tags.get("contact:mobile") or
            ""
        ).strip()

        # Clean phone number
        if phone:
            phone = phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
            if phone.startswith("+91"):
                phone = phone[3:]
            elif phone.startswith("91") and len(phone) == 12:
                phone = phone[2:]

        # Get address
        street = tags.get("addr:street", "")
        housenumber = tags.get("addr:housenumber", "")
        suburb = tags.get("addr:suburb", "") or tags.get("addr:city", "")
        address_parts = [p for p in [housenumber, street, suburb] if p]
        address = ", ".join(address_parts) if address_parts else area

        biz_type = (
            tags.get("amenity") or
            tags.get("shop") or
            tags.get("tourism") or
            tags.get("cuisine") or
            "food"
        )

        results.append({
            "name": name,
            "phone": phone,
            "address": address,
            "type": biz_type,
            "lat": e.get("lat") or e.get("center", {}).get("lat"),
            "lon": e.get("lon") or e.get("center", {}).get("lon"),
            "website": tags.get("website") or tags.get("contact:website") or "",
        })

    return results


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

    def do_OPTIONS(self): self._send(200, {})

    def do_GET(self):
        from urllib.parse import urlparse, parse_qs
        parsed = urlparse(self.path)
        qs = parse_qs(parsed.query)
        area = (qs.get("area", ["T Nagar Chennai"])[0]).strip()
        biz_type = (qs.get("type", ["food"])[0]).strip()

        try:
            lat, lon = geocode(area)
            if lat is None:
                self._send(404, {"error": "Area not found. Try: T Nagar Chennai, Anna Nagar Chennai, Adyar Chennai etc."})
                return

            queries = build_queries(lat, lon, biz_type)
            elements = fetch_all_parallel(queries)
            results = parse_results(elements, area)

            # Sort: ones with phone first
            results.sort(key=lambda x: (0 if x["phone"] else 1, x["name"]))

            self._send(200, {
                "results": results[:60],
                "area": area,
                "count": len(results),
                "total_raw": len(elements),
            })

        except Exception as exc:
            import traceback
            self._send(500, {"error": str(exc), "trace": traceback.format_exc()})

    def log_message(self, *_): pass
