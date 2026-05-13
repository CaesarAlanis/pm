import { renderHook, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/lib/auth";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

const jsonOk = (data: unknown) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve(data) });

const jsonFail = () =>
  Promise.resolve({ ok: false, json: () => Promise.resolve(null) });

describe("useAuth", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("starts unauthenticated when /api/auth/me returns 401", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/auth/me")) return jsonFail();
      return jsonOk({});
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(() => Promise.resolve());

    expect(result.current.username).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("starts authenticated when /api/auth/me returns user", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/auth/me")) return jsonOk({ username: "user" });
      return jsonOk({});
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(() => Promise.resolve());

    expect(result.current.username).toBe("user");
    expect(result.current.loading).toBe(false);
  });

  it("login sets username on success", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/auth/me")) return jsonFail();
      if (url.includes("/auth/login")) return jsonOk({ username: "user" });
      return jsonOk({});
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(() => Promise.resolve());

    await act(async () => {
      await result.current.login("user", "password");
    });

    expect(result.current.username).toBe("user");
  });

  it("login throws on failure", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/auth/me")) return jsonFail();
      if (url.includes("/auth/login")) return jsonFail();
      return jsonOk({});
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(() => Promise.resolve());

    await act(async () => {
      await expect(result.current.login("user", "wrong")).rejects.toThrow("Invalid credentials");
    });

    expect(result.current.username).toBeNull();
  });

  it("logout clears username", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/auth/me")) return jsonOk({ username: "user" });
      if (url.includes("/auth/logout")) return jsonOk({});
      return jsonOk({});
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(() => Promise.resolve());
    expect(result.current.username).toBe("user");

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.username).toBeNull();
  });
});
