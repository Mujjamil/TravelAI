"""
Entity Extractor
Extracts parameters (destination, duration, budget, trip-type, month)
from raw user text using regex + keyword matching.
"""

import re

# â”€â”€ Entity Patterns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

DESTINATIONS = {
    'paris': 'Paris', 'france': 'Paris', 'bali': 'Bali', 'indonesia': 'Bali',
    'tokyo': 'Tokyo', 'japan': 'Tokyo', 'london': 'London', 'uk': 'London',
    'england': 'London', 'dubai': 'Dubai', 'uae': 'Dubai',
    'singapore': 'Singapore', 'maldives': 'Maldives', 'rome': 'Rome',
    'italy': 'Rome', 'bangkok': 'Bangkok', 'thailand': 'Bangkok',
    'new york': 'New York', 'nyc': 'New York', 'manhattan': 'New York',
    'amsterdam': 'Amsterdam', 'netherlands': 'Amsterdam',
    'barcelona': 'Barcelona', 'spain': 'Barcelona',
    'sydney': 'Sydney', 'australia': 'Sydney',
    'iceland': 'Iceland', 'reykjavik': 'Iceland',
    'santorini': 'Santorini', 'greece': 'Santorini',
    'prague': 'Prague', 'czech': 'Prague',
    'vietnam': 'Vietnam', 'hanoi': 'Vietnam', 'ho chi minh': 'Vietnam',
    'nepal': 'Nepal', 'kathmandu': 'Nepal',
    'kenya': 'Kenya', 'nairobi': 'Kenya',
    'new zealand': 'New Zealand', 'auckland': 'New Zealand',
    'portugal': 'Portugal', 'lisbon': 'Portugal',
    'turkey': 'Istanbul', 'istanbul': 'Istanbul',
    'georgia': 'Georgia', 'tbilisi': 'Georgia',
    'goa': 'Goa', 'india': 'India', 'delhi': 'Delhi', 'mumbai': 'Mumbai',
    'hong kong': 'Hong Kong', 'seoul': 'Seoul', 'korea': 'Seoul',
    'cancun': 'Cancun', 'mexico': 'Mexico City',
    'toronto': 'Toronto', 'canada': 'Toronto',
    'miami': 'Miami', 'los angeles': 'Los Angeles', 'la': 'Los Angeles',
    'chicago': 'Chicago', 'las vegas': 'Las Vegas',
    'patagonia': 'Patagonia', 'argentina': 'Patagonia',
    'seychelles': 'Seychelles', 'mauritius': 'Mauritius',
    'zanzibar': 'Zanzibar', 'tanzania': 'Zanzibar',
    'bora bora': 'Bora Bora', 'tahiti': 'Bora Bora',
    'europe': 'Europe', 'asia': 'Asia', 'caribbean': 'Caribbean',
    'africa': 'Africa', 'south america': 'South America',
}

TRIP_TYPES = {
    'adventure': ['adventure', 'trekking', 'hiking', 'outdoor', 'backpacking', 'extreme', 'camping', 'mountaineering'],
    'honeymoon': ['honeymoon', 'romantic', 'romance', 'couples', 'anniversary', 'newlywed'],
    'family': ['family', 'kids', 'children', 'family trip', 'family vacation'],
    'business': ['business', 'corporate', 'work trip', 'conference', 'meetings'],
    'beach': ['beach', 'seaside', 'coastal', 'island', 'tropical', 'surf', 'snorkel'],
    'cultural': ['cultural', 'heritage', 'history', 'museums', 'historical', 'art', 'architecture'],
    'solo': ['solo', 'alone', 'independent', 'by myself', 'on my own'],
    'group': ['group', 'friends', 'friend group', 'gang', 'squad'],
    'luxury': ['luxury', 'lavish', 'premium', '5 star', 'high end', 'splurge', 'extravagant'],
    'budget': ['budget', 'backpacker', 'cheap', 'low cost', 'economy', 'affordable'],
}

BUDGET_RANGES = {
    'budget': ['budget', 'cheap', 'affordable', 'backpacker', 'low cost', 'economy', 'inexpensive', 'cheapest'],
    'mid-range': ['mid range', 'mid-range', 'moderate', 'standard', 'average', 'comfortable', 'reasonable'],
    'luxury': ['luxury', 'premium', 'high end', '5 star', 'lavish', 'splurge', 'expensive', 'extravagant'],
}

MONTHS = {
    'january': 'January', 'jan': 'January',
    'february': 'February', 'feb': 'February',
    'march': 'March', 'mar': 'March',
    'april': 'April', 'apr': 'April',
    'may': 'May',
    'june': 'June', 'jun': 'June',
    'july': 'July', 'jul': 'July',
    'august': 'August', 'aug': 'August',
    'september': 'September', 'sep': 'September', 'sept': 'September',
    'october': 'October', 'oct': 'October',
    'november': 'November', 'nov': 'November',
    'december': 'December', 'dec': 'December',
    'summer': 'summer', 'winter': 'winter',
    'spring': 'spring', 'autumn': 'autumn', 'fall': 'autumn',
    'monsoon': 'monsoon', 'rainy season': 'monsoon',
    'next month': 'next month', 'this month': 'this month',
    'next year': 'next year',
}

NUMBER_WORDS = {
    'zero': 0,
    'one': 1,
    'two': 2,
    'three': 3,
    'four': 4,
    'five': 5,
    'six': 6,
    'seven': 7,
    'eight': 8,
    'nine': 9,
    'ten': 10,
    'eleven': 11,
    'twelve': 12,
    'thirteen': 13,
    'fourteen': 14,
    'fifteen': 15,
    'sixteen': 16,
    'seventeen': 17,
    'eighteen': 18,
    'nineteen': 19,
    'twenty': 20,
    'twenty one': 21,
    'twenty-one': 21,
    'twenty two': 22,
    'twenty-two': 22,
    'twenty three': 23,
    'twenty-three': 23,
    'twenty four': 24,
    'twenty-four': 24,
    'twenty five': 25,
    'twenty-five': 25,
    'twenty six': 26,
    'twenty-six': 26,
    'twenty seven': 27,
    'twenty-seven': 27,
    'twenty eight': 28,
    'twenty-eight': 28,
    'twenty nine': 29,
    'twenty-nine': 29,
    'thirty': 30,
}

APPROX_PREFIX = r'(?:about|around|roughly|approximately|approx(?:\.|imately)?|nearly|almost|for|maybe)?'
NUMBER_WORD_PATTERN = '|'.join(sorted((re.escape(k) for k in NUMBER_WORDS.keys()), key=len, reverse=True))

# Duration patterns: "5 days", "1 week", "2 weeks", "a week", "weekend"
DURATION_PATTERNS = [
    (rf'\b{APPROX_PREFIX}\s*(\d+)\s*day[s]?\b', lambda m: f"{m.group(1)}-days"),
    (rf'\b{APPROX_PREFIX}\s*(\d+)\s*night[s]?\b', lambda m: f"{m.group(1)}-days"),
    (rf'\b{APPROX_PREFIX}\s*(\d+)\s*week[s]?\b', lambda m: f"{int(m.group(1))*7}-days"),
    (r'\ba\s*week\b', lambda m: '7-days'),
    (r'\bone\s*week\b', lambda m: '7-days'),
    (r'\btwo\s*week[s]?\b', lambda m: '14-days'),
    (r'\bfortnight\b', lambda m: '14-days'),
    (rf'\b{APPROX_PREFIX}\s*(\d+)\s*month[s]?\b', lambda m: f"{int(m.group(1))*30}-days"),
    (r'\ba\s*month\b', lambda m: '30-days'),
    (r'\bweekend\b', lambda m: 'weekend'),
    (r'\blong\s*weekend\b', lambda m: '3-days'),
    (r'\bshort\s*trip\b', lambda m: '3-days'),
]

DURATION_WORD_PATTERNS = [
    (rf'\b{APPROX_PREFIX}\s*({NUMBER_WORD_PATTERN})\s*day[s]?\b', 1),
    (rf'\b{APPROX_PREFIX}\s*({NUMBER_WORD_PATTERN})\s*night[s]?\b', 1),
    (rf'\b{APPROX_PREFIX}\s*({NUMBER_WORD_PATTERN})\s*week[s]?\b', 7),
    (rf'\b{APPROX_PREFIX}\s*({NUMBER_WORD_PATTERN})\s*month[s]?\b', 30),
]


def extract_destination(text):
    text_lower = text.lower()
    to_match = re.search(r'\bto\s+([a-z\s]+?)(?:\s+(?:for|in|on|with|from)\b|$)', text_lower)
    if to_match:
        route_destination = to_match.group(1).strip()
        for key in sorted(DESTINATIONS.keys(), key=len, reverse=True):
            if re.search(r'\b' + re.escape(key) + r'\b', route_destination):
                return DESTINATIONS[key]
    # Try multi-word first (e.g., "new york", "hong kong")
    for key in sorted(DESTINATIONS.keys(), key=len, reverse=True):
        if re.search(r'\b' + re.escape(key) + r'\b', text_lower):
            return DESTINATIONS[key]
    return None


def extract_origin(text):
    text_lower = text.lower()
    from_match = re.search(r'\bfrom\s+([a-z\s]+?)(?:\s+to\b|$)', text_lower)
    if not from_match:
        return None
    route_origin = from_match.group(1).strip()
    for key in sorted(DESTINATIONS.keys(), key=len, reverse=True):
        if re.search(r'\b' + re.escape(key) + r'\b', route_origin):
            return DESTINATIONS[key]
    return None


def extract_trip_type(text):
    text_lower = text.lower()
    for trip_type, keywords in TRIP_TYPES.items():
        for kw in keywords:
            if kw in text_lower:
                return trip_type
    return None


def extract_budget_range(text):
    text_lower = text.lower()
    for budget, keywords in BUDGET_RANGES.items():
        for kw in keywords:
            if kw in text_lower:
                return budget
    return None


def extract_month(text):
    text_lower = text.lower()
    for key in sorted(MONTHS.keys(), key=len, reverse=True):
        if re.search(r'\b' + re.escape(key) + r'\b', text_lower):
            return MONTHS[key]
    return None


def extract_duration(text):
    text_lower = text.lower()

    if re.search(r'\b(?:a\s+)?couple\s+of\s+days\b', text_lower):
        return '2-days'
    if re.search(r'\b(?:a\s+)?few\s+days\b', text_lower):
        return '3-days'

    for pattern, formatter in DURATION_PATTERNS:
        m = re.search(pattern, text_lower)
        if m:
            return formatter(m)

    for pattern, multiplier in DURATION_WORD_PATTERNS:
        m = re.search(pattern, text_lower)
        if m:
            num = NUMBER_WORDS.get(m.group(1), 0)
            if num > 0:
                return f"{num * multiplier}-days"

    cleaned = re.sub(r'[^a-z0-9\s-]', ' ', text_lower).strip()
    tokens = [t for t in re.split(r'\s+', cleaned) if t]
    if 0 < len(tokens) <= 3:
        m = re.search(r'\b(\d{1,2})\b', cleaned)
        if m:
            days = int(m.group(1))
            if 1 <= days <= 60:
                return f"{days}-days"

        for key, value in NUMBER_WORDS.items():
            if value and re.search(r'\b' + re.escape(key) + r'\b', cleaned):
                return f"{value}-days"

    return None


PLACE_TYPES = {
    'hill station': ['hill', 'mountain', 'hills', 'mountains', 'station', 'hill station', 'nature', 'scenic', 'trekking'],
    'beach': ['beach', 'beaches', 'sea', 'ocean', 'island', 'coastal', 'seaside', 'sand', 'surf', 'water'],
    'adventure': ['adventure', 'adventures', 'thrill', 'sports', 'rafting', 'climbing', 'outdoor', 'trekking'],
    'historical': ['historical', 'history', 'heritage', 'culture', 'monument', 'monuments', 'ancient', 'museum', 'cultural', 'palace', 'temple', 'church'],
}

COMPANIONS = {
    'solo': ['solo', 'alone', 'myself', 'single'],
    'friends': ['friends', 'friend', 'group', 'gang', 'buddies', 'squad'],
    'family': ['family', 'kids', 'parents', 'children', 'relatives'],
    'partner': ['partner', 'spouse', 'husband', 'wife', 'girlfriend', 'boyfriend', 'honeymoon', 'couple'],
}

def extract_place_type(text):
    text_lower = text.lower()
    for p_type, keywords in PLACE_TYPES.items():
        for kw in keywords:
            if re.search(r'\b' + re.escape(kw) + r'\b', text_lower):
                return p_type
    return None

def extract_companion(text):
    text_lower = text.lower()
    for comp, keywords in COMPANIONS.items():
        for kw in keywords:
            if re.search(r'\b' + re.escape(kw) + r'\b', text_lower):
                return comp
    return None

def extract_entities(text):
    """
    Extract all entities from a user message.
    Returns dict of found parameters.
    """
    return {
        'destination': extract_destination(text),
        'origin': extract_origin(text),
        'trip-type':   extract_trip_type(text),
        'budget-range': extract_budget_range(text),
        'travel-month': extract_month(text),
        'trip-duration': extract_duration(text),
        'place-type': extract_place_type(text),
        'companion': extract_companion(text),
    }


def get_missing_required(intent, params):
    """
    Returns list of required parameters that are missing for a given intent.
    Used for slot filling (asking follow-up questions).
    """
    required_by_intent = {
        'trip.plan':         ['destination', 'trip-duration', 'budget-range', 'place-type', 'companion'],
        'itinerary.generate': ['destination', 'trip-duration'],
        'budget.estimate':   ['destination'],
        'flight.search':     ['destination'],
        'hotel.search':      ['destination'],
        'packing.assist':    ['destination'],
        'weather.check':     ['destination'],
    }

    required = required_by_intent.get(intent, [])
    missing = [r for r in required if not params.get(r)]
    return missing


SLOT_PROMPTS = {
    'destination':   "Where would you like to go? 🌐",
    'trip-duration': "How many days is your trip? (e.g., 5, five, 5 days, 1 week) 📅",
    'budget-range':  "What's your budget? (Budget / Mid-range / Luxury) 💰",
    'travel-month':  "Which month are you planning to travel? 🗓️",
    'trip-type':     "What type of trip is this? (Adventure / Beach / Cultural / Honeymoon / Business) 🎯",
    'place-type':    "Which type of places do you prefer? (Hill station / Beach / Adventure / Historical) ⛰️",
    'companion':     "With whom are you going? (Solo / Friends / Family / Partner) 👥",
}
