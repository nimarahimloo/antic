/**
 * compressImage — فشرده‌سازی و تغییر اندازهٔ عکس قبل از آپلود
 * عکس‌های دوربین موبایل معمولاً ۵-۱۰ مگابایت هستند و آپلود مستقیم آن‌ها ناموفق می‌شود.
 * این تابع عکس را به حداکثر maxDim پیکسل تغییر اندازه و به JPEG فشرده می‌کند.
 *
 * از createImageBitmap استفاده می‌کند؛ در نبود آن (مرورگرهای قدیمی) به Image + canvas برمی‌گردد.
 */
export async function compressImage(file, opts = {}) {
  const { maxDim = 1280, quality = 0.82, maxBytes = 4_000_000 } = opts;

  // اگر فایل از قبل کوچک و JPEG است، بدون تغییر برگردان
  if (file.size <= maxBytes && file.type === "image/jpeg") return file;

  let drawSrc = null;
  let ow, oh;
  let objUrl = null;

  // روش ۱: createImageBitmap (سریع و مدرن)
  if (typeof createImageBitmap !== "undefined") {
    try {
      drawSrc = await createImageBitmap(file);
      ow = drawSrc.width;
      oh = drawSrc.height;
    } catch {
      drawSrc = null;
    }
  }

  // روش ۲: fallback با Image element (مرورگرهای قدیمی یا فایل‌های خاص)
  if (!drawSrc) {
    objUrl = URL.createObjectURL(file);
    try {
      drawSrc = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("image-load-failed"));
        img.src = objUrl;
      });
      ow = drawSrc.naturalWidth || drawSrc.width;
      oh = drawSrc.naturalHeight || drawSrc.height;
    } finally {
      // URL بعد از رسم روی canvas revoke می‌شود
    }
  }

  if (!ow || !oh) throw new Error("image-dimensions-zero");

  let w = ow;
  let h = oh;

  if (w > maxDim || h > maxDim) {
    if (w >= h) {
      h = Math.round((h / w) * maxDim);
      w = maxDim;
    } else {
      w = Math.round((w / h) * maxDim);
      h = maxDim;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(drawSrc, 0, 0, w, h);

  // پاکسازی منابع
  if (drawSrc.close) drawSrc.close();
  if (objUrl) URL.revokeObjectURL(objUrl);

  // فشرده‌سازی با toBlob (سریع‌تر و قابل اعتمادتر از toDataURL)
  let q = quality;
  let blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", q));

  while (blob.size > maxBytes && q > 0.4) {
    q -= 0.1;
    blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", q));
  }

  // اگر به هر دلیل toBlob خروجی نداد، به dataURL برگرد
  if (!blob) {
    const dataUrl = canvas.toDataURL("image/jpeg", q);
    const arr = dataUrl.split(",");
    const bstr = atob(arr[1]);
    const u8 = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
    blob = new Blob([u8], { type: "image/jpeg" });
  }

  const name = (file.name || "image").replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}