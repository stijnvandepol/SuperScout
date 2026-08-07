import type { Offer } from "@superscout/core";

/**
 * Landing pages built around *how* a deal works rather than what it sells.
 *
 * These target queries the store and category pages structurally cannot reach
 * — "1+1 gratis aanbiedingen deze week", "welke supermarkt heeft 2 voor 1" —
 * and each one is a genuine cross-chain filter over the same offer set, so the
 * page has real content rather than being a keyword doorway.
 */
export interface DealType {
  slug: string;
  /** Used in the <h1> and breadcrumb. */
  label: string;
  /** <title>; kept close to how people actually phrase the query. */
  title: string;
  description: string;
  /** Two paragraphs of page-specific explainer, rendered above the grid. */
  intro: string[];
  faq: { q: string; aText: string }[];
  matches: (offer: Offer) => boolean;
}

export const DEAL_TYPES: DealType[] = [
  {
    slug: "1-plus-1-gratis",
    label: "1+1 gratis",
    title: "1+1 gratis aanbiedingen deze week",
    description:
      "Alle 1+1 gratis en 2+1 gratis acties van Albert Heijn, Jumbo, Lidl, ALDI, PLUS, Dirk en meer, deze week naast elkaar. Dagelijks ververst.",
    intro: [
      "Bij een 1+1 gratis actie betaal je één product en krijg je het tweede erbij. Reken je het om naar stuksprijs, dan is dat 50% korting — meestal de scherpste korting die supermarkten geven, en daarom de actievorm waar het meeste op wordt gejaagd.",
      "Hieronder staan alle lopende gratis-acties van alle chains bij elkaar, gesorteerd op korting. Let op de einddatum: dit type actie loopt vrijwel altijd precies één week, en de meeste ketens beperken het aantal per klant.",
    ],
    faq: [
      {
        q: "Welke supermarkt heeft deze week 1+1 gratis?",
        aText:
          "Dat wisselt per week. Op deze pagina staan alle lopende 1+1 gratis en 2+1 gratis acties van Albert Heijn, Jumbo, Lidl, ALDI, PLUS, Dirk, Hoogvliet, DekaMarkt, Poiesz en Sligro bij elkaar, dagelijks ververst.",
      },
      {
        q: "Moet ik bij 1+1 gratis twee dezelfde producten kopen?",
        aText:
          "Meestal wel, maar veel ketens laten je binnen dezelfde productgroep combineren. De exacte voorwaarde staat op de actiepagina van de supermarkt zelf; controleer die altijd voor je afrekent.",
      },
      {
        q: "Hoeveel korting is 1+1 gratis eigenlijk?",
        aText:
          "Effectief 50% per stuk: je betaalt de volle prijs voor één artikel en ontvangt er twee. Bij 2+1 gratis is dat ongeveer 33% per stuk.",
      },
    ],
    matches: (o) => o.mechanism.type === "buy_x_get_y_free",
  },
  {
    slug: "procent-korting",
    label: "% korting",
    title: "Aanbiedingen met procenten korting deze week",
    description:
      "Alle acties met een percentage korting — van 20% tot 50% en meer — van alle grote Nederlandse supermarkten, op korting gesorteerd.",
    intro: [
      "Kortingspercentages zijn het makkelijkst te vergelijken: hoe hoger het percentage, hoe groter het voordeel per euro. Deze pagina zet alle procentacties van alle supermarkten op één rij, met de hoogste korting bovenaan.",
      "Reken wel even door bij grote verpakkingen: 35% korting op een familieformaat is niet automatisch goedkoper per kilo dan de normale prijs van een kleinere verpakking bij een andere keten.",
    ],
    faq: [
      {
        q: "Waar vind ik deze week 50% korting in de supermarkt?",
        aText:
          "Deze pagina sorteert alle lopende procentacties van alle supermarkten op hoogte van de korting, dus de acties van 50% en hoger staan bovenaan zodra ze er zijn.",
      },
      {
        q: "Geldt een kortingspercentage op het hele assortiment?",
        aText:
          "Zelden. Meestal geldt het op een specifiek merk, een productgroep of geselecteerde varianten. De precieze afbakening staat bij de supermarkt zelf.",
      },
    ],
    matches: (o) => o.mechanism.type === "percentage_off" || o.mechanism.type === "nth_discounted",
  },
  {
    slug: "meer-halen-minder-betalen",
    label: "Stapelvoordeel",
    title: "2 voor 1, 3 voor 2 en andere stapelacties deze week",
    description:
      "Alle acties waarbij je meerdere stuks voor één vaste prijs koopt — 2 voor €3, 3 halen 2 betalen — van alle Nederlandse supermarkten.",
    intro: [
      "Bij stapelacties betaal je één vaste prijs voor meerdere stuks: “2 voor €3,50”, “3 halen 2 betalen”. Het voordeel zit in het volume, dus ze zijn interessant voor houdbare boodschappen en minder voor verse producten die je toch weggooit.",
      "SuperScout rekent waar mogelijk de prijs per stuk mee, zodat je een stapelactie eerlijk kunt vergelijken met een gewone prijsverlaging bij een andere supermarkt.",
    ],
    faq: [
      {
        q: "Is een stapelactie altijd voordeliger?",
        aText:
          "Niet per se. Reken de prijs per stuk uit en vergelijk die met de normale prijs bij andere supermarkten; soms is de reguliere prijs elders lager dan de actieprijs per stuk.",
      },
      {
        q: "Moet ik het volledige aantal afnemen?",
        aText:
          "Ja, de actieprijs geldt pas vanaf het genoemde aantal. Koop je er minder, dan betaal je de normale stuksprijs.",
      },
    ],
    matches: (o) => o.mechanism.type === "multi_buy",
  },
  {
    slug: "afgeprijsd",
    label: "Prijsverlagingen",
    title: "Afgeprijsde producten deze week",
    description:
      "Alle producten met een directe prijsverlaging bij Albert Heijn, Jumbo, Lidl, ALDI, PLUS, Dirk en meer — van hoog naar laag op korting gesorteerd.",
    intro: [
      "De eenvoudigste actievorm: de prijs gaat gewoon omlaag, zonder dat je meerdere stuks hoeft te kopen. Dit is de eerlijkste vergelijking tussen supermarkten, omdat je oude en nieuwe prijs naast elkaar ziet staan.",
      "Alle prijsverlagingen hieronder staan gesorteerd op kortingspercentage, over alle ketens heen. Handig als je wilt zien waar de grootste afprijzing van deze week zit zonder per folder te bladeren.",
    ],
    faq: [
      {
        q: "Wat is het verschil met een 1+1 gratis actie?",
        aText:
          "Bij een prijsverlaging betaal je direct minder voor één product. Bij 1+1 gratis moet je twee stuks afnemen om het voordeel te krijgen.",
      },
      {
        q: "Van welke prijs wordt de korting berekend?",
        aText:
          "Van de reguliere schapprijs die de supermarkt zelf opgeeft. SuperScout toont de oude en nieuwe prijs allebei, zodat je de afprijzing kunt controleren.",
      },
    ],
    matches: (o) => o.mechanism.type === "price_drop" || o.mechanism.type === "amount_off",
  },
];

export function dealTypeBySlug(slug: string): DealType | undefined {
  return DEAL_TYPES.find((d) => d.slug === slug);
}
