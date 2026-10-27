"""Busca coordenadas dos estádios (e cidades, como reserva) na API da Wikipédia.
Gera data-raw/coords.json. Só precisa rodar uma vez."""
import csv, json, time, urllib.parse, urllib.request
from pathlib import Path

RAW = Path(__file__).resolve().parent.parent / "data-raw"
API = "https://en.wikipedia.org/w/api.php"

def title_of(link):
    return urllib.parse.unquote(link.rsplit("/wiki/", 1)[-1]).replace("_", " ")

def fetch(titles):
    out = {}
    for i in range(0, len(titles), 50):
        chunk = titles[i:i + 50]
        q = urllib.parse.urlencode({"action": "query", "prop": "coordinates", "titles": "|".join(chunk),
                                    "redirects": 1, "format": "json", "colimit": "max"})
        req = urllib.request.Request(f"{API}?{q}", headers={"User-Agent": "ProjetoCopa/1.0 (educational)"})
        data = json.load(urllib.request.urlopen(req))["query"]
        alias = {}
        for k in ("normalized", "redirects"):
            for x in data.get(k, []):
                alias[x["to"]] = alias.get(x["from"], x["from"])
        for p in data["pages"].values():
            if "coordinates" in p:
                c = p["coordinates"][0]
                t = p["title"]
                orig = t
                while orig in alias:
                    orig = alias[orig]
                out[orig] = [round(c["lat"], 5), round(c["lon"], 5)]
                out[t] = out[orig]
        time.sleep(0.5)
    return out

rows = list(csv.DictReader(open(RAW / "stadiums.csv", encoding="utf-8")))
titles = sorted({title_of(r["stadium_wikipedia_link"]) for r in rows if r["stadium_wikipedia_link"]} |
                {title_of(r["city_wikipedia_link"]) for r in rows if r["city_wikipedia_link"]})
coords = fetch(titles)
res = {}
for r in rows:
    s = coords.get(title_of(r["stadium_wikipedia_link"])) if r["stadium_wikipedia_link"] else None
    c = coords.get(title_of(r["city_wikipedia_link"])) if r["city_wikipedia_link"] else None
    res[r["stadium_id"]] = {"coords": s or c, "precise": bool(s)}
json.dump(res, open(RAW / "coords.json", "w", encoding="utf-8"), indent=0)
print(len(res), "estádios;", sum(1 for v in res.values() if v["precise"]), "precisos;",
      sum(1 for v in res.values() if not v["coords"]), "sem coordenadas")
