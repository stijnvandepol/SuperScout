import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  localStorage.clear();
  // The explorer mirrors its filters into the URL; without this, one test's
  // search would be the next test's starting query.
  window.history.replaceState(null, "", "/");
});
