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
        base = f"{random.choice(PREFIXES)}{noun}{number}"
    elif style == "suffix":
        base = f"{adjective}{noun}{random.choice(SUFFIXES)}"
    elif style == "spaced":
        base = f"{adjective} {noun}"
    elif style == "callsign":
        base = f"{adjective}{random.choice(PREFIXES)}-{number}"
    else:
        base = _shuffle_segments([adjective, noun, str(number)])

    return _randomize_case(base)


def _shuffle_segments(segments: list) -> str:
    segments = [seg for seg in segments if seg]
    random.shuffle(segments)
    joiner = random.choice(["", "_", "-"])
    return joiner.join(segments)


def _randomize_case(value: str) -> str:
    styles = ["title", "lower", "upper", "alternating", "random"]
    style = random.choice(styles)

    if style == "title":
        return value.title()
    if style == "lower":
        return value.lower()
    if style == "upper":
        return value.upper()
    if style == "alternating":
        return "".join(
            char.upper() if index % 2 == 0 else char.lower()
            for index, char in enumerate(value)
        )

    return "".join(
        char.upper() if random.random() > 0.5 else char.lower()
        for char in value
    )