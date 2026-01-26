// outrun_poc/__tests__/polyline.test.js
// Purpose: Unit tests for Google polyline encoding (demo activities + route matching)
const { encode, decode } = require("@googlemaps/polyline-codec");

describe("polyline-codec", () => {
  it("encodes lat/lon path to non-empty string", () => {
    const path = [[38.5, -120.2], [40.7, -120.95]];
    const encoded = encode(path, 5);
    expect(encoded).toBeDefined();
    expect(typeof encoded).toBe("string");
    expect(encoded.length).toBeGreaterThan(0);
  });

  it("round-trips encode and decode with precision 5", () => {
    const path = [[38.5, -120.2], [40.7, -120.95], [43.252, -126.453]];
    const encoded = encode(path, 5);
    const decoded = decode(encoded, 5);
    expect(decoded.length).toBe(path.length);
    path.forEach((p, i) => {
      expect(decoded[i][0]).toBeCloseTo(p[0], 5);
      expect(decoded[i][1]).toBeCloseTo(p[1], 5);
    });
  });
});
