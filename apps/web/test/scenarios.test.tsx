import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OfferExplorer } from "@/components/OfferExplorer";
import { OfferCard } from "@/components/OfferCard";
import { BasketView } from "@/components/BasketView";
import { AddToBasketButton } from "@/components/AddToBasketButton";
import { formatBasketText } from "@/components/ShareBasketButton";
import { getBasket } from "@/lib/basket";
import { makeOffer, NOW, OFFERS } from "./fixtures";

const explorer = () => render(<OfferExplorer offers={OFFERS} nowIso={NOW} />);
const search = () => screen.getByLabelText("Zoek aanbiedingen");
const setBasket = (ids: string[]) =>
  localStorage.setItem("superscout:basket", JSON.stringify(ids));

describe("Gebruikersscenario's", () => {
  test("01 — bezoeker ziet alle aanbiedingen bij binnenkomst", () => {
    explorer();
    expect(screen.getByText("5 aanbiedingen")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Bananen" })).toBeInTheDocument();
  });

  test("02 — zoeken op productnaam filtert", async () => {
    const user = userEvent.setup();
    explorer();
    await user.type(search(), "valess");
    expect(screen.getByRole("heading", { name: "Valess vleesvervangers" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Bananen" })).not.toBeInTheDocument();
    expect(screen.getByText("1 aanbieding")).toBeInTheDocument();
  });

  test("03 — zoeken op merk filtert", async () => {
    const user = userEvent.setup();
    explorer();
    await user.type(search(), "chiquita");
    expect(screen.getByRole("heading", { name: "Bananen" })).toBeInTheDocument();
    expect(screen.getByText("1 aanbieding")).toBeInTheDocument();
  });

  test("04 — geen resultaat toont lege staat", async () => {
    const user = userEvent.setup();
    explorer();
    await user.type(search(), "zzzzz");
    expect(screen.getByText("Niets gevonden")).toBeInTheDocument();
  });

  test("05 — filteren op winkel Dirk toont alleen Dirk", async () => {
    const user = userEvent.setup();
    explorer();
    await user.selectOptions(screen.getByLabelText("Winkel"), "dirk");
    expect(screen.getByText("2 aanbiedingen")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Elstar appels" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Gerookte zalm" })).not.toBeInTheDocument();
  });

  test("06 — winkelfilter terug op 'Alle winkels' heft het op", async () => {
    const user = userEvent.setup();
    explorer();
    const winkel = screen.getByLabelText("Winkel");
    await user.selectOptions(winkel, "dirk");
    expect(screen.getByText("2 aanbiedingen")).toBeInTheDocument();
    await user.selectOptions(winkel, "");
    expect(screen.getByText("5 aanbiedingen")).toBeInTheDocument();
  });

  test("07 — filteren op categorie 'Bier, wijn & sterk'", async () => {
    const user = userEvent.setup();
    explorer();
    await user.selectOptions(screen.getByLabelText("Categorie"), "bier-wijn");
    expect(screen.getByText("1 aanbieding")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Rode wijn" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Bananen" })).not.toBeInTheDocument();
  });

  test("08 — filteren op categorie 'Groente & fruit'", async () => {
    const user = userEvent.setup();
    explorer();
    await user.selectOptions(screen.getByLabelText("Categorie"), "groente-fruit");
    expect(screen.getByRole("heading", { name: "Bananen" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Rode wijn" })).not.toBeInTheDocument();
  });

  test("09 — 'Bijna verlopen' toont alleen bijna-verlopen acties", async () => {
    const user = userEvent.setup();
    explorer();
    await user.click(screen.getByRole("button", { name: "Bijna verlopen" }));
    expect(screen.getByRole("heading", { name: "Rode wijn" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Bananen" })).not.toBeInTheDocument();
    expect(screen.getByText("1 aanbieding")).toBeInTheDocument();
  });

  test("10 — winkel + zoeken gecombineerd", async () => {
    const user = userEvent.setup();
    explorer();
    await user.selectOptions(screen.getByLabelText("Winkel"), "dirk");
    await user.type(search(), "appels");
    expect(screen.getByRole("heading", { name: "Elstar appels" })).toBeInTheDocument();
    expect(screen.getByText("1 aanbieding")).toBeInTheDocument();
  });

  test("11 — product toevoegen aan mandje", async () => {
    const user = userEvent.setup();
    render(<AddToBasketButton id="dirk:1" variant="mini" />);
    const btn = screen.getByRole("button");
    expect(btn).toHaveTextContent("+ mandje");
    await user.click(btn);
    expect(btn).toHaveTextContent("✓ mandje");
    expect(getBasket()).toContain("dirk:1");
  });

  test("12 — nogmaals klikken verwijdert uit mandje", async () => {
    const user = userEvent.setup();
    render(<AddToBasketButton id="dirk:1" variant="mini" />);
    const btn = screen.getByRole("button");
    await user.click(btn);
    await user.click(btn);
    expect(getBasket()).not.toContain("dirk:1");
  });

  test("13 — leeg mandje toont lege staat", async () => {
    render(<BasketView allOffers={OFFERS} />);
    expect(await screen.findByText("Je mandje is leeg")).toBeInTheDocument();
  });

  test("14 — mandje groepeert per winkel", async () => {
    setBasket(["dirk:1", "ah:2"]);
    render(<BasketView allOffers={OFFERS} />);
    expect(await screen.findByText("Subtotaal Dirk")).toBeInTheDocument();
    expect(screen.getByText("Subtotaal Albert Heijn")).toBeInTheDocument();
  });

  test("15 — mandje toont subtotaal per winkel", async () => {
    setBasket(["dirk:1"]);
    render(<BasketView allOffers={OFFERS} />);
    expect(await screen.findByText("Subtotaal Dirk")).toBeInTheDocument();
    expect(screen.getAllByText("€0,99").length).toBeGreaterThan(0);
  });

  test("16 — 'Open bij {winkel}' linkt naar de winkel in een nieuw tabblad", async () => {
    setBasket(["dirk:1"]);
    render(<BasketView allOffers={OFFERS} />);
    const link = (await screen.findByRole("link", { name: /Open bij Dirk/ })) as HTMLAnchorElement;
    expect(link.href).toBe("https://www.dirk.nl/aanbiedingen");
    expect(link.target).toBe("_blank");
  });

  test("17 — mandje toont een totaalregel met aantal producten", async () => {
    setBasket(["dirk:1", "ah:2"]);
    render(<BasketView allOffers={OFFERS} />);
    expect(await screen.findByText("Totaal · 2 producten")).toBeInTheDocument();
  });

  test("18 — item verwijderen uit mandje", async () => {
    const user = userEvent.setup();
    setBasket(["dirk:1"]);
    render(<BasketView allOffers={OFFERS} />);
    const remove = await screen.findByRole("button", { name: /Bananen uit mandje/ });
    await user.click(remove);
    expect(await screen.findByText("Je mandje is leeg")).toBeInTheDocument();
  });

  test("19 — kaart opent onze eigen productpagina (niet direct de winkel)", () => {
    const { container } = render(<OfferCard offer={OFFERS[0]!} nowIso={NOW} />);
    // The card is a single tap target to our product page; the store link lives
    // on that page, so there is no external link on the card itself.
    expect(container.querySelector('a[href="/aanbieding/dirk-1"]')).not.toBeNull();
    expect(container.querySelector('a[target="_blank"]')).toBeNull();
  });

  test("20 — kaart zonder winkel-URL linkt naar de vergelijkpagina", () => {
    const { container } = render(<OfferCard offer={OFFERS[4]!} nowIso={NOW} />);
    expect(container.querySelector('a[target="_blank"]')).toBeNull();
    expect(container.querySelector('a[href="/aanbieding/dirk-5"]')).not.toBeNull();
  });

  test("21 — sorteren op prijs laag → hoog zet de goedkoopste bovenaan", async () => {
    const user = userEvent.setup();
    explorer();
    await user.selectOptions(screen.getByLabelText("Sorteren"), "price-asc");
    // Bananen (0,99) is cheapest; priceless 1+1/multi_buy offers sort last.
    expect(screen.getAllByRole("heading")[0]).toHaveTextContent("Bananen");
  });

  test("22 — sorteren op prijs hoog → laag zet de duurste bovenaan", async () => {
    const user = userEvent.setup();
    explorer();
    await user.selectOptions(screen.getByLabelText("Sorteren"), "price-desc");
    expect(screen.getAllByRole("heading")[0]).toHaveTextContent("Rode wijn");
  });

  const sligro = makeOffer({
    id: "sligro:9",
    source: "sligro",
    title: "Sligro koffie",
    pricing: { currentPriceCents: 999, originalPriceCents: null, savingsAbsoluteCents: null, savingsPercent: null },
  });

  test("23 — kaart van een groothandel toont 'excl. btw'", () => {
    render(<OfferCard offer={sligro} nowIso={NOW} />);
    expect(screen.getByText("excl. btw")).toBeInTheDocument();
  });

  test("24 — filter 'Excl. btw' toont alleen groothandel-aanbiedingen", async () => {
    const user = userEvent.setup();
    render(<OfferExplorer offers={[sligro, OFFERS[0]!]} nowIso={NOW} />);
    await user.click(screen.getByRole("button", { name: "Excl. btw" }));
    expect(screen.getByRole("heading", { name: "Sligro koffie" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Bananen" })).not.toBeInTheDocument();
  });

  test("25 — deel-tekst groepeert per winkel met prijzen en totaal", () => {
    const text = formatBasketText([OFFERS[0]!, OFFERS[1]!]); // Bananen (Dirk €0,99), Gerookte zalm (AH, 2e gratis)
    expect(text).toContain("🛒 Dirk");
    expect(text).toContain("• Bananen — €0,99");
    expect(text).toContain("🛒 Albert Heijn");
    expect(text).toContain("• Gerookte zalm — 2e gratis");
    expect(text).toContain("💶 Totaal (indicatief): €0,99");
    expect(text).toContain("superscout.nl");
  });
});
