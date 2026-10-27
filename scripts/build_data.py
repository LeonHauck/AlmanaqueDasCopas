"""Gera os arquivos JSON do site a partir dos dados brutos em data-raw/.

Fontes:
  - Fjelstul World Cup Database (1930-2022), CC-BY-SA 4.0 - https://github.com/jfjelstul/worldcup
  - openfootball/worldcup.json (2026), domínio público - https://github.com/openfootball/worldcup.json

Uso:  python scripts/build_data.py
"""
import csv
import difflib
import json
import re
import unicodedata
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

from names_pt import (AWARDS, CANONICAL, COUNTRIES, HOSTS_2026, NEW_2026, OF_ALIASES, POSITIONS, STAGES,
                      STORIES, TEAMS)

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data-raw"
OUT = ROOT / "data"
MEN = "Men's"


# ---------------------------------------------------------------- utilidades
def read(name):
    with open(RAW / f"{name}.csv", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    if rows and "tournament_name" in rows[0]:
        rows = [r for r in rows if MEN in r["tournament_name"]]
    return rows


def year_of(tid):
    return int(tid.split("-")[1])


def person(given, family):
    return family if given in ("not applicable", "") else f"{given} {family}"


_SPECIAL = str.maketrans({"ø": "o", "Ø": "o", "æ": "ae", "ß": "ss", "ł": "l", "Ł": "l", "đ": "d", "ı": "i",
                          "’": "", "'": "", "-": " "})


def norm(s):
    s = unicodedata.normalize("NFKD", s.translate(_SPECIAL))
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    return " ".join(re.sub(r"[^a-z0-9 ]", " ", s).split())


def pt_team(name):
    return TEAMS[name][0]


def flag_of(name):
    return TEAMS[name][1]


def minute_label(reg, stop):
    reg, stop = int(reg), int(stop or 0)
    return f"{reg}+{stop}'" if stop else f"{reg}'"


def parse_of_minute(m):
    m = str(m)
    if "+" in m:
        a, b = m.split("+")
        return int(a), int(b)
    return int(m), 0


def age_days(birth, on):
    try:
        b = date.fromisoformat(birth)
        d = date.fromisoformat(on)
    except (ValueError, TypeError):
        return None
    return (d - b).days


def age_txt(days):
    y = int(days // 365.2425)
    rest = days - int(y * 365.2425)
    return f"{y} anos e {rest} dias"


def parse_coord(s):
    vals = []
    for part in s.split():
        m = re.match(r"([\d.]+)°(?:(\d+)')?(?:(\d+)\")?([NSEW])", part)
        if not m:
            return None
        v = float(m.group(1)) + float(m.group(2) or 0) / 60 + float(m.group(3) or 0) / 3600
        vals.append(-v if m.group(4) in "SW" else v)
    return [round(vals[0], 5), round(vals[1], 5)]


# ------------------------------------------------------- base Fjelstul (até 2022)
teams_csv = read("teams")
TEAM_BY_ID = {r["team_id"]: r for r in teams_csv}
CODE_BY_NAME = {r["team_name"]: r["team_code"] for r in teams_csv}
CONF = {r["team_code"]: r["confederation_code"] for r in teams_csv}

players_csv = {r["player_id"]: r for r in read("players") if r["female"] == "0"}
tournaments = [r for r in read("tournaments")]
stadiums_csv = {r["stadium_id"]: r for r in read("stadiums")}
coords = json.load(open(RAW / "coords.json", encoding="utf-8"))

# estruturas comuns às duas fontes
editions = {}          # ano -> dict
matches = []           # lista de jogos (todas as edições)
match_by_id = {}
stadiums = {}          # id -> dict
player_info = {}       # pid -> {n, b, p}
team_names = {}        # código -> nome canônico em inglês
hist_name = {}         # (ano, código) -> nome em inglês daquela época
groups = defaultdict(lambda: defaultdict(list))  # ano -> grupo -> linhas
standings = defaultdict(dict)  # ano -> posição -> código
awards = defaultdict(lambda: defaultdict(list))  # ano -> prêmio -> [pid, nome, código]
coach = {}


def ensure_stadium(sid, name, city, country, cap, latlon, precise):
    if sid not in stadiums:
        stadiums[sid] = {"id": sid, "n": name, "city": city, "country": COUNTRIES.get(country, country),
                         "cap": cap, "ll": latlon, "precise": precise, "years": set(), "games": 0, "finals": []}
    return stadiums[sid]


for t in tournaments:
    y = int(t["year"])
    editions[y] = {"y": y, "start": t["start_date"], "end": t["end_date"], "nt": int(t["count_teams"]),
                   "hosts": [], "story": STORIES[y]}

for r in read("host_countries"):
    y = year_of(r["tournament_id"])
    editions[y]["hosts"].append([COUNTRIES.get(r["team_name"], r["team_name"]), flag_of(r["team_name"])])

for r in teams_csv:
    team_names.setdefault(r["team_code"], CANONICAL.get(r["team_code"], r["team_name"]))

for p in players_csv.values():
    pos = next((c for c, k in (("GK", "goal_keeper"), ("DF", "defender"), ("MF", "midfielder"), ("FW", "forward"))
                if p[k] == "1"), None)
    player_info[p["player_id"]] = {"n": person(p["given_name"], p["family_name"]),
                                   "b": p["birth_date"] if p["birth_date"] != "not available" else None, "p": pos}

for r in read("matches"):
    y = year_of(r["tournament_id"])
    for side in ("home", "away"):
        hist_name[(y, r[f"{side}_team_code"])] = r[f"{side}_team_name"]
    s = stadiums_csv[r["stadium_id"]]
    c = coords.get(r["stadium_id"], {})
    st = ensure_stadium(r["stadium_id"], s["stadium_name"], s["city_name"], s["country_name"],
                        int(s["stadium_capacity"] or 0), c.get("coords"), c.get("precise", False))
    m = {"id": r["match_id"], "y": y, "d": r["match_date"], "t": r["match_time"], "st": r["stage_name"],
         "g": None if r["group_name"] == "not applicable" else r["group_name"].replace("Group", "Grupo"),
         "sid": st["id"], "h": r["home_team_code"], "a": r["away_team_code"],
         "hs": int(r["home_team_score"]), "as": int(r["away_team_score"]),
         "et": r["extra_time"] == "1",
         "ps": [int(r["home_team_score_penalties"]), int(r["away_team_score_penalties"])]
         if r["penalty_shootout"] == "1" else None,
         "rep": r["replay"] == "1", "goals": [], "cards": [], "pens": [], "lu": {"h": [], "a": []}}
    matches.append(m)
    match_by_id[m["id"]] = m

for r in read("goals"):
    m = match_by_id[r["match_id"]]
    side = "h" if r["home_team"] == "1" else "a"
    m["goals"].append({"s": side, "pid": r["player_id"], "n": person(r["given_name"], r["family_name"]),
                       "min": minute_label(r["minute_regulation"], r["minute_stoppage"]),
                       "mr": int(r["minute_regulation"]), "ms": int(r["minute_stoppage"] or 0),
                       "pen": r["penalty"] == "1", "og": r["own_goal"] == "1",
                       "c": r["player_team_code"]})

for r in read("bookings"):
    m = match_by_id[r["match_id"]]
    kind = "YR" if r["second_yellow_card"] == "1" else ("R" if r["red_card"] == "1" else "Y")
    m["cards"].append({"s": "h" if r["home_team"] == "1" else "a", "pid": r["player_id"],
                       "n": person(r["given_name"], r["family_name"]),
                       "min": minute_label(r["minute_regulation"], r["minute_stoppage"]), "k": kind})

for r in read("penalty_kicks"):
    m = match_by_id[r["match_id"]]
    m["pens"].append({"s": "h" if r["home_team"] == "1" else "a", "n": person(r["given_name"], r["family_name"]),
                      "ok": r["converted"] == "1"})

sub_on = {}
for r in read("substitutions"):
    if r["coming_on"] == "1":
        sub_on[(r["match_id"], r["player_id"])] = minute_label(r["minute_regulation"], r["minute_stoppage"])

for r in read("player_appearances"):
    m = match_by_id[r["match_id"]]
    m["lu"]["h" if r["home_team"] == "1" else "a"].append({
        "pid": r["player_id"], "n": person(r["given_name"], r["family_name"]),
        "no": int(r["shirt_number"] or 0), "pos": r["position_code"], "st": r["starter"] == "1",
        "on": sub_on.get((r["match_id"], r["player_id"]))})

for r in read("group_standings"):
    y = year_of(r["tournament_id"])
    key = ("2ª fase · " if r["stage_name"] == "second group stage" else "") + \
          ("Quadrangular final" if r["stage_name"] == "final round" else r["group_name"].replace("Group", "Grupo"))
    groups[y][key].append({"c": r["team_code"], "pl": int(r["played"]), "w": int(r["wins"]), "d": int(r["draws"]),
                           "l": int(r["losses"]), "gf": int(r["goals_for"]), "ga": int(r["goals_against"]),
                           "pts": int(r["points"]), "adv": r["advanced"] == "1"})

for r in read("tournament_standings"):
    standings[year_of(r["tournament_id"])][int(r["position"])] = r["team_code"]

for r in read("award_winners"):
    key = AWARDS[r["award_name"]][0]
    awards[year_of(r["tournament_id"])][key].append([r["player_id"], person(r["given_name"], r["family_name"]),
                                                     r["team_code"]])

for r in read("manager_appointments"):
    y = year_of(r["tournament_id"])
    if standings[y].get(1) == r["team_code"]:
        coach.setdefault(y, []).append(person(r["given_name"], r["family_name"]))

# --------------------------------------------------------------- Copa de 2026
OF = RAW / "wc2026"
full = json.load(open(OF / "worldcup-full.json", encoding="utf-8"))["matches"]
simple = json.load(open(OF / "worldcup.json", encoding="utf-8"))["matches"]
squads26 = json.load(open(OF / "worldcup.squads.json", encoding="utf-8"))
st26 = json.load(open(OF / "stadiums.json", encoding="utf-8"))["stadiums"]
Y26 = 2026


def of_team(name):
    name = OF_ALIASES.get(name, name)
    if name in NEW_2026:
        code, conf = NEW_2026[name]
        CONF[code] = conf
        team_names[code] = name
    elif name == "DR Congo":
        code = "COD"
    else:
        code = CODE_BY_NAME[name]
    hist_name[(Y26, code)] = name
    return code


editions[Y26] = {"y": Y26, "start": "2026-06-11", "end": "2026-07-19", "nt": 48, "story": STORIES[Y26],
                 "hosts": [[COUNTRIES[h], flag_of(h)] for h in HOSTS_2026]}

# elenco de cada seleção, ligando cada jogador à base Fjelstul quando ele já jogou Copas
fj_by_birth = defaultdict(list)
for pid, p in player_info.items():
    if p["b"]:
        fj_by_birth[p["b"]].append(pid)
fj_teams = defaultdict(set)
for r in read("squads"):
    fj_teams[r["player_id"]].add(r["team_code"])

squad = {}   # código -> lista de jogadores
new_id = 0
linked = 0
for t in squads26:
    code = of_team(t["name"])
    lst = []
    for p in t["players"]:
        pid = None
        for cand in fj_by_birth.get(p.get("date_of_birth"), []):
            if code in fj_teams[cand]:
                pid = cand
        if pid:
            linked += 1
        else:
            new_id += 1
            pid = f"P26-{new_id:04d}"
            player_info[pid] = {"n": p["name"], "b": p.get("date_of_birth"), "p": p["pos"]}
        lst.append({"pid": pid, "n": p["name"], "no": p["number"], "pos": p["pos"], "k": norm(p["name"]),
                    "tok": set(norm(p["name"]).split())})
    squad[code] = lst

unmatched = []
NICKNAMES = {"PICO LOPES": "Roberto Lopes"}


def find_player(code, raw_name):
    """Acha o jogador do elenco a partir do nome no formato FIFA ('Lionel MESSI', 'RODRI')."""
    k = norm(NICKNAMES.get(raw_name, raw_name))
    tok = set(k.split())
    cands = squad[code]
    kc = k.replace(" ", "")
    for test in (lambda p: p["k"] == k, lambda p: p["tok"] == tok, lambda p: p["k"].replace(" ", "") == kc,
                 lambda p: tok <= p["tok"] or p["tok"] <= tok,
                 lambda p: k.split()[-1] in p["tok"],
                 # apelido no primeiro nome: "Maxi ARAUJO" = "Maximiliano Araújo"
                 lambda p: k.split()[-1] == p["k"].split()[-1] and p["k"].startswith(k.split()[0])):
        hit = [p for p in cands if test(p)]
        if len(hit) == 1:
            return hit[0]
    # grafias diferentes (Ruediger/Rüdiger, Hajisafi/Hajsafi): usa a mais parecida
    best = max(cands, key=lambda p: difflib.SequenceMatcher(None, p["k"].replace(" ", ""), kc).ratio())
    if difflib.SequenceMatcher(None, best["k"].replace(" ", ""), kc).ratio() >= 0.75:
        return best
    # jogador fora da lista de elenco (ex.: convocado substituto): cria o registro
    global new_id
    new_id += 1
    name = " ".join(w.capitalize() if w.isupper() else w for w in raw_name.split())
    p = {"pid": f"P26-{new_id:04d}", "n": name, "no": 0, "pos": None, "k": k, "tok": tok}
    player_info[p["pid"]] = {"n": name, "b": None, "p": None}
    squad[code].append(p)
    unmatched.append((code, raw_name))
    return p


ground_city = {}
for s in st26:
    ground_city[s["city"]] = s
fj_azteca = next(sid for sid, s in stadiums_csv.items() if "Azteca" in s["stadium_name"])
CC = {"us": "United States", "ca": "Canada", "mx": "Mexico"}


def stadium_26(ground):
    city = ground.split(", ")[-1]
    s = next(v for k, v in ground_city.items() if city.split()[0] in k and (city in k or city.split()[-1] in k))
    if s["city"] == "Mexico City":
        sid = fj_azteca
        st = stadiums[sid]
        st["n"] = "Estadio Azteca"
        return sid
    sid = "S26-" + norm(s["city"]).split()[0][:6].upper()
    ensure_stadium(sid, s["name"], s["city"].split(" (")[0], CC[s["cc"]], s["capacity"],
                   parse_coord(s["coords"]), True)
    return sid


STAGE26 = {"Round of 32": "round of 32", "Round of 16": "round of 16", "Quarter-final": "quarter-finals",
           "Semi-final": "semi-finals", "Bronze final": "third-place match", "Final": "final"}
simple_goals = {(x["date"], of_team(x["team1"]), of_team(x["team2"])): x for x in simple}
full.sort(key=lambda x: (x["date"], x["time"]))
attendance26 = 0

for i, x in enumerate(full, 1):
    h, a = of_team(x["team1"]), of_team(x["team2"])
    sc = x["score"]
    fin = sc.get("et", sc["ft"])
    rnd = x["round"]
    stage = "group stage" if rnd.startswith("First Stage") else STAGE26[rnd]
    m = {"id": f"M-2026-{i:03d}", "y": Y26, "d": x["date"], "t": x["time"].split()[0], "st": stage,
         "g": ("Grupo " + rnd.split()[-1]) if stage == "group stage" else None, "sid": stadium_26(x["ground"]),
         "h": h, "a": a, "hs": fin[0], "as": fin[1], "et": "et" in sc, "ps": sc.get("p"), "rep": False,
         "att": x.get("attendance"), "goals": [], "cards": [], "pens": [], "lu": {"h": [], "a": []}}
    attendance26 += x.get("attendance") or 0
    # confere o placar com a versão "simples" do openfootball
    s = simple_goals[(x["date"], h, a)]
    assert len(s.get("goals1", [])) == len(x.get("goals1", [])) and len(s.get("goals2", [])) == len(x.get("goals2", []))
    for side, key, own, other in (("h", "goals1", h, a), ("a", "goals2", a, h)):
        for gl in x.get(key, []):
            team_of_player = other if gl.get("owngoal") else own
            p = find_player(team_of_player, gl["name"])
            mr, ms = parse_of_minute(gl["minute"])
            m["goals"].append({"s": side, "pid": p["pid"] if p else None, "n": p["n"] if p else gl["name"],
                               "min": minute_label(mr, ms), "mr": mr, "ms": ms, "pen": bool(gl.get("penalty")),
                               "og": bool(gl.get("owngoal")), "c": team_of_player})
    for side, code, lu in zip(("h", "a"), (h, a), x["lineup"]):
        ons = {sub["on"]: sub["minute"] for sub in lu.get("subs", [])}
        for pl, starter in [(p, True) for p in lu["starter"]] + [(p, False) for p in lu["bench"]]:
            if not starter and pl["name"] not in ons:
                continue
            p = find_player(code, pl["name"])
            if not p:
                continue
            on = None
            if not starter:
                mr, ms = parse_of_minute(ons[pl["name"]])
                on = minute_label(mr, ms)
            m["lu"][side].append({"pid": p["pid"], "n": p["n"], "no": p["no"], "pos": p["pos"], "st": starter,
                                  "on": on})
    for side, code, lst in zip(("h", "a"), (h, a), x.get("bookings") or [[], []]):
        for b in lst:
            p = find_player(code, b["name"])
            mr, ms = parse_of_minute(b["minute"])
            m["cards"].append({"s": side, "pid": p["pid"] if p else None, "n": p["n"] if p else b["name"],
                               "min": minute_label(mr, ms), "k": {"Y": "Y", "R": "R", "Y/R": "YR"}[b["type"]]})
    for pk in x.get("penalties", []):
        hp = find_player(h, pk["name"]) if any(norm(pk["name"]).split()[-1] in q["tok"] for q in squad[h]) else None
        side = "h" if hp else "a"
        p = hp or find_player(a, pk["name"])
        m["pens"].append({"s": side, "n": p["n"] if p else pk["name"], "ok": pk.get("note") != "missed"})
    matches.append(m)
    match_by_id[m["id"]] = m

editions[Y26]["att"] = attendance26
coach[Y26] = ["Luis de la Fuente"]  # técnico campeão (não vem nos arquivos do openfootball)

# classificação final e grupos de 2026 (calculados a partir dos jogos)
g26 = [m for m in matches if m["y"] == Y26]
final26 = next(m for m in g26 if m["st"] == "final")
third26 = next(m for m in g26 if m["st"] == "third-place match")


def winner(m):
    if m["hs"] != m["as"]:
        return (m["h"], m["a"]) if m["hs"] > m["as"] else (m["a"], m["h"])
    return (m["h"], m["a"]) if m["ps"][0] > m["ps"][1] else (m["a"], m["h"])


standings[Y26][1], standings[Y26][2] = winner(final26)
standings[Y26][3], standings[Y26][4] = winner(third26)
ko_teams = {c for m in g26 if m["st"] == "round of 32" for c in (m["h"], m["a"])}
tab = defaultdict(lambda: defaultdict(lambda: {"pl": 0, "w": 0, "d": 0, "l": 0, "gf": 0, "ga": 0, "pts": 0}))
for m in g26:
    if m["st"] != "group stage":
        continue
    for me, op, gf, ga in ((m["h"], m["a"], m["hs"], m["as"]), (m["a"], m["h"], m["as"], m["hs"])):
        r = tab[m["g"]][me]
        r["pl"] += 1
        r["gf"] += gf
        r["ga"] += ga
        res = "w" if gf > ga else ("d" if gf == ga else "l")
        r[res] += 1
        r["pts"] += {"w": 3, "d": 1, "l": 0}[res]
for g in sorted(tab):
    rows = sorted(tab[g].items(), key=lambda kv: (-kv[1]["pts"], -(kv[1]["gf"] - kv[1]["ga"]), -kv[1]["gf"]))
    groups[Y26][g] = [{"c": c, **v, "adv": c in ko_teams} for c, v in rows]


def p26(name, code):
    p = find_player(code, name)
    return [p["pid"], p["n"], code]


esp, arg, fra, eng = (CODE_BY_NAME[n] for n in ("Spain", "Argentina", "France", "England"))
awards[Y26] = {"bola_ouro": [p26("Rodri", esp)], "bola_prata": [p26("Lionel Messi", arg)],
               "bola_bronze": [p26("Kylian Mbappé", fra)], "chuteira_ouro": [p26("Kylian Mbappé", fra)],
               "chuteira_prata": [p26("Lionel Messi", arg)], "chuteira_bronze": [p26("Jude Bellingham", eng)],
               "luva_ouro": [p26("Unai Simón", esp)], "jovem": [p26("Pau Cubarsí", esp)]}

if unmatched:
    u = sorted(set(unmatched))
    print(f"AVISO - {len(u)} nomes de 2026 sem correspondência no elenco:")
    for code, n in u:
        print("   ", code, n, "->", [p["n"] for p in squad[code] if set(norm(n).split()) & p["tok"]])
print(f"2026: {linked} jogadores ligados à base histórica, {new_id} estreantes")

# -------------------------------------------------------------- agregações
YEARS = sorted(editions)


def tname(code, y=None):
    eng_name = hist_name.get((y, code)) if y else None
    return pt_team(eng_name or team_names[code])


def tflag(code, y=None):
    eng_name = hist_name.get((y, code)) if y else None
    return flag_of(eng_name or team_names[code])


for m in matches:
    st = stadiums[m["sid"]]
    st["years"].add(m["y"])
    st["games"] += 1
    if m["st"] == "final" or (m["y"] == 1950 and m["id"] == "M-1950-22"):
        st["finals"].append(m["y"])

# por seleção
team = defaultdict(lambda: {"p": 0, "w": 0, "d": 0, "l": 0, "gf": 0, "ga": 0, "years": {}, "pso_w": 0, "pso_l": 0})
reach = defaultdict(int)  # (ano, código) -> maior peso de fase
team_y = defaultdict(lambda: [0, 0, 0, 0, 0, 0])  # (ano, código) -> J V E D GP GC
for m in matches:
    for me, op, gf, ga, side in ((m["h"], m["a"], m["hs"], m["as"], 0), (m["a"], m["h"], m["as"], m["hs"], 1)):
        t = team[me]
        t["p"] += 1
        t["gf"] += gf
        t["ga"] += ga
        res = "w" if gf > ga else ("d" if gf == ga else "l")
        t[res] += 1
        ty = team_y[(m["y"], me)]
        ty[0] += 1
        ty[{"w": 1, "d": 2, "l": 3}[res]] += 1
        ty[4] += gf
        ty[5] += ga
        if m["ps"]:
            won = m["ps"][side] > m["ps"][1 - side]
            t["pso_w" if won else "pso_l"] += 1
        reach[(m["y"], me)] = max(reach[(m["y"], me)], STAGES[m["st"]][2])

PLACE = {1: ("Campeão", 100), 2: ("Vice-campeão", 90), 3: ("3º lugar", 80), 4: ("4º lugar", 70)}
WEIGHT_LABEL = {v[2]: v[0] for v in STAGES.values() if v[2]}
result = {}
for (y, c), w in reach.items():
    pos = next((p for p, cc in standings[y].items() if cc == c), None)
    label, weight = PLACE[pos] if pos else (WEIGHT_LABEL[w], w)
    result[(y, c)] = (label, weight)
    team[c]["years"][y] = [label, weight]

# artilharia e jogadores
pl = defaultdict(lambda: {"apps": 0, "goals": 0, "pens": 0, "ed": defaultdict(lambda: [0, 0]), "teams": [],
                          "cards": [0, 0], "ey": {}})
for m in matches:
    for side in ("h", "a"):
        code = m[side]
        for p in m["lu"][side]:
            r = pl[p["pid"]]
            r["apps"] += 1
            r["ed"][m["y"]][0] += 1
            r["ey"][m["y"]] = code
            if code not in r["teams"]:
                r["teams"].append(code)
    for g in m["goals"]:
        if g["og"] or not g["pid"]:
            continue
        r = pl[g["pid"]]
        r["goals"] += 1
        r["pens"] += g["pen"]
        r["ed"][m["y"]][1] += 1
        r["ey"].setdefault(m["y"], g["c"])
        if g["c"] not in r["teams"]:
            r["teams"].append(g["c"])
    for cd in m["cards"]:
        if cd["pid"]:
            r = pl[cd["pid"]]
            r["cards"][0 if cd["k"] == "Y" else 1] += 1
            if m[cd["s"]] not in r["teams"]:
                r["teams"].append(m[cd["s"]])

players_out = {}
for pid, r in pl.items():
    info = player_info.get(pid, {"n": "?", "b": None, "p": None})
    players_out[pid] = {"n": info["n"], "b": info["b"], "p": info["p"], "t": r["teams"], "j": r["apps"],
                        "g": r["goals"], "gp": r["pens"], "ca": r["cards"],
                        "e": {y: v for y, v in sorted(r["ed"].items())}}
    if len(r["teams"]) > 1:
        players_out[pid]["ey"] = r["ey"]

scorers = sorted(([pid, p["n"], p["t"][-1], p["g"], p["gp"], len([1 for v in p["e"].values() if v[1]]),
                   {y: v[1] for y, v in p["e"].items() if v[1]}]
                  for pid, p in players_out.items() if p["g"]), key=lambda x: (-x[3], x[1]))

# por edição
ed_out = []
team_scorers = defaultdict(Counter)
for s in scorers:
    pass
for m in matches:
    for g in m["goals"]:
        if not g["og"] and g["pid"]:
            team_scorers[g["c"]][g["pid"]] += 1

for y in YEARS:
    e = editions[y]
    ms = [m for m in matches if m["y"] == y]
    goals = sum(m["hs"] + m["as"] for m in ms)
    fin = [m for m in ms if m["st"] == "final"] or [match_by_id["M-1950-22"]]
    fm = fin[-1]
    ed_sc = Counter()
    for m in ms:
        for g in m["goals"]:
            if not g["og"] and g["pid"]:
                ed_sc[(g["pid"], g["c"])] += 1
    top = [[pid, players_out[pid]["n"], c, n] for (pid, c), n in sorted(ed_sc.items(), key=lambda kv: (-kv[1],
                                                                       players_out[kv[0][0]]["n"]))[:10]]
    e.update({
        "champ": standings[y][1], "ru": standings[y].get(2), "third": standings[y].get(3),
        "fourth": standings[y].get(4),
        "final": {"id": fm["id"], "h": fm["h"], "a": fm["a"], "hs": fm["hs"], "as": fm["as"], "et": fm["et"],
                  "ps": fm["ps"], "sid": fm["sid"], "d": fm["d"], "fr": y == 1950},
        "nm": len(ms), "ng": goals, "avg": round(goals / len(ms), 2), "top": top,
        "aw": awards.get(y, {}), "coach": coach.get(y, []),
        "nst": len({m["sid"] for m in ms}), "ncity": len({stadiums[m["sid"]]["city"] for m in ms}),
        "red": sum(1 for m in ms for c in m["cards"] if c["k"] != "Y"),
        "yel": sum(1 for m in ms for c in m["cards"] if c["k"] == "Y"),
        "pso": sum(1 for m in ms if m["ps"]),
        "names": {c: [tname(c, y), tflag(c, y)] for c in {x for m in ms for x in (m["h"], m["a"])}},
    })
    ed_out.append(e)

# --------------------------------------------------------------- recordes
recs = {}


def mrow(m):
    return {"id": m["id"], "y": m["y"], "h": m["h"], "a": m["a"], "hs": m["hs"], "as": m["as"],
            "et": m["et"], "ps": m["ps"], "st": STAGES[m["st"]][0]}


recs["goleadas"] = [mrow(m) for m in sorted(matches, key=lambda m: (-abs(m["hs"] - m["as"]), -(m["hs"] + m["as"]),
                                                                     m["d"]))[:12]]
recs["mais_gols_jogo"] = [mrow(m) for m in sorted(matches, key=lambda m: (-(m["hs"] + m["as"]), m["d"]))[:12]]

hat = []
for m in matches:
    c = Counter((g["pid"], g["c"]) for g in m["goals"] if not g["og"] and g["pid"])
    for (pid, code), n in c.items():
        if n >= 3:
            hat.append({"pid": pid, "n": players_out[pid]["n"], "c": code, "g": n, "m": mrow(m)})
recs["hattricks"] = sorted(hat, key=lambda h: (-h["g"], h["m"]["y"]))

single = sorted(([pid, p["n"], code_y[0], y, v[1]] for pid, p in players_out.items()
                 for y, v in p["e"].items() for code_y in [[c for c in p["t"]] or ["?"]] if v[1] >= 6),
                key=lambda r: (-r[4], r[3]))
# corrige a seleção do jogador naquela edição
ed_team = {}
for m in matches:
    for side in ("h", "a"):
        for p in m["lu"][side]:
            ed_team[(p["pid"], m["y"])] = m[side]
    for g in m["goals"]:
        if g["pid"] and not g["og"]:
            ed_team.setdefault((g["pid"], m["y"]), g["c"])
recs["mais_gols_edicao"] = [[pid, n, ed_team.get((pid, y), c), y, g] for pid, n, c, y, g in single][:15]
recs["mais_jogos"] = sorted(([pid, p["n"], p["t"][-1], p["j"], len(p["e"])] for pid, p in players_out.items()),
                            key=lambda r: (-r[3], r[1]))[:20]
recs["mais_copas"] = sorted(([pid, p["n"], p["t"][-1], len(p["e"]), sorted(p["e"])] for pid, p in
                             players_out.items() if len(p["e"]) >= 5), key=lambda r: (-r[3], r[1]))

ages_goal, ages_play = [], []
for m in matches:
    seen = set()
    for g in m["goals"]:
        if g["og"] or not g["pid"] or g["pid"] in seen:
            continue
        seen.add(g["pid"])
        days = age_days(player_info.get(g["pid"], {}).get("b"), m["d"])
        if days:
            ages_goal.append((days, g["pid"], g["c"], m))
    for side in ("h", "a"):
        for p in m["lu"][side]:
            days = age_days(player_info.get(p["pid"], {}).get("b"), m["d"])
            if days and days > 5000:
                ages_play.append((days, p["pid"], m[side], m))


def age_list(lst, reverse):
    out, seen = [], set()
    for days, pid, code, m in sorted(lst, key=lambda r: r[0], reverse=reverse):
        if pid in seen:
            continue
        seen.add(pid)
        out.append({"pid": pid, "n": players_out[pid]["n"], "c": code, "age": age_txt(days), "m": mrow(m)})
        if len(out) == 8:
            break
    return out


recs["jovem_gol"] = age_list(ages_goal, False)
recs["velho_gol"] = age_list(ages_goal, True)
recs["jovem_jogo"] = age_list(ages_play, False)
recs["velho_jogo"] = age_list(ages_play, True)

fast = [(g["mr"], g, m) for m in matches for g in m["goals"] if g["mr"] <= 1 and not g["og"]]
recs["gols_rapidos"] = [{"pid": g["pid"], "n": g["n"], "c": g["c"], "min": g["min"], "m": mrow(m)}
                        for _, g, m in sorted(fast, key=lambda r: r[2]["d"])]

recs["por_edicao"] = [[e["y"], e["ng"], e["nm"], e["avg"], e["red"], e["nt"]] for e in ed_out]
recs["ataques"] = sorted(([y, c, sum(m["hs"] if m["h"] == c else m["as"] for m in matches
                                     if m["y"] == y and c in (m["h"], m["a"]))]
                          for (y, c) in reach), key=lambda r: (-r[2], r[0]))[:12]
recs["penaltis"] = sorted(([c, t["pso_w"], t["pso_l"]] for c, t in team.items() if t["pso_w"] + t["pso_l"]),
                          key=lambda r: (-(r[1] + r[2]), -r[1]))
recs["cartoes_jogo"] = [dict(mrow(m), red=sum(1 for c in m["cards"] if c["k"] != "Y"),
                             yel=sum(1 for c in m["cards"] if c["k"] == "Y"))
                        for m in sorted(matches, key=lambda m: (-sum(1 for c in m["cards"] if c["k"] != "Y"),
                                                                 -len(m["cards"])))[:8]]
recs["anfitrioes"] = []
for e in ed_out:
    for hname, _ in e["hosts"]:
        code = next((c for (y, c), lab in result.items() if y == e["y"] and tname(c, y) == hname), None)
        if code:
            recs["anfitrioes"].append([e["y"], code, result[(e["y"], code)][0]])
conf_titles = Counter(CONF[e["champ"]] for e in ed_out)
recs["titulos_conf"] = conf_titles.most_common()

# ----------------------------------------------------------------- seleções
teams_out = {}
for code, t in team.items():
    yrs = t["years"]
    best = max(yrs.values(), key=lambda v: v[1])
    tops = [[pid, players_out[pid]["n"], n] for pid, n in team_scorers[code].most_common(10)]
    eng_name = team_names[code]
    teams_out[code] = {
        "n": pt_team(eng_name), "f": flag_of(eng_name), "conf": CONF.get(code, ""),
        "titles": [y for y in YEARS if standings[y].get(1) == code],
        "finals": [y for y in YEARS if code in (standings[y].get(1), standings[y].get(2)) and y != 1950] +
                  ([1950] if code in ("URY", "BRA") else []),
        "p": t["p"], "w": t["w"], "d": t["d"], "l": t["l"], "gf": t["gf"], "ga": t["ga"],
        "pso": [t["pso_w"], t["pso_l"]], "years": {y: [v[0], *team_y[(y, code)]] for y, v in sorted(yrs.items())},
        "best": best[0], "bw": best[1], "top": tops,
        "hist": sorted({pt_team(hist_name[(y, code)]) for y in yrs} - {pt_team(eng_name)}),
    }

# --------------------------------------------------------------- estádios
stad_out = sorted(({**s, "years": sorted(s["years"]), "finals": sorted(set(s["finals"]))}
                   for s in stadiums.values() if s["games"]), key=lambda s: (min(s["years"]), s["n"]))

# --------------------------------------------------------------- gravação
OUT.mkdir(exist_ok=True)
(OUT / "copas").mkdir(exist_ok=True)


def dump(path, obj):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))


totals = {"editions": len(ed_out), "matches": len(matches), "goals": sum(e["ng"] for e in ed_out),
          "teams": len(teams_out), "players": len(players_out), "stadiums": len(stad_out),
          "pens": sum(1 for m in matches for g in m["goals"] if g["pen"]),
          "og": sum(1 for m in matches for g in m["goals"] if g["og"]),
          "hat": len(recs["hattricks"]), "scorers": len(scorers)}

dump(OUT / "core.json", {
    "updated": date.today().isoformat(), "totals": totals,
    "editions": [{k: v for k, v in e.items()} for e in ed_out],
    "teams": teams_out, "scorers": scorers[:400],
    "stages": {k: v[0] for k, v in STAGES.items()}, "awards": {v[0]: v[1] for v in AWARDS.values()},
    "positions": POSITIONS,
})
dump(OUT / "scorers.json", scorers)
dump(OUT / "records.json", recs)
dump(OUT / "stadiums.json", stad_out)
dump(OUT / "players.json", players_out)

by_year = defaultdict(list)
for m in matches:
    by_year[m["y"]].append(m)
for y in YEARS:
    ms = by_year[y]
    for m in ms:
        m.pop("y", None)
        for g in m["goals"]:
            g.pop("mr", None)
            g.pop("ms", None)
    sids = {m["sid"] for m in ms}
    dump(OUT / "copas" / f"{y}.json", {"y": y, "matches": ms, "groups": groups.get(y, {}),
                                        "stadiums": [s for s in stad_out if s["id"] in sids]})

print("Totais:", totals)
print("Top 5 artilheiros:", [(s[1], s[3]) for s in scorers[:5]])
print("Títulos:", sorted(((len(t["titles"]), t["n"]) for t in teams_out.values() if t["titles"]), reverse=True))
for f in sorted(OUT.rglob("*.json")):
    print(f"  {f.relative_to(ROOT)}  {f.stat().st_size / 1024:.0f} KB")
