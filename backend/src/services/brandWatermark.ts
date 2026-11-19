/** Brand watermark disabled — catalog install images show curtain only. */
export async function applyBrandWatermark(
  _sharp: typeof import("sharp"),
  image: import("sharp").Sharp,
  _width: number,
  _height: number
): Promise<import("sharp").Sharp> {
  return image;
}
