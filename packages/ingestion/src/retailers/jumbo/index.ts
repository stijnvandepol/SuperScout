import { crawlJumboAssortment } from "../../assortment-runner";
import { defineRetailer } from "../module";
import { JumboAdapter } from "./jumbo.adapter";

/** Jumbo: the GraphQL API its own site and app use. Also crawls the catalogue. */
export default defineRetailer({
  source: "jumbo",
  urls: ["https://www.jumbo.com/api/graphql"],
  needs: "http",
  create: () => new JumboAdapter(),
  catalogue: crawlJumboAssortment,
});
