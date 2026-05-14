import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiFetch, CSRF_HEADER } from "./api";

describe("apiFetch", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("makes request with credentials and CSRF header", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: "test" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await apiFetch<{ data: string }>("/api/test");
    expect(result).toEqual({ data: "test" });
    expect(mockFetch).toHaveBeenCalledWith("/api/test", {
      credentials: "include",
      headers: { ...CSRF_HEADER },
    });
  });

  it("merges custom headers with CSRF header", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
    vi.stubGlobal("fetch", mockFetch);

    await apiFetch("/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/test", {
      method: "POST",
      credentials: "include",
      headers: { ...CSRF_HEADER, "Content-Type": "application/json" },
      body: "{}",
    });
  });

  it("throws with detail from error response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ detail: "Invalid credentials" }),
      })
    );

    await expect(apiFetch("/api/test")).rejects.toThrow("Invalid credentials");
  });

  it("throws with status code when error response has no detail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error("not json")),
      })
    );

    await expect(apiFetch("/api/test")).rejects.toThrow("API error: 500");
  });
});
