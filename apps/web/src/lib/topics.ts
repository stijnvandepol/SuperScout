import type { CategorySlug, Offer } from "@superscout/core";

/**
 * Topic pages: "koffie aanbiedingen", "luiers aanbiedingen", "wasmiddel
 * aanbieding".
 *
 * These are the queries people actually type — far more of them than
 * "zuivel & eieren aanbiedingen" — and neither the store pages nor the broad
 * categories answer them. A topic is narrower than a category and crosses
 * store lines, which is the one thing a folder app cannot show.
 *
 * The thin-content risk is real, so every page has to earn its index: it is
 * only indexable (and in the sitemap) with at least `MIN_TOPIC_OFFERS` offers
 * at `MIN_TOPIC_STORES` stores. Below that it still answers — an existing link
 * must not 404 when a week is quiet — but says `noindex` and offers to follow
 * the term instead.
 *
 * The tip on each topic is written by hand, not generated: it is the part of
 * the page that is the same every week, so it has to be worth reading.
 */
export interface Topic {
  slug: string;
  /** "Koffie" — used in "Koffie aanbiedingen deze week". */
  label: string;
  /** What the watchlist and search use for this topic. */
  term: string;
  /** Other ways people search for it: "wc papier", "kattenbrokken". Lowercase. */
  aliases?: string[];
  /**
   * Keywords against title + brand. "=word" matches a whole word only; a
   * phrase with a space matches as a phrase; anything else matches inside a
   * word from four letters up, and at the start of a word below that.
   */
  match: string[];
  /** Phrases that disqualify an offer even when a keyword matched. */
  exclude?: string[];
  category: CategorySlug;
  tip: string;
}

export const MIN_TOPIC_OFFERS = 6;
export const MIN_TOPIC_STORES = 2;

export const TOPICS: Topic[] = [
  {
    slug: "koffie",
    label: "Koffie",
    term: "koffie",
    aliases: ["koffiebonen", "koffiecups", "koffiepads", "koffiecapsules"],
    match: ["koffie", "koffiebonen", "koffiepads", "koffiecups", "nespresso", "dolce gusto", "senseo", "douwe egberts", "=l'or", "=lavazza"],
    exclude: ["ijskoffie", "koffiemelk", "koffiecreamer", "koffiezet", "koffiefilter"],
    category: "koffie-thee",
    tip: "Koffie gaat vaak per merk in de aanbieding (“alle Douwe Egberts”), dus check of jouw variant meedoet. Het is lang houdbaar: bij 1+1 of 2+1 gratis is een voorraad voor een paar maanden inslaan meestal slim. Vergelijk zakken wel op gewicht — 450 en 500 gram staan vaak naast elkaar.",
  },
  {
    slug: "thee",
    label: "Thee",
    term: "thee",
    match: ["=thee", "theezakjes", "=pickwick", "=lipton thee", "=clipper", "=yogi"],
    exclude: ["ijsthee", "ice tea", "theedoek", "theelicht"],
    category: "koffie-thee",
    tip: "Thee is een van de makkelijkste producten om op voorraad te kopen: klein, licht en jaren houdbaar. Wacht bij je vaste merk gerust op een 2e-halve-prijsactie; die komt bij de meeste ketens een paar keer per jaar langs.",
  },
  {
    slug: "wasmiddel",
    label: "Wasmiddel",
    term: "wasmiddel",
    aliases: ["waspoeder", "wascapsules", "wasmiddelen"],
    match: ["wasmiddel", "waspoeder", "wascapsules", "wasstrips", "=ariel", "=persil", "=omo", "witte reus", "=robijn"],
    exclude: ["afwasmiddel", "wasverzachter", "toiletblok"],
    category: "huishouden",
    tip: "Reken bij wasmiddel in wasbeurten, niet in liters of euro’s per fles: een geconcentreerde fles van 20 wasbeurten is niet goedkoper dan een grote van 40 als de prijs per wasbeurt hoger ligt. Wasmiddel bederft niet snel, dus een 1+1-actie is hier bijna altijd een echte besparing.",
  },
  {
    slug: "wasverzachter",
    label: "Wasverzachter",
    term: "wasverzachter",
    match: ["wasverzachter", "=lenor", "=silan", "=kuschelweich"],
    category: "huishouden",
    tip: "Wasverzachter gaat vaak samen met wasmiddel van hetzelfde merk in de aanbieding. Combineren kan lonen, maar alleen als je beide echt gebruikt — voor handdoeken is het eerder nadelig, omdat ze er minder door opnemen.",
  },
  {
    slug: "vaatwastabletten",
    label: "Vaatwastabletten",
    term: "vaatwas",
    aliases: ["vaatwastablet", "vaatwasmiddel", "vaatwasser tabletten", "vaatwascapsules"],
    match: ["vaatwas", "=finish", "sun vaatwas"],
    category: "huishouden",
    tip: "Vergelijk vaatwastabletten per tablet: verpakkingen van 30, 46 of 80 stuks maken de prijs op het schap misleidend. Huismerken doen in consumententests regelmatig niet onder voor A-merken, dus een actie op het huismerk is het bekijken waard.",
  },
  {
    slug: "afwasmiddel",
    label: "Afwasmiddel",
    term: "afwasmiddel",
    match: ["afwasmiddel", "handafwas", "=dreft", "=sunlight"],
    exclude: ["vaatwas"],
    category: "huishouden",
    tip: "Afwasmiddel gaat een tijd mee, dus hier hoef je nooit de volle prijs te betalen: vrijwel elke week heeft een van de ketens een actie op een groot merk.",
  },
  {
    slug: "toiletpapier",
    label: "Toiletpapier",
    term: "toiletpapier",
    aliases: ["wc papier", "wc-papier", "wcpapier", "wc rollen", "closetpapier"],
    match: ["toiletpapier", "wc-papier", "=page", "=edet", "=kleenex"],
    exclude: ["keukenpapier", "tissues", "zakdoek"],
    category: "huishouden",
    tip: "Tel rollen niet, tel vellen: een pak van 24 rollen met korte rollen kan minder papier zijn dan 16 dikke. Toiletpapier neemt ruimte in maar bederft niet — koop in de aanbieding als je de kast hebt.",
  },
  {
    slug: "luiers",
    label: "Luiers",
    term: "luiers",
    aliases: ["luier", "luierbroekjes"],
    match: ["luier", "luierbroek", "=pampers", "=pants", "=bonbebe", "=bonbébé", "=huggies"],
    category: "baby",
    tip: "Luiers zijn per stuk het eerlijkst te vergelijken, en maten lopen per merk net anders uit. Sla niet te ver vooruit in: kinderen groeien sneller dan een voorraad op is. Een pak in de volgende maat meenemen bij een 2+1-actie is meestal wel verstandig.",
  },
  {
    slug: "billendoekjes",
    label: "Billendoekjes",
    term: "billendoekjes",
    match: ["billendoek", "vochtige doekjes", "=waterwipes"],
    category: "baby",
    tip: "Billendoekjes drogen uit als de verpakking lang open is, maar dicht blijven ze maanden goed. Een voordeelpak in de actie is dus prima, zolang je er één tegelijk openmaakt.",
  },
  {
    slug: "tandpasta",
    label: "Tandpasta",
    term: "tandpasta",
    aliases: ["tandpasta's"],
    match: ["tandpasta", "=sensodyne", "=prodent", "=zendium", "=aquafresh", "=parodontax", "=elmex"],
    exclude: ["tandenborstel", "mondwater", "flosdraad"],
    category: "drogisterij",
    tip: "Tandpasta is klein en lang houdbaar, dus ideaal om bij een 1+1-actie in te slaan. Let bij gevoelige-tanden- of fluoridevarianten op de exacte versie; niet elke variant van een merk doet mee.",
  },
  {
    slug: "shampoo",
    label: "Shampoo",
    term: "shampoo",
    match: ["shampoo", "conditioner", "=andrélon", "=andrelon", "head & shoulders", "=elvive", "=pantene"],
    category: "drogisterij",
    tip: "Shampoo gaat vaak per merk in de actie, inclusief conditioner en styling. Vergelijk per 100 ml: de kleine flessen in een actie zijn niet altijd goedkoper dan een grote fles zonder korting.",
  },
  {
    slug: "deodorant",
    label: "Deodorant",
    term: "deodorant",
    aliases: ["deo"],
    match: ["deodorant", "=deo", "deospray", "deoroller"],
    category: "drogisterij",
    tip: "Deodorant is een klassiek 1+1- of 2e-halve-prijsproduct. Omdat je het elke dag gebruikt en het jaren goed blijft, is een paar stuks tegelijk kopen in de aanbieding bijna altijd voordelig.",
  },
  {
    slug: "kattenvoer",
    label: "Kattenvoer",
    term: "kattenvoer",
    aliases: ["kattenbrokken", "katten voer", "kattenvoeding"],
    match: ["kattenvoer", "kattenbrok", "kattensnack", "=whiskas", "=felix", "=sheba", "=gourmet", "catisfactions", "=kitekat"],
    category: "huisdier",
    tip: "Katten zijn kieskeurig, dus sla niet in met een smaak die je kat nog niet kent. Voor het vaste merk loont een multipack-actie, en droogvoer blijft na openen weken goed als je de zak goed sluit.",
  },
  {
    slug: "hondenvoer",
    label: "Hondenvoer",
    term: "hondenvoer",
    aliases: ["hondenbrokken", "honden voer", "hondenvoeding"],
    match: ["hondenvoer", "hondenbrok", "hondensnack", "=pedigree", "=frolic", "=cesar", "=dentastix"],
    category: "huisdier",
    tip: "Grote zakken brokken zijn per kilo vrijwel altijd goedkoper, ook zonder actie. Een aanbieding op een kleiner formaat is dus pas echt een deal als de kiloprijs onder die van de grote zak zakt.",
  },
  {
    slug: "bier",
    label: "Bier",
    term: "bier",
    aliases: ["pils", "biertje"],
    match: ["bier", "=pils", "=heineken", "=grolsch", "=amstel", "hertog jan", "=bavaria", "=jupiler", "=brand", "=palm", "=affligem", "=leffe", "speciaalbier"],
    exclude: ["bierworst", "gemberbier", "0.0 azijn"],
    category: "bier-wijn",
    tip: "Bier in krat of tray is per liter meestal goedkoper dan losse flesjes, en rond feestdagen en voetbaltoernooien stapelen de ketens de acties. Let op statiegeld: dat staat meestal niet in de actieprijs. Alcoholacties zijn alleen voor 18+.",
  },
  {
    slug: "wijn",
    label: "Wijn",
    term: "wijn",
    aliases: ["wijnen"],
    match: ["wijn", "=rosé", "=rose", "=prosecco", "=cava", "champagne", "=merlot", "=chardonnay", "sauvignon", "=rioja"],
    exclude: ["wijnazijn", "wijngum", "wijnglas", "radler"],
    category: "bier-wijn",
    tip: "Bij wijn zijn “6 halen 5 betalen” en 25% korting bij zes flessen de gebruikelijke acties. Handig om te weten: de “van”-prijs is bij wijn soms een adviesprijs die nooit echt gold, dus vergelijk ook met andere winkels. Alcoholacties zijn alleen voor 18+.",
  },
  {
    slug: "frisdrank",
    label: "Frisdrank",
    term: "frisdrank",
    aliases: ["fris", "frisdranken"],
    match: ["frisdrank", "=cola", "coca-cola", "=pepsi", "=fanta", "=sprite", "=7up", "dubbelfris", "=sisi", "=lipton ice", "ice tea", "=fuze"],
    exclude: ["cola-snoep", "colaflesjes"],
    category: "frisdrank",
    tip: "Reken frisdrank per liter: een pak blikjes voelt als een deal maar is per liter vaak het duurst. De grote merken rouleren wekelijks tussen de ketens, dus een actie op je vaste merk is meestal binnen een paar weken ergens te vinden.",
  },
  {
    slug: "energiedrank",
    label: "Energiedrank",
    term: "energy",
    aliases: ["energy drink", "energydrink", "energiedrankje"],
    match: ["energy", "energiedrank", "red bull", "=monster", "=rockstar"],
    category: "frisdrank",
    tip: "Energiedrank is per blikje duur, en juist daardoor maakt een 1+1-actie veel uit. Multipacks zijn buiten de aanbieding vaak al goedkoper per blik dan losse.",
  },
  {
    slug: "chips",
    label: "Chips",
    term: "chips",
    match: ["chips", "=lay's", "=lays", "=pringles", "=doritos", "=croky", "=smiths", "=hamka's", "=tortilla chips"],
    category: "snacks",
    tip: "Chips gaan bijna wekelijks ergens in de aanbieding. Let op de grammen: een “voordeelzak” is soms net iets kleiner dan je denkt, en 2 grote zakken voor een vast bedrag zijn per 100 gram vaak scherper dan 1+1 op kleine zakken.",
  },
  {
    slug: "chocolade",
    label: "Chocolade",
    term: "chocolade",
    aliases: ["chocola", "chocoladereep"],
    match: ["chocola", "=milka", "tony's", "=tony", "=verkade", "côte d'or", "cote d'or", "=ritter", "=lindt", "=kitkat", "=twix", "=mars", "=snickers"],
    exclude: ["chocolademelk", "chocomel", "hagelslag", "chocoladepasta"],
    category: "snoep-koek",
    tip: "Repen chocolade zijn maandenlang houdbaar, dus 2e halve prijs of 1+1 is een goed moment om er een paar te kopen. Seizoenschocolade (paas, sinterklaas, kerst) is vlak na de feestdag vaak het goedkoopst.",
  },
  {
    slug: "kaas",
    label: "Kaas",
    term: "kaas",
    match: ["kaas", "=leerdammer", "old amsterdam", "=beemster", "=gouda", "=brie", "=mozzarella", "=parmezaan", "=feta", "=milner", "=cheddar"],
    exclude: ["pindakaas", "kaasstengel", "kaassouffl", "kaasbroodje", "roomkaas"],
    category: "kaas-vleeswaren",
    tip: "Kaas aan een stuk is per kilo bijna altijd goedkoper dan plakken, en een stuk jong belegen kun je gewoon invriezen als je het vooraf in porties snijdt. Bij plakken: kijk naar de kiloprijs, niet naar de pakprijs.",
  },
  {
    slug: "eieren",
    label: "Eieren",
    term: "eieren",
    aliases: ["ei", "eitjes"],
    match: ["=eieren", "=ei", "scharreleieren", "vrije-uitloopeieren", "biologische eieren"],
    exclude: ["paasei", "chocolade", "eiersalade"],
    category: "zuivel",
    tip: "Eieren zijn weken houdbaar in de koelkast, dus een actie op een doos van 10 of 12 is bijna altijd een goede koop. De prijsverschillen tussen scharrel, vrije uitloop en biologisch zijn groter dan tussen de winkels.",
  },
  {
    slug: "boter",
    label: "Boter",
    term: "boter",
    match: ["=boter", "roomboter", "=becel", "blue band", "halvarine", "=zeeuws meisje"],
    exclude: ["boterkoek", "croissant", "pindakaas", "taart", "cake"],
    category: "zuivel",
    tip: "Roomboter kun je invriezen zonder dat het merkbaar slechter wordt. Rond de feestdagen, als iedereen bakt, zie je vaak de scherpste boteracties — een paar pakjes in de vriezer scheelt de rest van het jaar.",
  },
  {
    slug: "yoghurt",
    label: "Yoghurt en kwark",
    term: "yoghurt",
    match: ["yoghurt", "=kwark", "=skyr", "=activia", "=optimel", "=almhof"],
    category: "zuivel",
    tip: "Yoghurt en kwark hebben een korte houdbaarheid, dus koop in de aanbieding alleen wat je die week echt eet. Grote bakken zijn per kilo meestal flink goedkoper dan de kleine bekers.",
  },
  {
    slug: "kip",
    label: "Kip",
    term: "kip",
    aliases: ["kipfilet", "kippenvlees"],
    match: ["=kip", "kipfilet", "kippendij", "kippenpoot", "drumstick", "kipgehakt", "kippenbout"],
    exclude: ["kippensoep", "kipcorn", "kipsaté", "kip-pastasalade"],
    category: "vlees-vis",
    tip: "Kipfilet in een grote verpakking is per kilo bijna altijd goedkoper, en invriezen in porties gaat prima. Dijfilet is vaak goedkoper dan borstfilet en droogt minder snel uit.",
  },
  {
    slug: "gehakt",
    label: "Gehakt",
    term: "gehakt",
    match: ["gehakt", "gehaktbal", "rundergehakt", "half-om-half"],
    exclude: ["kipgehakt"],
    category: "vlees-vis",
    tip: "Gehakt is een van de meest vergeleken producten, en de acties zijn meestal per kilo of per 500 gram. Vries het in platte zakjes in: dan ontdooit het in een halfuur.",
  },
  {
    slug: "zalm",
    label: "Zalm",
    term: "zalm",
    match: ["zalm"],
    category: "vlees-vis",
    tip: "Diepvrieszalm is per kilo vaak een stuk goedkoper dan verse, en voor de meeste recepten merk je het verschil niet. Gerookte zalm gaat vooral rond de feestdagen in de aanbieding.",
  },
  {
    slug: "pizza",
    label: "Pizza",
    term: "pizza",
    match: ["pizza"],
    exclude: ["pizzasaus", "pizzakaas", "pizzadeeg"],
    category: "maaltijden",
    tip: "Diepvriespizza staat vrijwel elke week wel ergens in de aanbieding, vaak als 2 voor een vast bedrag. Wie ruimte in de vriezer heeft, hoeft er nooit de volle prijs voor te betalen.",
  },
  {
    slug: "pasta",
    label: "Pasta",
    term: "pasta",
    match: ["=pasta", "spaghetti", "=penne", "macaroni", "fusilli", "tagliatelle", "=lasagnebladen", "=rummo", "=de cecco", "=barilla"],
    exclude: ["tandpasta", "pastasalade", "chocoladepasta", "boterhampasta"],
    category: "pasta-rijst",
    tip: "Droge pasta is jaren houdbaar, dus bij een merkactie kun je gerust voor maanden inslaan. Huismerkpasta is vaak de helft van de prijs van een A-merk; de actie op het A-merk moet dus flink zijn om dat verschil te overbruggen.",
  },
  {
    slug: "olijfolie",
    label: "Olijfolie",
    term: "olijfolie",
    match: ["olijfolie"],
    category: "sauzen-conserven",
    tip: "Olijfolie is de afgelopen jaren fors duurder geworden, wat acties extra interessant maakt. Het blijft ongeopend lang goed, maar hoort donker en koel te staan. Vergelijk per liter: flessen van 0,5, 0,75 en 1 liter staan vaak door elkaar.",
  },
  {
    slug: "ijs",
    label: "IJs",
    term: "ijs",
    aliases: ["ijsjes", "roomijs", "schepijs"],
    match: ["=ijs", "roomijs", "ijsjes", "=magnum", "=ola", "ben & jerry", "=cornetto", "=hertog", "=haagen", "=häagen"],
    exclude: ["ijsthee", "ijskoffie", "ijsblokjes", "ijsberg", "hertog jan"],
    category: "ijs",
    tip: "IJsacties pieken in de zomer, maar de scherpste prijzen zie je juist in het voor- en najaar, als de ketens hun voorraad willen verkopen. Multipacks zijn per ijsje vrijwel altijd goedkoper dan losse.",
  },
];

/** Lowercase, strip diacritics and soft hyphens — same idea as the category matcher. */
function fold(text: string): string {
  return text
    .toLowerCase()
    .replace(/[­​-‍﻿]/g, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function tokens(folded: string): string[] {
  return folded.split(/[^a-z0-9&'-]+/).flatMap((w) => (w.includes("-") ? [w, ...w.split("-")] : [w])).filter(Boolean);
}

function keywordMatches(keyword: string, text: string, words: string[]): boolean {
  if (keyword.startsWith("=")) {
    const word = fold(keyword.slice(1));
    return word.includes(" ") ? ` ${text} `.includes(` ${word} `) : words.includes(word);
  }
  const k = fold(keyword);
  if (k.includes(" ")) return text.includes(k);
  return words.some((w) => (k.length >= 4 ? w.includes(k) : w.startsWith(k)));
}

/** Whether an offer belongs to a topic. Title and brand only: descriptions list "bijv." examples of other products. */
export function inTopic(offer: Pick<Offer, "title" | "brand">, topic: Topic): boolean {
  // "Gratis bezorging bij 12 euro" is a delivery perk that happens to name a
  // brand, not a price on the product — it would top every topic page.
  if (/gratis bezorging/i.test(offer.title)) return false;
  const text = fold(`${offer.title} ${offer.brand ?? ""}`);
  if (topic.exclude?.some((phrase) => text.includes(fold(phrase)))) return false;
  const words = tokens(text);
  return topic.match.some((keyword) => keywordMatches(keyword, text, words));
}

export function topicBySlug(slug: string): Topic | undefined {
  return TOPICS.find((t) => t.slug === slug);
}

export function offersInTopic<T extends Pick<Offer, "title" | "brand">>(offers: T[], topic: Topic): T[] {
  return offers.filter((o) => inTopic(o, topic));
}

/** Enough offers at enough stores to deserve an indexed page. */
export function isIndexableTopic(offers: Pick<Offer, "source">[]): boolean {
  return offers.length >= MIN_TOPIC_OFFERS && new Set(offers.map((o) => o.source)).size >= MIN_TOPIC_STORES;
}

/**
 * The topic a search term names, if any: "luiers", "luier", "wc papier".
 *
 * Lets search use the topic's curated vocabulary. Searching "wasmiddel" by
 * substring misses "Alle Ariel t/m 30 wasbeurten"; the topic knows Ariel is
 * wasmiddel.
 */
export function topicForTerm(term: string): Topic | undefined {
  const t = fold(term.trim().replace(/\s+/g, " "));
  if (!t) return undefined;
  return TOPICS.find(
    (topic) =>
      fold(topic.term) === t ||
      topic.slug === t ||
      fold(topic.label) === t ||
      (topic.aliases ?? []).some((a) => fold(a) === t),
  );
}
