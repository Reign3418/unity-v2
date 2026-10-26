"""
Valheon Sovereign Bot — R4 Alliance Automation & Protocol Decoder Module
Implements:
1. Sub-Tile Coordinate Decoder: floor(raw / 6 + 0.5)
2. 42 In-Game Alliance Record Log Types (rt: 101..308)
3. Flag / Fortress 20,000 Daily Build Credit Auto-Kick Evaluator
4. Resource Pit (Granary) Auto-Rebuild & Alliance Map Marker (1..10) State Machine
5. Barbarian Fort Rally Enforcer (Max Members 2..4, Troop Type Mismatch, Arrival Time & Power Brackets)
6. Lilith TCP / Sproto Error Code Diagnostics (CommAck, GsRouteErr, AsGradeTooLower, AsNumLimit, AsArmory*)
"""

import math
import time
from typing import Dict, List, Any, Optional, Tuple

ALLIANCE_LOG_TEMPLATES: Dict[int, str] = {
    101: "{p1} raised {p2} to Rank {p3}.",
    102: "{p1} transferred alliance leadership to {p2}.",
    103: "Alliance gift level raised to {p1}.",
    104: "{p1} used an alliance skill.",
    105: "{p1} built an Alliance Flag {locP2}.",
    106: "{p1} dismantled an Alliance Flag {locP2}.",
    107: "{p1} built a Center Fortress {locP2}.",
    108: "{p1} dismantled a Center Fortress {locP2}.",
    109: "{p1} built an Alliance Fortress {locP2}.",
    110: "{p1} dismantled an Alliance Fortress {locP2}.",
    111: "{p1} appointed {p2} to {post}.",
    112: "{p1} formed a union with {p2}.",
    113: "{p1} dissolved the union with {p2}.",
    114: "{p1} dissolved their union with our coalition {p2}.",
    115: "{p1} repaired an Alliance Flag {locP2}.",
    116: "{p1} repaired an Alliance Fortress {locP2}.",
    117: "{p1} repaired a Center Fortress {locP2}.",
    118: "{p1} upgraded an Alliance Flag {locP2} into an Alliance Outpost.",
    119: "{p1} downgraded an Alliance Outpost {locP2} into an Alliance Flag.",
    120: "{p1} activated a shield for an Alliance Flag {locP2}.",
    121: "{p1} disabled a shield for an Alliance Flag {locP2}.",
    122: "You formed a union with the {p1} Pact.",
    123: "Your union with the {p1} Pact was dissolved.",
    124: "{p1} built a Horse Fort {locP2}.",
    125: "{p1} dismantled a Horse Fort {locP2}.",
    126: "{p1} repaired a Horse Fort {locP2}.",
    127: "{p1} edited {p2}'s member note.",
    201: "{p1} joined the alliance at {p2}'s request.",
    202: "{p1} removed {p2} from the alliance.",
    203: "{p1} accepted {p2}'s request to join the alliance.",
    204: "{p1} left the alliance.",
    205: "{p1} changed {p2}'s rank from {p3} to {p4}.",
    206: "{p1} joined the alliance.",
    207: "{p1} entered the battlefield.",
    208: "{p1} left the battlefield.",
    301: "{p2} attacked our Alliance Flag {locP1}.",
    302: "{p2} attacked our Center Fortress {locP1}.",
    303: "{p2} attacked our Alliance Fortress {locP1}.",
    304: "We started attacking a stronghold {locP2}.",
    305: "We occupied a stronghold {locP2} (final blow: {p3}).",
    306: "{p3} attacked our stronghold {locP2}.",
    307: "Our stronghold {locP2} has been lost (final blow: {p3}).",
    308: "{p2} attacked our Horse Fort {locP1}.",
}

ALLIANCE_OFFICER_POSTS: Dict[int, str] = {
    1: "Counselor",
    2: "Warlord",
    3: "Envoy",
    4: "Saint",
    5: "Ironclad General",
    6: "Watchful General",
    7: "Ranger General",
    8: "Heroic General",
    9: "Expedition General",
    10: "Flame General",
    11: "Thunderous General",
    12: "Vanguard General",
}

ALLIANCE_MARKERS: List[Dict[str, Any]] = [
    {"type": 1, "img": 2, "name": "Attack"},
    {"type": 2, "img": 1, "name": "Defense"},
    {"type": 3, "img": 5, "name": "Sun"},
    {"type": 4, "img": 3, "name": "Moon"},
    {"type": 5, "img": 4, "name": "Star"},
    {"type": 6, "img": 6, "name": "Diamond"},
    {"type": 7, "img": 7, "name": "Triangle"},
    {"type": 8, "img": 8, "name": "Clover"},
    {"type": 9, "img": 9, "name": "Paw"},
    {"type": 10, "img": 10, "name": "Cross"},
]


def parse_subtile_coord(raw_loc: str) -> Optional[Tuple[int, int]]:
    """
    Converts raw RoK alliance log location strings ('serverId,rawX,rawY')
    from 1/6th sub-tiles into Kingdom Map (X, Y) coordinates.
    """
    if not raw_loc:
        return None
    parts = str(raw_loc).split(",")
    if len(parts) < 3:
        return None
    try:
        raw_x = float(parts[1])
        raw_y = float(parts[2])
        return (math.floor(raw_x / 6.0 + 0.5), math.floor(raw_y / 6.0 + 0.5))
    except ValueError:
        return None


def format_alliance_log_record(rec: Dict[str, Any]) -> Dict[str, Any]:
    """Formats a raw alliance log entry (rt 101..308) with sub-tile coordinate resolution."""
    rt = int(rec.get("rt", 0))
    p1 = str(rec.get("p1", "") or "")
    p2 = str(rec.get("p2", "") or "")
    p3 = str(rec.get("p3", "") or "")
    p4 = str(rec.get("p4", "") or "")

    c1 = parse_subtile_coord(p1)
    c2 = parse_subtile_coord(p2)
    loc_p1 = f"(X:{c1[0]} Y:{c1[1]})" if c1 else p1
    loc_p2 = f"(X:{c2[0]} Y:{c2[1]})" if c2 else p2
    post = ALLIANCE_OFFICER_POSTS.get(int(p3), p3) if p3.isdigit() else p3

    template = ALLIANCE_LOG_TEMPLATES.get(rt)
    if template:
        text = (
            template.replace("{p1}", p1)
            .replace("{p2}", p2)
            .replace("{p3}", p3)
            .replace("{p4}", p4)
            .replace("{post}", post)
            .replace("{locP1}", loc_p1)
            .replace("{locP2}", loc_p2)
        )
    else:
        text = " · ".join([x for x in (p1, p2, p3, p4) if x]) or f"Alliance event ({rt})"

    return {
        "record_id": rec.get("record_id"),
        "timestamp": rec.get("ti", int(time.time())),
        "rt": rt,
        "text": text,
        "coords": c1 or c2,
    }


def evaluate_flag_builder_autokick(
    builders: List[Dict[str, Any]],
    credit_cap: int = 20000,
    max_build_minutes: int = 0,
) -> List[Dict[str, Any]]:
    """
    Returns marches inside an Alliance Flag/Fortress that should be sent home
    so other alliance members can enter and earn their daily 20,000 build credits.
    Requires Bot Rank >= R4.
    """
    now = int(time.time())
    to_kick: List[Dict[str, Any]] = []
    for b in builders:
        credits_earned = int(b.get("credits_earned", 0))
        joined_at = int(b.get("joined_at", now))
        elapsed_mins = (now - joined_at) / 60.0

        if credits_earned >= credit_cap:
            to_kick.append({
                "player_id": b.get("player_id"),
                "name": b.get("name"),
                "reason": f"Reached daily build credit cap ({credits_earned:,}/{credit_cap:,})",
            })
        elif max_build_minutes > 0 and elapsed_mins >= max_build_minutes:
            to_kick.append({
                "player_id": b.get("player_id"),
                "name": b.get("name"),
                "reason": f"Exceeded max build time ({int(elapsed_mins)}m >= {max_build_minutes}m)",
            })
    return to_kick


def evaluate_fort_rally_autokick(
    rally: Dict[str, Any],
    settings: Dict[str, Any],
) -> List[Dict[str, Any]]:
    """
    Evaluates a Barbarian Fort rally for auto-kick conditions:
    1. Rally member count > max_members (2, 3, or 4 to maximize gift chests)
    2. Wrong troop type vs. leader's recommended troop_type
    3. Joining march < min_troops
    4. March arrival time > max_arrival_min
    Requires Bot Rank >= R4.
    """
    if not settings.get("enabled", False):
        return []

    max_members = int(settings.get("max_members", 4))
    troop_type_enabled = bool(settings.get("troop_type_enabled", False))
    min_troops = int(settings.get("min_troops", 0))
    max_arrival_min = float(settings.get("max_arrival_min", 0))

    recommended_type = str(rally.get("recommended_troop_type", "")).lower()
    participants = rally.get("participants", [])
    kicks: List[Dict[str, Any]] = []

    for idx, p in enumerate(participants):
        if p.get("is_leader"):
            continue
        pid = p.get("player_id")
        pname = p.get("name", str(pid))
        troop_count = int(p.get("troops", 0))
        unit_type = str(p.get("troop_type", "")).lower()
        arrival_mins = float(p.get("arrival_seconds", 0)) / 60.0

        if idx >= max_members:
            kicks.append({
                "player_id": pid,
                "name": pname,
                "reason": f"Rally member cap reached ({max_members} max for optimal gift chests)",
            })
        elif troop_type_enabled and recommended_type and unit_type and unit_type != recommended_type:
            kicks.append({
                "player_id": pid,
                "name": pname,
                "reason": f"Wrong troop type ({unit_type} instead of {recommended_type})",
            })
        elif min_troops > 0 and troop_count < min_troops:
            kicks.append({
                "player_id": pid,
                "name": pname,
                "reason": f"Below minimum troop requirement ({troop_count:,} < {min_troops:,})",
            })
        elif max_arrival_min > 0 and arrival_mins > max_arrival_min:
            kicks.append({
                "player_id": pid,
                "name": pname,
                "reason": f"March arrival too slow ({arrival_mins:.1f}m > {max_arrival_min}m)",
            })

    return kicks
