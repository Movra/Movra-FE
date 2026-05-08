import { urlBase64ToUint8Array } from "./vapidKey";

describe("urlBase64ToUint8Array", () => {
  it("decodes a base64 string with no padding required", () => {
    expect(Array.from(urlBase64ToUint8Array("AQAB"))).toEqual([1, 0, 1]);
  });

  it("decodes a base64url string that needs two padding characters", () => {
    expect(Array.from(urlBase64ToUint8Array("AQ"))).toEqual([1]);
  });

  it("decodes url-safe characters that map to + and /", () => {
    expect(Array.from(urlBase64ToUint8Array("-_"))).toEqual([251]);
  });
});
