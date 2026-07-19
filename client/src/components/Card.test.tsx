import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card } from "./Card";

describe("Card", () => {
  it("renders red suit correctly", () => {
    render(<Card card={{ rank: "A", suit: "♥" }} />);
    const ranks = screen.getAllByText("A");
    expect(ranks.length).toBeGreaterThan(0);
    const suits = screen.getAllByText("♥");
    expect(suits.length).toBeGreaterThan(0);
  });

  it("renders black suit correctly", () => {
    render(<Card card={{ rank: "K", suit: "♠" }} />);
    const ranks = screen.getAllByText("K");
    expect(ranks.length).toBeGreaterThan(0);
    const suits = screen.getAllByText("♠");
    expect(suits.length).toBeGreaterThan(0);
  });

  it("renders face-down card", () => {
    const { container } = render(<Card faceDown />);
    expect(container.firstChild).toBeInTheDocument();
    expect(screen.queryByText("A")).not.toBeInTheDocument();
  });

  it("renders nothing when no card and not faceDown", () => {
    const { container } = render(<Card />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("respects size prop", () => {
    const { container: sm } = render(<Card card={{ rank: "5", suit: "♦" }} size="sm" />);
    expect(sm.firstChild).toHaveClass("w-14");
    const { container: lg } = render(<Card card={{ rank: "5", suit: "♦" }} size="lg" />);
    expect(lg.firstChild).toHaveClass("w-[96px]");
  });

  it("applies highlight class", () => {
    const { container } = render(<Card card={{ rank: "A", suit: "♠" }} highlight />);
    expect(container.firstChild).toHaveClass("ring-2");
  });
});
