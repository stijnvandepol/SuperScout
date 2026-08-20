/**
 * Landing pages for supermarket savings campaigns ("spaaracties").
 *
 * Search Console showed a cluster the site had no page for at all — roughly 130
 * impressions a quarter across "spaaractie supermarkt", "bestek spaaractie
 * supermarkt", "jungle dieren actie supermarkt", "stickeractie supermarkt",
 * "muntenactie supermarkt", "k3 spaaractie supermarkt" — all landing on
 * position 65-90, meaning the site was only ever shown by accident.
 *
 * The important design decision is that these describe *types* of campaign, not
 * the campaigns running this month. Every one of those queries is a type
 * question ("which supermarket does the animal sticker thing?"), so a type page
 * answers it permanently. A page per live campaign would go stale in eight
 * weeks — the same disposable-URL mistake the offer archive exists to undo —
 * and competing on "what is running right now" against a dedicated, maintained
 * database like spaarzegelacties.nl is a fight worth skipping.
 *
 * Nothing here claims a specific campaign is currently running. Everything is
 * mechanics, history and how to judge whether one is worth joining.
 */

export interface SavingsCampaign {
  slug: string;
  /** Used in the <h1>, breadcrumb and hub card. */
  label: string;
  /** <title>; phrased the way the queries are phrased. */
  title: string;
  description: string;
  /** One-line summary on the hub card. */
  teaser: string;
  /** Explainer paragraphs above the fold. */
  intro: string[];
  /** How the mechanism works, step by step. */
  steps: { title: string; body: string }[];
  /** Practical judgement — is this worth it? */
  verdict: string[];
  faq: { q: string; aText: string }[];
}

export const SAVINGS_CAMPAIGNS: SavingsCampaign[] = [
  {
    slug: "zegelacties-bestek-pannen-messen",
    label: "Zegelacties voor bestek, pannen en messen",
    title: "Bestek-, pannen- en messenspaaracties bij de supermarkt",
    description:
      "Hoe de zegelacties voor bestek, pannensets en messen bij Nederlandse supermarkten werken, wat je er echt voor betaalt en wanneer sparen loont.",
    teaser:
      "Spaar zegels bij je boodschappen en leg bij voor een pan, een messenset of een compleet bestekservies.",
    intro: [
      "De klassieke supermarktspaaractie: je krijgt een zegel per bedrag aan boodschappen, plakt ze op een spaarkaart, en levert een volle kaart in voor een fors gereduceerde prijs op een pan, een messenset of een compleet bestekservies. Vrijwel elke Nederlandse keten draait dit type actie een of twee keer per jaar, meestal in het voorjaar en rond de feestdagen.",
      "Het merk wisselt per keten en per jaar — keukenmerken, messenmerken en huishoudmerken sluiten hiervoor per campagne een deal met een supermarkt. Wat constant blijft is de opzet: een zegel per vast bedrag, een spaarkaart van 20 tot 40 zegels, en een bijbetaling die neerkomt op ongeveer 50 tot 70 procent korting op de winkelprijs van het artikel.",
    ],
    steps: [
      {
        title: "Zegels verdienen",
        body: "Je ontvangt één zegel per vast bedrag aan boodschappen — meestal €10 of €15 per transactie. Sommige ketens geven leden van hun loyaliteitsprogramma dubbele zegels, wat het spaartempo halveert.",
      },
      {
        title: "De spaarkaart vollemaken",
        body: "Een volle kaart telt doorgaans 20 tot 40 zegels. Bij €10 per zegel en een kaart van 30 betekent dat €300 aan boodschappen per artikel. Reken dat mee: als je daarvoor moet omrijden of duurder uit bent, verdampt het voordeel.",
      },
      {
        title: "Inleveren en bijbetalen",
        body: "Met een volle kaart betaal je een sterk gereduceerde prijs. Die bijbetaling verschilt per artikel: een steelpan kost minder kaarten dan een complete set. De actievoorwaarden staan op de kaart zelf en op de actiepagina van de keten.",
      },
      {
        title: "Let op de inleverdatum",
        body: "Sparen stopt eerder dan inleveren. Vrijwel altijd kun je nog enkele weken na het einde van de spaarperiode je volle kaarten verzilveren — maar niet onbeperkt, en een vergeten kaart is weggegooid geld.",
      },
    ],
    verdict: [
      "Deze acties lonen als je toch al je wekelijkse boodschappen bij die keten doet. Ze lonen niet als ze je verleiden om ergens anders te gaan winkelen dan waar je normaal het goedkoopst uit bent: het prijsverschil tussen ketens op een weekmandje is vaak groter dan het voordeel op één pan.",
      "Vergelijk de bijbetaling altijd met de echte marktprijs van het artikel, niet met de adviesprijs die op de folder staat. Adviesprijzen bij dit soort acties liggen structureel hoger dan wat hetzelfde artikel online kost, waardoor de korting op papier groter lijkt dan hij is.",
    ],
    faq: [
      {
        q: "Welke supermarkt heeft een bestekspaaractie?",
        aText:
          "Dat wisselt per periode. Albert Heijn, Jumbo, PLUS, Dirk, Coop en Hoogvliet draaien allemaal met enige regelmaat een zegelactie voor bestek, pannen of messen, meestal een of twee keer per jaar. Welke keten er op dit moment een heeft, staat in de folder en op de actiepagina van de supermarkt zelf.",
      },
      {
        q: "Hoeveel boodschappen moet ik doen voor een volle spaarkaart?",
        aText:
          "Reken met het bedrag per zegel maal het aantal zegels op de kaart. Bij één zegel per €10 en een kaart van 30 zegels is dat €300 aan boodschappen per artikel.",
      },
      {
        q: "Kan ik zegels van een oude actie nog gebruiken?",
        aText:
          "Nee. Zegels zijn gebonden aan één specifieke campagne en vervallen na de inleverdatum. Wel geldt bijna altijd dat je na het einde van de spaarperiode nog een aantal weken de tijd hebt om volle kaarten in te leveren.",
      },
      {
        q: "Is een spaaractie goedkoper dan het artikel gewoon kopen?",
        aText:
          "Meestal wel, mits je de boodschappen toch al deed. Vergelijk de bijbetaling met de laagste online prijs van hetzelfde artikel — niet met de adviesprijs uit de folder, die vrijwel altijd hoger ligt dan de gangbare marktprijs.",
      },
    ],
  },
  {
    slug: "stickeracties-en-dierenacties",
    label: "Sticker- en dierenacties",
    title: "Stickeracties en dierenacties bij de supermarkt",
    description:
      "Sticker- en verzamelacties in de supermarkt: hoe de albums werken, waarom er altijd stickers ontbreken en hoe je ruilen aanpakt.",
    teaser:
      "Verzamelalbums met dieren, voetballers of filmfiguren — hoe ze werken en hoe je een album daadwerkelijk vol krijgt.",
    intro: [
      "Verzamelacties zijn de spaaracties die op kinderen mikken: je krijgt een zakje stickers of kaarten per bedrag aan boodschappen, en die plak je in een album dat je bij de eerste aankoop gratis of voor een euro meekrijgt. Dieren-, natuur- en voetbalthema's zijn de terugkerende klassiekers; daarnaast lopen er merkgebonden varianten rond kinderprogramma's en films.",
      "De opzet is bewust zo gekozen dat een album niet vanzelf vol raakt. Een album van 150 tot 250 stickers vullen met pakjes van vier of vijf stuks betekent bij één pakje per €10 boodschappen al snel €500 aan aankopen — en dan nog krijg je onvermijdelijk dubbele. Ruilen is daarom onderdeel van het spel, niet een bijkomstigheid.",
    ],
    steps: [
      {
        title: "Album en stickers",
        body: "Het album is gratis of kost een klein bedrag. Per vast boodschappenbedrag krijg je één zakje met een paar stickers of kaarten.",
      },
      {
        title: "Dubbele stickers ruilen",
        body: "Elke actie levert dubbele op. Ketens organiseren vaak ruilmomenten in de winkel; daarnaast wordt er druk geruild op scholen, in buurtgroepen en op online marktplaatsen.",
      },
      {
        title: "Ontbrekende stickers bijbestellen",
        body: "De meeste ketens bieden aan het einde van de actie een bijbestelmogelijkheid voor een beperkt aantal ontbrekende nummers, tegen een kleine vergoeding. Dat is meestal de enige realistische manier om een album echt compleet te krijgen.",
      },
      {
        title: "Actieperiode en einddatum",
        body: "Sticker- en dierenacties lopen doorgaans zes tot tien weken. Na de einddatum worden er geen zakjes meer uitgegeven en sluit ook de bijbestelmogelijkheid.",
      },
    ],
    verdict: [
      "Reken deze actie niet door als besparing — dat is hij niet. De waarde zit in het verzamelen zelf, en dat is prima, zolang je hem niet verwart met korting. Een compleet album kost je in de praktijk meer aan extra boodschappen dan het album ooit waard wordt.",
      "Wil je hem toch uitspelen: begin vroeg, ruil actief, en houd het bijbestelmoment aan het einde van de actie in de gaten. Wie pas in de laatste twee weken begint, krijgt een album niet meer vol.",
    ],
    faq: [
      {
        q: "Welke supermarkt heeft nu een dierenactie of stickeractie?",
        aText:
          "Dat wisselt per seizoen. Albert Heijn, Jumbo, PLUS en Coop draaien alle vier regelmatig verzamelacties rond dieren, natuur of voetbal. De lopende actie staat op de actiepagina en in de folder van de keten zelf.",
      },
      {
        q: "Hoeveel stickers zitten er in een album?",
        aText:
          "Meestal tussen de 150 en 250. Bij een paar stickers per zakje en één zakje per vast boodschappenbedrag betekent dat honderden euro's aan boodschappen voor een compleet album, nog los van dubbele exemplaren.",
      },
      {
        q: "Kan ik ontbrekende stickers bijbestellen?",
        aText:
          "Bij de meeste acties wel, aan het einde van de actieperiode en voor een beperkt aantal nummers. De voorwaarden staan in het album en op de actiepagina van de supermarkt.",
      },
      {
        q: "Zijn oude stickeralbums iets waard?",
        aText:
          "Zelden meer dan een paar euro. Complete albums van bekende, oudere acties worden op tweedehandsplatforms verhandeld, maar de bedragen liggen ver onder wat het vollemaken heeft gekost.",
      },
    ],
  },
  {
    slug: "koopzegels-en-spaarzegels",
    label: "Koopzegels en spaarzegels",
    title: "Koopzegels bij de supermarkt: hoe werken ze en wat leveren ze op?",
    description:
      "Koopzegels en spaarzegels bij Nederlandse supermarkten: wat een vol boekje oplevert, hoeveel rente dat effectief is, en waar je ze kunt inwisselen.",
    teaser:
      "Zegels die je zelf koopt en die met rente terugkomen — de enige supermarktspaarvorm die echt geld oplevert.",
    intro: [
      "Koopzegels zijn iets anders dan gratis spaarzegels: je koopt ze zelf, meestal voor 10 cent per stuk, en plakt ze in een boekje. Een vol boekje wissel je in voor een bedrag dat hoger ligt dan wat je erin hebt gestopt. Het verschil is in feite rente — en dat maakt koopzegels de enige supermarktspaaractie die aantoonbaar geld oplevert in plaats van uitgeven aanmoedigt.",
      "Het rendement is historisch aantrekkelijk geweest ten opzichte van een spaarrekening, wat de vorm populair houdt bij mensen die naar een grote uitgave toewerken. Ketens stellen de voorwaarden periodiek bij: het aantal zegels per boekje, het bedrag per zegel en het aantal zegels dat je per bestede euro mag kopen zijn allemaal knoppen waar aan gedraaid wordt.",
    ],
    steps: [
      {
        title: "Zegels kopen bij de kassa",
        body: "Je geeft aan hoeveel zegels je wilt. Het aantal dat je mag kopen is gekoppeld aan je bestedingsbedrag, en juist die koppeling wordt door ketens periodiek aangescherpt.",
      },
      {
        title: "Het boekje vollemaken",
        body: "Een boekje telt een vast aantal zegels. Zolang het niet vol is, staat je inleg stil — er is geen tussentijdse uitbetaling.",
      },
      {
        title: "Inwisselen",
        body: "Een vol boekje wissel je in de winkel in voor een bedrag boven je inleg, of je verrekent het met je boodschappen. Sommige ketens keren uit op je rekening.",
      },
      {
        title: "Voorwaarden controleren",
        body: "Het bedrag per boekje, het aantal zegels en de koppeling aan je besteding veranderen met enige regelmaat. Controleer de actuele voorwaarden bij je eigen keten voordat je een lange spaarperiode ingaat.",
      },
    ],
    verdict: [
      "Van alle supermarktspaarvormen is dit de enige met een echt financieel rendement. Het verschil tussen inleg en uitkering is rente, en die is doorgaans hoger geweest dan wat een spaarrekening opleverde.",
      "De keerzijde is dat je geld vastzit tot een boekje vol is, en dat er geen enkele garantie of depositobescherming op zit — het is een tegoed bij een supermarktketen, geen bankproduct. Spaar er dus niet meer in dan je kunt missen, en houd de voorwaarden in de gaten: ketens passen het aantal zegels per bestede euro aan, wat de spaarduur zomaar kan verdubbelen.",
    ],
    faq: [
      {
        q: "Wat is het verschil tussen koopzegels en spaarzegels?",
        aText:
          "Koopzegels koop je zelf, meestal voor 10 cent per stuk, en een vol boekje levert meer op dan je inleg. Gratis spaarzegels krijg je bij je boodschappen en die wissel je in voor een product, niet voor geld.",
      },
      {
        q: "Wat levert een vol koopzegelboekje op?",
        aText:
          "Meer dan je erin hebt gestopt; het verschil is effectief rente. De exacte bedragen verschillen per keten en worden periodiek aangepast, dus controleer de actuele voorwaarden bij je eigen supermarkt.",
      },
      {
        q: "Zijn koopzegels veilig?",
        aText:
          "Het is een tegoed bij een supermarktketen, geen bankproduct: er geldt geen depositogarantie. In de praktijk is het risico klein bij de grote ketens, maar het is geen spaarrekening.",
      },
      {
        q: "Kan ik koopzegels van een andere winkel inleveren?",
        aText:
          "Nee. Zegels zijn gebonden aan de keten die ze uitgeeft en zijn daarbuiten niets waard.",
      },
    ],
  },
  {
    slug: "munten-en-bingoacties",
    label: "Munten- en bingoacties",
    title: "Muntenacties en bingoacties bij de supermarkt",
    description:
      "Muntenacties, bingokaarten en krasacties bij de supermarkt: hoe ze werken, wat de kans op een prijs is en waar je op moet letten.",
    teaser:
      "Munten, bingokaarten en krasacties — kansspelvormen die anders werken dan gewoon sparen.",
    intro: [
      "Naast sparen draaien supermarkten kansacties: je krijgt een munt, een bingokaart of een kraslot per bedrag aan boodschappen, en daarmee maak je kans op een prijs. Anders dan bij zegelacties is de uitkomst niet gegarandeerd — wat je krijgt hangt af van geluk, niet van hoeveel je hebt gespaard.",
      "Muntenacties zitten daar tussenin: vaak lever je een aantal munten in voor een vaste beloning, waarbij een deel van de munten een extra prijs vertegenwoordigt. Bingo- en krasvarianten zijn zuiverder kansspel, met een klein aantal grote prijzen en een groot aantal kleine of geen.",
    ],
    steps: [
      {
        title: "Munten of kaarten verzamelen",
        body: "Eén stuk per vast boodschappenbedrag, net als bij zegelacties. Bij muntenacties spaar je meestal toe naar een vast aantal.",
      },
      {
        title: "Inleveren of controleren",
        body: "Bij een muntenactie wissel je een vol aantal in voor de beloning. Bij bingo- en krasvarianten controleer je direct of je iets gewonnen hebt.",
      },
      {
        title: "Prijzen claimen",
        body: "Grotere prijzen worden vrijwel altijd via de actiewebsite geclaimd, met een deadline. Kleinere prijzen verzilver je direct in de winkel.",
      },
      {
        title: "Voorwaarden lezen",
        body: "Bij kansacties gelden formele spelvoorwaarden, inclusief het aantal prijzen en de looptijd. Die staan verplicht op de actiepagina van de keten.",
      },
    ],
    verdict: [
      "Behandel kansacties als een leuk extraatje bij boodschappen die je toch al doet, niet als een reden om meer of ergens anders te kopen. Het verwachte rendement is per definitie lager dan de waarde van de extra besteding die ervoor nodig is.",
      "Bij muntenacties met een gegarandeerde beloning geldt dezelfde rekensom als bij zegelacties: vermenigvuldig het bedrag per munt met het aantal munten en vergelijk dat met de marktprijs van wat je ervoor krijgt.",
    ],
    faq: [
      {
        q: "Hoe werkt een muntenactie bij de supermarkt?",
        aText:
          "Je krijgt een munt per vast bedrag aan boodschappen en levert een afgesproken aantal munten in voor een beloning. Bij sommige acties vertegenwoordigt een deel van de munten daarnaast een extra prijs.",
      },
      {
        q: "Wat is een bingoactie in de supermarkt?",
        aText:
          "Een kansactie waarbij je per boodschappenbedrag een kaart of nummer krijgt en direct ziet of je een prijs hebt. Anders dan bij sparen is de uitkomst niet gegarandeerd.",
      },
      {
        q: "Waar vind ik de spelvoorwaarden?",
        aText:
          "Op de actiepagina van de supermarkt zelf. Kansacties zijn verplicht om voorwaarden te publiceren, inclusief het aantal prijzen en de looptijd.",
      },
    ],
  },
  {
    slug: "seizoensacties-en-zomeracties",
    label: "Seizoens- en zomeracties",
    title: "Zomeracties en seizoensacties bij de supermarkt",
    description:
      "Zomeracties, BBQ-acties, kerst- en paasacties bij de supermarkt: welke ketens wanneer draaien en hoe je de echte korting eruit haalt.",
    teaser:
      "Zomer, BBQ, Pasen en kerst — de terugkerende actiepieken en wat er dan echt goedkoper wordt.",
    intro: [
      "Supermarkten hangen hun grootste acties op aan het seizoen. In de zomer draait alles om barbecue, salades, bier en frisdrank; rond de feestdagen om vlees, wijn, kaas en luxe. Die pieken zijn voorspelbaar, en dat maakt ze planbaar: wie weet dat BBQ-vlees elke zomerweek ergens in de aanbieding is, hoeft er nooit de volle prijs voor te betalen.",
      "Seizoensacties zijn deels gewone weekaanbiedingen en deels spaaracties met een seizoensthema. De eerste groep vind je direct terug in de aanbiedingen op SuperScout; de tweede loopt via zegels of stickers en wordt per keten aangekondigd.",
    ],
    steps: [
      {
        title: "De piek herkennen",
        body: "Zomeracties beginnen zodra het weer omslaat en lopen door tot eind augustus. Feestdagenacties starten enkele weken voor de dag zelf en zijn op de dag erna voorbij.",
      },
      {
        title: "Per keten vergelijken",
        body: "Tijdens een seizoenspiek draaien alle ketens dezelfde productgroepen tegelijk, wat het een van de weinige momenten is waarop je echt appels met appels kunt vergelijken.",
      },
      {
        title: "Prijshistorie controleren",
        body: "Juist bij seizoenspieken lijkt een korting groter dan hij is, doordat de reguliere prijs vlak voor het seizoen omhoog is gegaan. SuperScout bewaart wat een product eerder in de aanbieding kostte, zodat je dat kunt nagaan.",
      },
      {
        title: "Inslaan wat houdbaar is",
        body: "Frisdrank, bier, sauzen en houdbare producten zijn tijdens een seizoenspiek het goedkoopst van het jaar. Vers vlees en salades zijn dat niet — daar betaal je juist de piekprijs.",
      },
    ],
    verdict: [
      "De echte winst tijdens een seizoenspiek zit in houdbare producten, niet in het verse assortiment waar de actie op adverteert. Bier, frisdrank en sauzen bereiken in de zomerweken hun laagste prijs van het jaar; vers vlees juist niet.",
      "Kijk bij een seizoensactie altijd naar de prijs per kilo of per liter in plaats van naar het percentage. Actieverpakkingen tijdens een piek zijn vaak groter dan normaal, waardoor de stuksprijs stijgt terwijl het kortingspercentage indrukwekkend oogt.",
    ],
    faq: [
      {
        q: "Wanneer beginnen de zomeracties bij de supermarkt?",
        aText:
          "Zodra het weer omslaat, meestal vanaf eind mei, met de piek in juli en augustus. BBQ-vlees, salades, bier en frisdrank staan dan wekelijks bij meerdere ketens tegelijk in de aanbieding.",
      },
      {
        q: "Welke supermarkt heeft de beste zomeractie?",
        aText:
          "Dat wisselt per week, omdat alle ketens dezelfde productgroepen tegelijk aanbieden. Vergelijk daarom per week in plaats van per keten — dat is precies waar SuperScout voor gemaakt is.",
      },
      {
        q: "Is een seizoensactie echt goedkoper?",
        aText:
          "Voor houdbare producten meestal wel: bier, frisdrank en sauzen bereiken tijdens de zomerpiek hun laagste prijs van het jaar. Voor vers vlees en salades geldt vaak het omgekeerde, omdat de vraag dan het hoogst is.",
      },
    ],
  },
];

export function savingsCampaignBySlug(slug: string): SavingsCampaign | undefined {
  return SAVINGS_CAMPAIGNS.find((c) => c.slug === slug);
}
