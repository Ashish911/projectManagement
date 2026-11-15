import { renderHook } from "@testing-library/react";

const ws = vi.hoisted(() => ({
  subscribe: vi.fn(),
  stop: vi.fn(),
  push: null as null | ((d: unknown) => void),
}));
vi.mock("@/api/ws", () => ({
  subscribe: (q: string, onData: (d: unknown) => void, v?: unknown) => {
    ws.subscribe(q, v);
    ws.push = onData;
    return ws.stop;
  },
}));
const { useSubscription } = await import("./use-subscription");

beforeEach(() => {
  ws.subscribe.mockReset();
  ws.stop.mockReset();
});

describe("useSubscription", () => {
  it("🟢 subscribes on mount and stops on unmount", () => {
    const { unmount } = renderHook(() =>
      useSubscription("subscription S { x }", () => {}),
    );
    expect(ws.subscribe).toHaveBeenCalledTimes(1);
    unmount();
    expect(ws.stop).toHaveBeenCalledTimes(1);
  });

  it("🔴 re-renders with the same variables don't resubscribe, and the latest handler gets data", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(
      ({ fn }) =>
        useSubscription("subscription S { x }", fn, { variables: { id: "1" } }),
      { initialProps: { fn: first } },
    );
    rerender({ fn: second });
    expect(ws.subscribe).toHaveBeenCalledTimes(1);
    ws.push!({ x: 1 });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith({ x: 1 });
  });

  it("🟢 new variables resubscribe", () => {
    const { rerender } = renderHook(
      ({ id }) =>
        useSubscription("subscription S { x }", () => {}, {
          variables: { id },
        }),
      { initialProps: { id: "1" } },
    );
    rerender({ id: "2" });
    expect(ws.subscribe).toHaveBeenCalledTimes(2);
    expect(ws.stop).toHaveBeenCalledTimes(1);
  });

  it("🔴 does nothing while disabled", () => {
    renderHook(() =>
      useSubscription("subscription S { x }", () => {}, { enabled: false }),
    );
    expect(ws.subscribe).not.toHaveBeenCalled();
  });
});
