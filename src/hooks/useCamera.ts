import { useRef, useState, useCallback, useEffect } from "react";

interface Camera {
    x: number;
    y: number;
    scale: number;
}

interface Options {
    minScale?: number;
    maxScale?: number;
    initialScale?: number;
    initialX?: number;
    initialY?: number;
}

export function useCamera({
    minScale = 0.1,
    maxScale = 5,
    initialScale = 1,
    initialX = 0,
    initialY = 0
}: Options = {}) {
    const [camera, setCamera] = useState<Camera>({
        x: initialX,
        y: initialY,
        scale: initialScale
    });

    const ref = useRef<HTMLDivElement>(null);

    // camera enable / disable (for interactive elements)
    const enabled = useRef(true);

    // pointer tracking
    const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
    const lastPinchDistance = useRef<number | null>(null);

    const clampScale = (s: number) =>
        Math.min(maxScale, Math.max(minScale, s));

    const isCameraBlocked = (target: EventTarget | null) => {
        if (!(target instanceof HTMLElement)) return false;
        return !!target.closest("[data-no-camera]");
    };

    /* ---------------- POINTER EVENTS ---------------- */

    const onPointerDown = useCallback((e: React.PointerEvent) => {
        if (!enabled.current) return;
        if (isCameraBlocked(e.target)) return;

        ref.current?.setPointerCapture(e.pointerId);
        pointers.current.set(e.pointerId, {
            x: e.clientX,
            y: e.clientY
        });
    }, []);

    const onPointerMove = useCallback((e: React.PointerEvent) => {
        if (!enabled.current) return;
        if (!pointers.current.has(e.pointerId)) return;

        const prev = pointers.current.get(e.pointerId)!;
        const curr = { x: e.clientX, y: e.clientY };
        pointers.current.set(e.pointerId, curr);

        // PAN (single pointer)
        if (pointers.current.size === 1) {
            const dx = curr.x - prev.x;
            const dy = curr.y - prev.y;

            setCamera(c => ({
                ...c,
                x: c.x + dx,
                y: c.y + dy
            }));
        }

        // PINCH ZOOM (two pointers)
        if (pointers.current.size === 2) {
            const [a, b] = Array.from(pointers.current.values());
            if (!a || !b) return;

            const dist = Math.hypot(b.x - a.x, b.y - a.y);
            const cx = (a.x + b.x) / 2;
            const cy = (a.y + b.y) / 2;

            if (lastPinchDistance.current != null) {
                const zoomFactor = dist / lastPinchDistance.current;

                setCamera(c => {
                    const newScale = clampScale(c.scale * zoomFactor);
                    const ratio = newScale / c.scale;

                    return {
                        scale: newScale,
                        x: cx - (cx - c.x) * ratio,
                        y: cy - (cy - c.y) * ratio
                    };
                });
            }

            lastPinchDistance.current = dist;
        }
    }, []);

    const onPointerUp = useCallback((e: React.PointerEvent) => {
        pointers.current.delete(e.pointerId);

        if (pointers.current.size < 2) {
            lastPinchDistance.current = null;
        }

        ref.current?.releasePointerCapture(e.pointerId);
    }, []);

    /* ---------------- WHEEL (TRACKPAD) ---------------- */

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const onWheel = (e: WheelEvent) => {
            if (!enabled.current) return;
            if (isCameraBlocked(e.target)) return;

            e.preventDefault();

            // simple trackpad pan
            setCamera(c => ({
                ...c,
                x: c.x - e.deltaX,
                y: c.y - e.deltaY
            }));
        };

        el.addEventListener("wheel", onWheel, { passive: false });
        return () => el.removeEventListener("wheel", onWheel);
    }, []);

    /* ---------------- BUTTON ZOOM ---------------- */

    const zoomAtCenter = useCallback((factor: number) => {
        const el = ref.current;
        if (!el) return;

        const rect = el.getBoundingClientRect();
        const cx = rect.width / 2;
        const cy = rect.height / 2;

        setCamera(c => {
            const newScale = clampScale(c.scale * factor);
            const ratio = newScale / c.scale;

            return {
                scale: newScale,
                x: cx - (cx - c.x) * ratio,
                y: cy - (cy - c.y) * ratio
            };
        });
    }, []);

    /* ---------------- PUBLIC API ---------------- */

    return {
        camera,
        ref,
        bind: {
            onPointerDown,
            onPointerMove,
            onPointerUp,
            onPointerCancel: onPointerUp
        },
        controls: {
            zoomIn: () => zoomAtCenter(1.2),
            zoomOut: () => zoomAtCenter(1 / 1.2),
            setCamera,
            setEnabled: (v: boolean) => {
                enabled.current = v;
            }
        }
    };
}
