import { describe, expect, it } from "vitest";
import { fireEvent } from "@testing-library/react";
import { render, screen } from "../test-utils";
import SearchResultsGrid from "@/components/search/SearchResultsGrid";
import {
  getCardCoverUrl,
  knownCount,
  knownYear,
} from "@/components/search/searchResultUtils";
import type { SearchResult } from "@/types";

const MANGADEX_COVER =
  "https://uploads.mangadex.org/covers/abc/def.jpg.256.jpg";

describe("search card helpers", () => {
  it("asks MangaDex for the 512px cover", () => {
    expect(
      getCardCoverUrl({
        comicimage: MANGADEX_COVER,
        comicthumb: MANGADEX_COVER,
      } as SearchResult),
    ).toBe("https://uploads.mangadex.org/covers/abc/def.jpg.512.jpg");
  });

  it("prefers the full image over Comic Vine's avatar thumb", () => {
    expect(
      getCardCoverUrl({
        comicimage: "https://cv.example/scale_large/1.jpg",
        comicthumb: "https://cv.example/scale_avatar/1.jpg",
      } as SearchResult),
    ).toBe("https://cv.example/scale_large/1.jpg");
  });

  it("treats placeholder years and zero counts as unknown", () => {
    expect(knownYear("0000")).toBeNull();
    expect(knownYear("")).toBeNull();
    expect(knownYear(null)).toBeNull();
    expect(knownYear("1997")).toBe("1997");
    expect(knownCount("0" as unknown as number)).toBeNull();
    expect(knownCount(undefined)).toBeNull();
    expect(knownCount(75)).toBe(75);
  });
});

describe("SearchResultsGrid", () => {
  it("hides placeholder year and chapter count on a card", () => {
    render(
      <SearchResultsGrid
        contentType="manga"
        results={[
          {
            comicid: "m-1",
            name: "One Piece Omake",
            comicyear: "0000",
            issues: "0" as unknown as number,
            publisher: "Oda Eiichirou",
            comicimage: MANGADEX_COVER,
          } as SearchResult,
          {
            comicid: "m-2",
            name: "One Piece",
            comicyear: "1997",
            issues: 1100,
            comicimage: MANGADEX_COVER,
          } as SearchResult,
        ]}
      />,
    );

    const [omake, onePiece] = screen.getAllByTestId("search-result-card");
    expect(omake.textContent).not.toMatch(/0000|0 ch/);
    expect(omake.textContent).toContain("Oda Eiichirou");
    expect(onePiece.textContent).toContain("1997 · 1100 ch");
  });

  it("falls back to the list thumbnail when the large cover fails", () => {
    render(
      <SearchResultsGrid
        contentType="comic"
        results={[
          {
            comicid: "c-1",
            name: "Saga",
            comicimage: "https://cv.example/large.jpg",
            comicthumb: "https://cv.example/thumb.jpg",
          } as SearchResult,
        ]}
      />,
    );

    const img = screen.getByRole("img", { name: "Saga" });
    expect(img.getAttribute("src")).toBe("https://cv.example/large.jpg");
    fireEvent.error(img);
    expect(screen.getByRole("img", { name: "Saga" }).getAttribute("src")).toBe(
      "https://cv.example/thumb.jpg",
    );
  });

  it("starts a fresh cover attempt when a result's cover changes", () => {
    const saga = {
      comicid: "c-1",
      name: "Saga",
      comicimage: "https://cv.example/large.jpg",
      comicthumb: "https://cv.example/thumb.jpg",
    } as SearchResult;
    const { rerender } = render(
      <SearchResultsGrid contentType="comic" results={[saga]} />,
    );

    // The large cover fails, so the card falls back to the thumbnail.
    fireEvent.error(screen.getByRole("img", { name: "Saga" }));
    expect(screen.getByRole("img", { name: "Saga" }).getAttribute("src")).toBe(
      "https://cv.example/thumb.jpg",
    );

    // Same series, new covers: the new large cover is tried first again.
    rerender(
      <SearchResultsGrid
        contentType="comic"
        results={[
          {
            ...saga,
            comicimage: "https://cv.example/large-v2.jpg",
            comicthumb: "https://cv.example/thumb-v2.jpg",
          },
        ]}
      />,
    );
    const img = screen.getByRole("img", { name: "Saga" });
    expect(img.getAttribute("src")).toBe("https://cv.example/large-v2.jpg");
    expect(img.className).toContain("opacity-0");
  });
});
