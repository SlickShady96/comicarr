import { afterEach, describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "../test-utils";
import SearchPage from "@/pages/SearchPage";

const SEARCH_VIEW_KEY = "comicarr-search-view";

describe("SearchPage result views", () => {
  afterEach(() => {
    localStorage.removeItem(SEARCH_VIEW_KEY);
  });

  it("shows results as a list by default", async () => {
    render(<SearchPage />, {
      useMemoryRouter: true,
      route: "/search?q=spider&type=comic",
    });

    expect(await screen.findByText("Amazing Spider-Man")).toBeTruthy();
    expect(screen.queryAllByTestId("search-result-card")).toHaveLength(0);
    expect(
      screen
        .getByRole("button", { name: "List view" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("switches to cover cards and remembers the choice", async () => {
    const user = userEvent.setup();
    render(<SearchPage />, {
      useMemoryRouter: true,
      route: "/search?q=spider&type=comic",
    });

    await screen.findByText("Amazing Spider-Man");
    await user.click(screen.getByRole("button", { name: "Grid view" }));

    const cards = await screen.findAllByTestId("search-result-card");
    expect(cards).toHaveLength(2);
    expect(
      screen.getByRole("img", { name: "Amazing Spider-Man" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Add Amazing Spider-Man" }),
    ).toBeTruthy();
    // A series already in the library keeps its added state on the card.
    expect(screen.getByRole("button", { name: /added/ })).toBeTruthy();
    expect(localStorage.getItem(SEARCH_VIEW_KEY)).toBe("grid");
  });

  it("opens in grid view when the saved preference is grid", async () => {
    localStorage.setItem(SEARCH_VIEW_KEY, "grid");
    render(<SearchPage />, {
      useMemoryRouter: true,
      route: "/search?q=spider&type=comic",
    });

    expect(await screen.findAllByTestId("search-result-card")).toHaveLength(2);
  });

  it("lets the URL override the saved preference", async () => {
    localStorage.setItem(SEARCH_VIEW_KEY, "grid");
    render(<SearchPage />, {
      useMemoryRouter: true,
      route: "/search?q=spider&type=comic&view=list",
    });

    await screen.findByText("Amazing Spider-Man");
    expect(screen.queryAllByTestId("search-result-card")).toHaveLength(0);
  });
});
