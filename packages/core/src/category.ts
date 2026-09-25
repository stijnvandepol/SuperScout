import type { Offer } from "./offer";

/**
 * SuperScout's normalized category taxonomy. Chains group offers very
 * differently (Plus "Kaas, vleeswaren, tapas", AH "Borrel, chips, snacks",
 * Dirk "Aardappelen, groente & fruit", Jumbo none), so we map each offer's
 * raw category (or, failing that, its title) onto one of these.
 */
export const CATEGORIES = [
  { slug: "groente-fruit", label: "Groente & fruit" },
  { slug: "vlees-vis", label: "Vlees & vis" },
  { slug: "kaas-vleeswaren", label: "Kaas & vleeswaren" },
  { slug: "zuivel", label: "Zuivel & eieren" },
  { slug: "brood", label: "Brood & gebak" },
  { slug: "ontbijt", label: "Ontbijt & beleg" },
  { slug: "maaltijden", label: "Kant-en-klaar" },
  { slug: "pasta-rijst", label: "Pasta, rijst & wereld" },
  { slug: "sauzen-conserven", label: "Soepen, sauzen & conserven" },
  { slug: "snacks", label: "Chips & snacks" },
  { slug: "snoep-koek", label: "Snoep & koek" },
  { slug: "ijs", label: "IJs" },
  { slug: "frisdrank", label: "Frisdrank & sap" },
  { slug: "koffie-thee", label: "Koffie & thee" },
  { slug: "water", label: "Water" },
  { slug: "bier-wijn", label: "Bier, wijn & sterk" },
  { slug: "drogisterij", label: "Drogisterij & verzorging" },
  { slug: "huishouden", label: "Huishouden" },
  { slug: "baby", label: "Baby" },
  { slug: "huisdier", label: "Huisdieren" },
  { slug: "koken-tafelen", label: "Koken & tafelen" },
  { slug: "bouw-tuin", label: "Klussen & tuin" },
  { slug: "non-food", label: "Non-food & seizoen" },
  { slug: "overig", label: "Overig" },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

export const CATEGORY_LABEL = Object.fromEntries(
  CATEGORIES.map((c) => [c.slug, c.label]),
) as Record<CategorySlug, string>;

/**
 * Departments: the layer a shopper thinks in before they think in categories.
 *
 * Twenty-odd food categories were fine while every offer came from a
 * supermarket. Drugstores, HEMA, Action and DIY chains sell almost nothing in
 * them, so the index page needs a coarser first cut — "Drogisterij &
 * verzorging", "Klussen & tuin" — or those retailers' offers would sit as three
 * lonely tiles among twenty food ones.
 *
 * Grouping only: category URLs do not change, and a department gets no page
 * of its own until it holds enough offers to be worth one.
 */
export const DEPARTMENTS = [
  {
    slug: "eten-drinken",
    label: "Eten & drinken",
    categories: ["groente-fruit", "vlees-vis", "kaas-vleeswaren", "zuivel", "brood", "ontbijt", "maaltijden", "pasta-rijst", "sauzen-conserven", "snacks", "snoep-koek", "ijs", "frisdrank", "koffie-thee", "water", "bier-wijn"],
  },
  { slug: "drogisterij", label: "Drogisterij & verzorging", categories: ["drogisterij"] },
  { slug: "huishouden", label: "Huishouden", categories: ["huishouden"] },
  { slug: "baby-gezin", label: "Baby & gezin", categories: ["baby"] },
  { slug: "huisdieren", label: "Huisdieren", categories: ["huisdier"] },
  { slug: "koken-tafelen", label: "Koken & tafelen", categories: ["koken-tafelen"] },
  { slug: "bouw-tuin", label: "Klussen & tuin", categories: ["bouw-tuin"] },
  { slug: "wonen-vrije-tijd", label: "Wonen, vrije tijd & seizoen", categories: ["non-food", "overig"] },
] as const satisfies ReadonlyArray<{ slug: string; label: string; categories: readonly CategorySlug[] }>;

export type DepartmentSlug = (typeof DEPARTMENTS)[number]["slug"];

const DEPARTMENT_OF = new Map<CategorySlug, DepartmentSlug>(
  DEPARTMENTS.flatMap((d) => d.categories.map((c) => [c as CategorySlug, d.slug] as const)),
);

/** The department a category belongs to. Every category has exactly one. */
export function departmentOf(category: CategorySlug): DepartmentSlug {
  return DEPARTMENT_OF.get(category) ?? "wonen-vrije-tijd";
}

/**
 * Keyword length at or above which a keyword may match *inside* a word.
 *
 * Dutch compounds are the whole game here: "olijfolie", "kipfilet",
 * "ontbijtgranen" and "aardappelschijfjes" all hide the useful noun in the
 * middle. Short keywords must stay anchored to the start of a word instead,
 * or "kip" starts matching "kipling" and "ei" matches "eind".
 *
 * Four is the useful floor: it admits the very nouns that *end* a compound —
 * tomaten|saus, slag|room, tomaten|soep, karne|melk — which a prefix match can
 * never reach. Keywords that stay ambiguous at that length ("bloem", "kers",
 * "koek") carry the whole-word marker instead.
 */
const INFIX_MIN_LENGTH = 4;

/**
 * Prefix marking a keyword that must match a *whole* word.
 *
 * Some words are both a category noun and the opening of something entirely
 * different: rum/Rummo, bloem/bloemkool, ham/hamburger, kers/kerstboom,
 * vla/vlaai, port/porties. Every one of those was a live misclassification.
 */
const EXACT_PREFIX = "=";

/**
 * Ordered rules — first hit wins, so more specific groups come first.
 *
 * Two vocabularies live side by side in each rule, because the same list is
 * run against both a product title and a chain's own section name:
 *  - section words ("zuivel", "drogisterij") match the raw category;
 *  - product nouns and brands ("bloemkool", "zalmfilet", "Pringles") match the
 *    title, which is all we get from chains that publish no category at all.
 *
 * Ordering carries real meaning and is pinned by tests: "broodbeleg" must land
 * in ontbijt rather than brood, "appelsap" in frisdrank rather than groente,
 * and "tomatensoep" in soepen rather than groente.
 */
const RULES: ReadonlyArray<{ match: readonly string[]; slug: CategorySlug }> = [
  { match: ["gratis bezorging", "bezorg"], slug: "overig" },

  // Baby and pet food ahead of drogisterij/huishouden: chains routinely file
  // them under "Gezondheid, baby & verzorging", where the generic word wins.
  { match: ["baby", "luier", "billendoekjes", "flesvoeding", "waterwipes", "olvarit", "zwitsal", "pampers", "nutrilon"], slug: "baby" },

  // Ice cream ahead of dairy and sweets: it is a destination category in its
  // own right ("magnum aanbieding"), and every brand here would otherwise be
  // swallowed by "room" or land in Overig via a bare "Diepvries" section.
  { match: ["=ijs", "=ijsjes", "roomijs", "handijs", "waterijs", "ijsje", "ijstaart", "ijsbeker", "schepijs", "magnum", "cornetto", "ben & jerry", "haagen", "sammontana", "raketjes", "calippo", "solero", "twister", "=ola"], slug: "ijs" },

  { match: ["kaas", "vleeswaren", "=ham", "salami", "chorizo", "brie", "mozzarella", "feta", "parmezaan", "tapas", "antipasti", "worstje", "rookvlees", "filet american", "jamon", "jamón", "serrano", "manchego", "iberico", "ibérico", "leerdammer", "old amsterdam", "beemster"], slug: "kaas-vleeswaren" },

  // "boterham" before the zuivel rule, so bread does not become dairy.
  { match: ["boterham", "ontbijt", "granen", "beleg", "muesli", "cruesli", "cornflakes", "hagelslag", "pindakaas", "=jam", "vruchtenhagel", "brinta", "havermout", "kwark ontbijt", "nutella", "calve", "conimex sambal"], slug: "ontbijt" },

  { match: ["zuivel", "eieren", "yoghurt", "boter", "melk", "kwark", "=vla", "=vlaflip", "room", "creme fraiche", "toetje", "pudding", "karnemelk", "campina", "optimel", "arla", "danone", "activia", "almhof", "mona", "chocomel", "fristi"], slug: "zuivel" },

  { match: ["brood", "gebak", "bakker", "bakprod", "stokbrood", "croissant", "taart", "cake", "vlaai", "pistolet", "bolletjes", "beschuit", "knackebrod", "wraps", "tortilla", "churros"], slug: "brood" },

  { match: ["kant-en-klaar", "maaltijd", "pizza", "lasagne", "wokgerecht", "ovenschotel", "soepstengel", "iglo", "=mora", "beckers", "magnetron"], slug: "maaltijden" },

  // "inktvis", "ansjovis" and "zalmfilet" show why the noun cannot be assumed
  // to sit at the front of a Dutch compound; the long forms are listed too.
  { match: ["vlees", "vis", "inktvis", "ansjovis", "sardine", "kip", "vega", "gehakt", "worst", "zalm", "garnal", "tonijn", "haring", "kabeljauw", "mossel", "rund", "varken", "biefstuk", "schnitzel", "speklap", "hamburger", "shoarma", "spare rib", "drumstick", "kalkoen", "lams", "slavink", "saucijz", "rookworst", "vissticks", "surimi", "spek", "valess", "quorn", "vivera", "tofu"], slug: "vlees-vis" },

  { match: ["drogist", "verzorging", "uiterlijk", "gezondheid", "styling", "deodorant", "shampoo", "douche", "tandpasta", "tandenborstel", "mondwater", "scheer", "handcreme", "bodycreme", "dagcreme", "nachtcreme", "gezichtscreme", "zonnecreme", "bodylotion", "zonnebrand", "make-up", "mascara", "lippenstift", "nagellak", "parfum", "maandverband", "tampon", "vitamine", "paracetamol", "pleister", "condoom", "nivea", "dove", "axe", "rexona", "gillette", "oral-b", "sensodyne", "andrelon", "head & shoulders", "l'oreal", "garnier", "always", "vitaal"], slug: "drogisterij" },

  { match: ["schoonmaak", "toiletpapier", "keukenpapier", "wasmiddel", "huishoud", "afwas", "wasverzachter", "reiniger", "vuilniszak", "aluminiumfolie", "vaatwas", "bleek", "luchtverfrisser", "zeep", "sponzen", "dweil", "tissues", "zakdoekjes", "glorix", "edet", "page", "dreft", "ariel", "robijn", "lenor", "sun ", "wc-eend", "ajax", "cif", "swiffer", "duck", "airwick", "dettol", "tempo"], slug: "huishouden" },

  // After huishouden on purpose: chains file both under one section name
  // ("Huishouden en huisdier"), and the generic half is the better guess when
  // the product title itself gave us nothing.
  { match: ["huisdier", "hondenv", "kattenv", "dierenv", "hondenbrok", "kattenbrok", "kattenbak", "whiskas", "pedigree", "felix", "sheba", "frolic", "catisfactions"], slug: "huisdier" },

  // "=koek" whole-word, or "koekenpan" becomes confectionery.
  { match: ["snoep", "chocola", "=koek", "=koeken", "koekje", "=drop", "=reep", "=repen", "wafel", "pepernoot", "kruidnoot", "marsepein", "toffee", "lolly", "winegum", "zuurtjes", "stroopwafel", "biscuit", "verkade", "lu ", "milka", "tony", "haribo", "katja", "venco", "mentos", "m&m", "snickers", "kinder", "oreo", "bastogne", "liga"], slug: "snoep-koek" },

  { match: ["chips", "snack", "borrel", "popcorn", "toast", "zoutjes", "noten", "pinda", "cracker", "nacho", "dipsaus", "olijven", "kaassoufflé", "bitterbal", "loempia", "lay's", "doritos", "pringles", "chio", "duyvis", "smiths", "croky", "tuc", "japanse mix"], slug: "snacks" },

  { match: ["wijn", "bier", "sterke drank", "speciaalbier", "likeur", "whisky", "vodka", "=rum", "=gin", "jenever", "prosecco", "champagne", "cava", "rosé", "aperitief", "=port", "sherry", "heineken", "grolsch", "amstel", "hertog jan", "bavaria", "brand ", "corona", "desperados", "jupiler", "baileys", "bacardi", "jägermeister", "montaignan"], slug: "bier-wijn" },

  { match: ["frisdrank", "fris ", "sappen", "sap", "cola", "limonade", "siroop", "energydrink", "energiedrank", "ijsthee", "smoothie", "tonic", "pepsi", "fanta", "sprite", "7up", "spa rood", "dubbelfris", "karvan", "roosvicee", "red bull", "monster energy", "lipton ice"], slug: "frisdrank" },

  { match: ["koffie", "thee", "cappuccino", "espresso", "koffiecups", "koffiepads", "senseo", "nespresso", "douwe egberts", "pickwick", "lipton thee", "nescafe"], slug: "koffie-thee" },

  // Whole-word "water": as an infix it swallowed watermeloen, waterflessen,
  // waterwipes and watertafel, none of which are drinks.
  { match: ["=water", "=waters", "mineraalwater", "bronwater", "spa blauw", "sourcy", "chaudfontaine", "bar-le-duc", "vitaminwater", "spa reine"], slug: "water" },

  { match: ["pasta", "rijst", "internationale", "wereld", "noedel", "spaghetti", "macaroni", "penne", "couscous", "quinoa", "bulgur", "mihoen", "noodle", "wok", "curry", "taco", "burrito", "=italia", "honig", "conimex", "silvo"], slug: "pasta-rijst" },

  { match: ["soep", "conserv", "saus", "smaakmaker", "olie", "azijn", "ketchup", "mayonaise", "mosterd", "appelmoes", "augurk", "piccalilly", "bouillon", "kruiden", "specerij", "peper", "zout", "suiker", "=bloem", "=meel", "heinz", "wijko", "remia", "unox", "knorr", "maggi"], slug: "sauzen-conserven" },

  { match: ["groente", "fruit", "aardappel", "salade", "tomaat", "tomaten", "komkommer", "paprika", "=sla", "ijsbergsla", "veldsla", "wortel", "bloemkool", "broccoli", "spinazie", "courgette", "aubergine", "prei", "uien", "champignon", "avocado", "banaan", "banane", "appel", "=peer", "=peren", "sinaasappel", "mandarijn", "citroen", "druiv", "bessen", "aardbei", "frambo", "kiwi", "meloen", "ananas", "mango", "perzik", "nectarine", "pruim", "=kers", "=kersen", "bospeen", "andijvie", "boerenkool", "spruit", "asperge", "radijs", "selderij", "venkel", "pompoen", "witlof", "rucola", "spitskool", "rode kool", "sperzieboon", "doperwt", "=mais", "artisjok", "dadels", "olijf", "tuinkers", "tuinbonen"], slug: "groente-fruit" },

  // Kitchen and garden goods sit after every food rule for the same reason
  // non-food does: their vocabulary is generic. They are split out because they
  // are what drugstores, HEMA, Action and DIY chains mostly sell, and one
  // "non-food" bucket would swallow all of it once those retailers are live.
  // Words that collide with a food rule are left out on purpose: "wokpan"
  // reaches pasta via "wok", "theedoek" reaches koffie-thee via "thee".
  { match: ["koken, tafelen", "koekenpan", "steelpan", "braadpan", "hapjespan", "pannenset", "servies", "bestek", "snijplank", "messenset", "keukenmes", "bakvorm", "ovenschaal", "vershoudbak", "vershouddoos", "airfryer", "staafmixer", "waterkoker"], slug: "koken-tafelen" },

  { match: ["bouwmarkt", "klussen", "tuin", "gereedschap", "boormachine", "accuschroef", "schroevendraaier", "=zaag", "=verf", "muurverf", "lakverf", "kwast", "grasmaaier", "heggenschaar", "tuinslang", "potgrond", "bloembollen", "parasol", "barbecue", "tuinset", "plantenbak"], slug: "bouw-tuin" },

  // Deliberately last of the real categories: Aldi/Lidl mid-week non-food and
  // Dirk's seasonal aisle are a genuine shopping category, but their words
  // ("koffer", "set") are generic enough that every food rule must win first.
  { match: ["non food", "non-food", "vrije tijd", "wonen", "bloemen", "voordeelshop", "kerst", "sinterklaas", "halloween", "carnaval", "speelgoed", "kleding", "broek", "shirt", "sokken", "jas ", "schoen", "textiel", "handdoek", "dekbed", "kussen", "zwembad", "bolderkar", "opberg", "hobbykoffer", "lamp", "batterij", "elektr", "fiets", "camping", "matras", "gordijn", "vaas", "kaarsen", "meubel", "bureau", "stoel"], slug: "non-food" },
];

/**
 * Lowercase, strip diacritics, and drop invisible characters.
 *
 * Chains inject soft hyphens into long words for typesetting ("water­meloen"),
 * which split a token straight down the middle and turned watermelon into
 * bottled water. Folding accents at the same time means the lexicon can be
 * written in plain ASCII and still match "jamón", "rosé" and "crème".
 */
function fold(text: string): string {
  return text
    .toLowerCase()
    .replace(/[­​-‍﻿]/g, "") // soft hyphen, zero-width, BOM
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // combining diacritics
}

/**
 * Split into comparable word tokens.
 *
 * Hyphenated words yield both the joined form and its parts, because both are
 * needed: "make-up", "wc-eend" and "non-food" are single vocabulary items,
 * while "gin-tonic" has to expose "gin" for the whole-word rule to see it.
 */
function tokenize(folded: string): string[] {
  const words = folded
    .split(/[^a-z0-9&'-]+/)
    .flatMap((word) => word.split("'"))
    .filter(Boolean);

  return words.flatMap((word) =>
    word.includes("-") ? [word, ...word.split("-").filter(Boolean)] : [word],
  );
}

function matches(keyword: string, text: string, tokens: string[]): boolean {
  if (keyword.startsWith(EXACT_PREFIX)) {
    const word = keyword.slice(EXACT_PREFIX.length);
    return tokens.some((token) => token === word);
  }

  // Multi-word keywords ("sterke drank", "spa rood") can only be checked
  // against the whole string, since tokenizing splits them apart.
  if (keyword.includes(" ")) return text.includes(keyword);

  return tokens.some((token) =>
    keyword.length >= INFIX_MIN_LENGTH ? token.includes(keyword) : token.startsWith(keyword),
  );
}

/** Rules with every keyword folded once, so matching compares like with like. */
const FOLDED_RULES = RULES.map((rule) => ({
  slug: rule.slug,
  match: rule.match.map((keyword) =>
    keyword.startsWith(EXACT_PREFIX) ? EXACT_PREFIX + fold(keyword.slice(1)) : fold(keyword),
  ),
}));

function classify(text: string): CategorySlug {
  const folded = fold(text);
  const normalized = ` ${folded} `;
  const tokens = tokenize(folded);

  for (const rule of FOLDED_RULES) {
    if (rule.match.some((keyword) => matches(keyword, normalized, tokens))) return rule.slug;
  }
  return "overig";
}

/**
 * Map an offer onto a normalized category slug. The product title is tried
 * first (most specific — "Coca-Cola" -> frisdrank even when the source lumps
 * "Frisdrank, sappen, koffie, thee"), falling back to the source category.
 */
/**
 * Declares the two fields it reads rather than demanding a whole `Offer`.
 *
 * Not pedantry: `OfferExplorer` is a client component, so every field of every
 * offer handed to it is serialised into the RSC flight payload. A signature
 * that asks for the full type forces callers to ship the full type. Narrowing
 * it is backwards compatible — a full `Offer` still satisfies this — and lets
 * the homepage pass a projection instead.
 */
export function categorizeOffer(offer: Pick<Offer, "title" | "sourceCategoryRaw">): CategorySlug {
  const byTitle = classify(offer.title);
  if (byTitle !== "overig") return byTitle;
  if (offer.sourceCategoryRaw) {
    const byCategory = classify(offer.sourceCategoryRaw);
    if (byCategory !== "overig") return byCategory;
  }
  return "overig";
}
