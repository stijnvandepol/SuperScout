import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OfferExplorer } from "@/components/OfferExplorer";
import { OfferCard } from "@/components/OfferCard";
import { BasketView } from "@/components/BasketView";
import { AddToBasketButton } from "@/components/AddToBasketButton";
import { getBasket } from "@/lib/basket";
import { NOW, OFFERS } from "./fixtures";

const explorer = () => render(<OfferExplorer offers={OFFERS} nowIso={NOW} />);
const search = () => screen.getByLabelText("Zoek aanbiedingen");
const setBasket = (ids: string[]) =>
  localStorage.setItem("superscout:basket", JSON.stringify(ids));

describe("Gebruikersscenario's", () => {
  test("01 — bezoeker ziet alle aanbiedingen bij binnenkomst", () => {
    explorer();
    expect(screen.getByText("5 van 5 aanbiedingen")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Bananen" })).toBeInTheDocument();
  });

  test("02 — zoeken op productnaam filtert", async () => {
    const user = userEvent.setup();
    explorer();
    await user.type(search(), "valess");
    expect(screen.getByRole("heading", { name: "Valess vleesvervangers" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Bananen" })).not.toBeInTheDocument();
    expect(screen.getByText("1 van 5 aanbiedingen")).toBeInTheDocument();
  });

  test("03 — zoeken op merk filtert", async () => {
    const user = userEvent.setup();
    explorer();
    await user.type(search(), "chiquita");
    expect(screen.getByRole("heading", { name: "Bananen" })).toBeInTheDocument();
    expect(screen.getByText("1 van 5 aanbiedingen")).toBeInTheDocument();
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
    await user.click(screen.getByRole("button", { name: "Dirk" }));
    expect(screen.getByText("2 van 5 aanbiedingen")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Elstar appels" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Gerookte zalm" })).not.toBeInTheDocument();
  });

  test("06 — nogmaals op winkelfilter klikken heft het op", async () => {
    const user = userEvent.setup();
    explorer();
    const dirk = screen.getByRole("button", { name: "Dirk" });
    await user.click(dirk);
    expect(screen.getByText("2 van 5 aanbiedingen")).toBeInTheDocument();
    await user.click(dirk);
    expect(screen.getByText("5 van 5 aanbiedingen")).toBeInTheDocument();
  });

  test("07 — filteren op mechanisme '1+1 & gratis'", async () => {
    const user = userEvent.setup();
    explorer();
    await user.click(screen.getByRole("button", { name: "1+1 & gratis" }));
    expect(screen.getByText("1 van 5 aanbiedingen")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Gerookte zalm" })).toBeInTheDocument();
  });

  test("08 — filteren op '% korting'", async () => {
    const user = userEvent.setup();
    explorer();
    await user.click(screen.getByRole("button", { name: "% korting" }));
    expect(screen.getByRole("heading", { name: "Rode wijn" })).toBeInTheDocument();
    expect(screen.getByText("1 van 5 aanbiedingen")).toBeInTheDocument();
  });

  test("09 — 'Bijna verlopen' toont alleen bijna-verlopen acties", async () => {
    const user = userEvent.setup();
    explorer();
    await user.click(screen.getByRole("button", { name: "Bijna verlopen" }));
    expect(screen.getByRole("heading", { name: "Rode wijn" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Bananen" })).not.toBeInTheDocument();
    expect(screen.getByText("1 van 5 aanbiedingen")).toBeInTheDocument();
  });

  test("10 — winkel + zoeken gecombineerd", async () => {
    const user = userEvent.setup();
    explorer();
    await user.click(screen.getByRole("button", { name: "Dirk" }));
    await user.type(search(), "appels");
    expect(screen.getByRole("heading", { name: "Elstar appels" })).toBeInTheDocument();
    expect(screen.getByText("1 van 5 aanbiedingen")).toBeInTheDocument();
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
});
