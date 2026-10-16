// Setup global de tests: jsdom no implementa Canvas 2D.
// Los tests de montaje solo verifican estructura DOM, así que se stubbea
// getContext con un objeto no-op (sin el paquete nativo `canvas`).
const noop = () => {};

if (typeof HTMLCanvasElement !== "undefined") {
  HTMLCanvasElement.prototype.getContext = function () {
    return new Proxy(
      {},
      {
        get: (t, p) => (p === "canvas" ? this : noop),
        set: () => true,
      }
    );
  };
}

// rAF por si algún mount lo usa de forma sincrónica.
if (typeof requestAnimationFrame === "undefined") {
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 16);
}
