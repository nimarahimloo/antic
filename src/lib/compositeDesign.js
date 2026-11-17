import { STYLE_CFG, shade } from "@/components/catalog/windowStyles";

/**
 * compositeDesign — عکس پنجره + پرده را روی canvas ترکیب می‌کند و خروجی DataURL می‌دهد.
 * اگر fabricImage داده شود، بافت عکس پارچه با تایل‌بندی مناسب روی بدنه پرده اعمال می‌شود
 * و سایه‌های چین، نورپردازی و عمق روی آن می‌افتد.
 */
export function compositeDesign(photoUrl, opts) {
  const {
    style = "drape",
    color = "#C9A227",
    openness = 0.3,
    width = 80,
    height = 85,
    x = 10,
    y = 4,
    fabricImage = null,
  } = opts;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const W = img.naturalWidth;
      const H = img.naturalHeight;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");

      // ۱. عکس پس‌زمینه
      ctx.drawImage(img, 0, 0, W, H);

      const cfg = STYLE_CFG[style] || STYLE_CFG.drape;
      const darkColor = shade(color, -0.25);
      const lightColor = shade(color, 0.15);

      const cx = (x / 100) * W;
      const cy = (y / 100) * H;
      const cw = (width / 100) * W;
      const ch = ((height / 100) * H) * (1 - openness * 0.35);
      const opacity = cfg.sheerAlpha || 1;

      const drawCurtain = (fabricImg) => {
        ctx.save();
        ctx.globalAlpha = opacity;

        // میله
        if (cfg.mount === "rod") {
          const grad = ctx.createLinearGradient(0, cy - 6, 0, cy);
          grad.addColorStop(0, "#E8C547");
          grad.addColorStop(1, "#A67C00");
          ctx.fillStyle = grad;
          ctx.fillRect(cx, cy - 6, cw, 4);
        }

        // کاست
        if (cfg.cassette) {
          ctx.fillStyle = shade(color, -0.4);
          ctx.fillRect(cx, cy - 3, cw, 5);
        }

        // بدنه پرده — بافت پارچه یا رنگ ساده
        ctx.save();
        ctx.beginPath();
        ctx.rect(cx, cy, cw, ch);
        ctx.clip();

        if (fabricImg) {
          // تایل‌بندی بافت پارچه با مقیاس مناسب
          const tilePct = parseFloat(cfg.tile) || 38;
          const tileW = (tilePct / 100) * cw;
          const tileH = fabricImg.naturalHeight * (tileW / fabricImg.naturalWidth);
          const cols = Math.ceil(cw / tileW) + 1;
          const rows = Math.ceil(ch / tileH) + 1;
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              ctx.drawImage(fabricImg, cx + c * tileW, cy + r * tileH, tileW, tileH);
            }
          }
          // تنظیم روشنایی و کنتراست بافت
          ctx.fillStyle = "rgba(0,0,0,0.03)";
          ctx.fillRect(cx, cy, cw, ch);
        } else {
          ctx.fillStyle = color;
          ctx.fillRect(cx, cy, cw, ch);
        }
        ctx.restore();

        // سایه‌های چین
        ctx.save();
        ctx.beginPath();
        ctx.rect(cx, cy, cw, ch);
        ctx.clip();

        if (cfg.folds) {
          cfg.folds.forEach((f) => {
            ctx.save();
            ctx.globalCompositeOperation = f.blend || "source-over";
            ctx.globalAlpha = (f.opacity || 1) * opacity * (fabricImg ? 0.5 : 0.7);
            drawGradientPattern(ctx, f.background, cx, cy, cw, ch);
            ctx.restore();
          });
        } else if (cfg.slats) {
          const slatH = Math.max(12, H * 0.012);
          for (let sy = cy; sy < cy + ch; sy += slatH * 2) {
            ctx.fillStyle = darkColor;
            ctx.fillRect(cx, sy, cw, 2);
            ctx.fillStyle = lightColor;
            ctx.fillRect(cx, sy + slatH, cw, 2);
          }
        } else if (cfg.bands) {
          const bandW = Math.max(20, W * 0.02);
          for (let bx = cx; bx < cx + cw; bx += bandW * 2) {
            ctx.fillStyle = "rgba(0,0,0,0.4)";
            ctx.fillRect(bx + bandW, cy, bandW, ch);
          }
        } else if (cfg.stack) {
          const pocketH = Math.max(20, H * 0.02);
          for (let sy = cy; sy < cy + ch; sy += pocketH) {
            ctx.fillStyle = darkColor;
            ctx.fillRect(cx, sy, cw, 3);
            ctx.fillStyle = lightColor;
            ctx.fillRect(cx, sy + pocketH - 3, cw, 3);
          }
        } else if (cfg.smooth) {
          const grad = ctx.createLinearGradient(cx, 0, cx + cw, 0);
          grad.addColorStop(0, shade(color, -0.15));
          grad.addColorStop(0.5, shade(color, 0.1));
          grad.addColorStop(1, shade(color, -0.15));
          ctx.fillStyle = grad;
          ctx.fillRect(cx, cy, cw, ch);
        }

        // نورپردازی جانبی
        const lightGrad = ctx.createLinearGradient(cx, 0, cx + cw, 0);
        lightGrad.addColorStop(0, "rgba(0,0,0,0.18)");
        lightGrad.addColorStop(0.08, "rgba(0,0,0,0.04)");
        lightGrad.addColorStop(0.2, "transparent");
        lightGrad.addColorStop(0.8, "transparent");
        lightGrad.addColorStop(0.92, "rgba(0,0,0,0.04)");
        lightGrad.addColorStop(1, "rgba(0,0,0,0.18)");
        ctx.fillStyle = lightGrad;
        ctx.fillRect(cx, cy, cw, ch);

        // سایه بالا
        const topGrad = ctx.createLinearGradient(0, cy, 0, cy + ch * 0.16);
        topGrad.addColorStop(0, "rgba(0,0,0,0.25)");
        topGrad.addColorStop(0.5, "rgba(0,0,0,0.08)");
        topGrad.addColorStop(1, "transparent");
        ctx.fillStyle = topGrad;
        ctx.fillRect(cx, cy, cw, ch * 0.16);

        // سایه پایین
        const botGrad = ctx.createLinearGradient(0, cy + ch - ch * 0.12, 0, cy + ch);
        botGrad.addColorStop(0, "transparent");
        botGrad.addColorStop(1, "rgba(0,0,0,0.2)");
        ctx.fillStyle = botGrad;
        ctx.fillRect(cx, cy + ch - ch * 0.12, cw, ch * 0.12);

        ctx.restore();

        // پنل‌ها
        if (cfg.panelCount && cfg.panelCount > 1) {
          for (let i = 1; i < cfg.panelCount; i++) {
            const px = cx + (cw * i) / cfg.panelCount;
            ctx.fillStyle = "rgba(0,0,0,0.25)";
            ctx.fillRect(px - 1, cy, 2, ch);
          }
        }

        ctx.restore();

        // واترمارک
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = "#000";
        ctx.font = `${Math.max(12, W * 0.015)}px sans-serif`;
        ctx.textAlign = "left";
        ctx.fillText("پرده آنتیک", 10, H - 10);
        ctx.restore();

        resolve(canvas.toDataURL("image/png"));
      };

      if (fabricImage) {
        const fImg = new Image();
        fImg.crossOrigin = "anonymous";
        fImg.onload = () => drawCurtain(fImg);
        fImg.onerror = () => drawCurtain(null);
        fImg.src = fabricImage;
      } else {
        drawCurtain(null);
      }
    };
    img.onerror = reject;
    img.src = photoUrl;
  });
}

function drawGradientPattern(ctx, cssBg, x, y, w, h) {
  if (cssBg.includes("repeating-linear-gradient")) {
    const isVertical = cssBg.includes("90deg");
    const step = Math.max(8, Math.min(w, h) * 0.03);
    if (isVertical) {
      for (let sx = x; sx < x + w; sx += step) {
        ctx.fillStyle = "rgba(0,0,0,0.12)";
        ctx.fillRect(sx, y, step * 0.4, h);
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(sx + step * 0.5, y, step * 0.3, h);
      }
    } else {
      for (let sy = y; sy < y + h; sy += step) {
        ctx.fillStyle = "rgba(0,0,0,0.12)";
        ctx.fillRect(x, sy, w, step * 0.4);
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(x, sy + step * 0.5, w, step * 0.3);
      }
    }
  } else if (cssBg.includes("linear-gradient")) {
    const grad = ctx.createLinearGradient(x, y, x + w, y);
    grad.addColorStop(0, "rgba(255,255,255,0.1)");
    grad.addColorStop(0.5, "rgba(0,0,0,0.05)");
    grad.addColorStop(1, "rgba(255,255,255,0.1)");
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
  }
}