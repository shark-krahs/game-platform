"""Bot name generator utilities."""

import random

ADJECTIVES = [
    "Silent",
    "Swift",
    "Crimson",
    "Golden",
    "Shadow",
    "Iron",
    "Emerald",
    "Azure",
    "Solar",
    "Arctic",
    "Ghost",
    "Storm",
    "Phantom",
    "Noble",
    "Rapid",
    "Quantum",
    "Stellar",
    "Velvet",
    "Frost",
    "Lunar",
    "Scarlet",
    "Cobalt",
    "Ivory",
    "Copper",
    "Obsidian",
    "Vivid",
    "Silent",
    "Brisk",
    "Ancient",
    "Arcane",
    "Brave",
    "Cerulean",
    "Daring",
    "Glacial",
    "Kindle",
    "Mighty",
    "Nebula",
    "Opal",
    "Quicksilver",
    "Radiant",
    "Sable",
    "Titan",
    "Umbral",
    "Vortex",
    "Warden",
    "Zen",
]

NOUNS = [
    "Fox",
    "Wolf",
    "Tiger",
    "Falcon",
    "Raven",
    "Cobra",
    "Eagle",
    "Panther",
    "Dragon",
    "Viper",
    "Hawk",
    "Lynx",
    "Cougar",
    "Orion",
    "Nova",
    "Comet",
    "Pioneer",
    "Atlas",
    "Knight",
    "Voyager",
    "Specter",
    "Paladin",
    "Sentinel",
    "Strider",
    "Nomad",
    "Raider",
    "Ranger",
    "Wraith",
    "Sphinx",
    "Drifter",
    "Griffin",
    "Marauder",
    "Harrier",
    "Corsair",
    "Seeker",
    "Vector",
    "Cipher",
    "Zenith",
    "Nimbus",
    "Axiom",
    "Mirage",
]

PREFIXES = [
    "Neo",
    "Ultra",
    "Hyper",
    "Prime",
    "Alpha",
    "Omega",
    "Proto",
    "Echo",
    "Nova",
    "Retro",
]

SUFFIXES = [
    "AI",
    "X",
    "XR",
    "VX",
    "Prime",
    "Core",
    "OS",
    "Edge",
    "Pulse",
]


def generate_bot_name() -> str:
    """Generate a natural-looking bot name."""
    adjective = random.choice(ADJECTIVES)
    noun = random.choice(NOUNS)
    number = random.randint(10, 999)
    style = random.choice(["simple", "prefix", "suffix", "spaced", "callsign"])

    if style == "prefix":
        return f"{random.choice(PREFIXES)}{noun}{number}"
    if style == "suffix":
        return f"{adjective}{noun}{random.choice(SUFFIXES)}"
    if style == "spaced":
        return f"{adjective} {noun}"
    if style == "callsign":
        return f"{adjective}{random.choice(PREFIXES)}-{number}"

    if style == "simple":
        return _shuffle_segments([adjective, noun, str(number)])

    return f"{adjective}{noun}{number}"


def _shuffle_segments(segments: list) -> str:
    segments = [seg for seg in segments if seg]
    random.shuffle(segments)
    joiner = random.choice(["", "_", "-"])
    return joiner.join(segments)