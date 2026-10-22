# فونت‌های محلی پرده آنتیک

ساختار:

```
public/fonts/
  yekan-bakh/     # متن UI (body)
    YekanBakh-Regular.woff2
    YekanBakh-SemiBold.woff2
    YekanBakh-Bold.woff2
  kalameh/        # تیتر لوکس (display) — همه وزن‌ها
    Kalameh-Thin.woff2 … Kalameh-Black.woff2
  peyda/          # heading / دکمه‌ها — همه وزن‌ها
    Peyda-Thin.woff2 … Peyda-Black.woff2
```

نصب:

```bash
# از زیپ مرتب‌شده یا fonts.zip خام
chmod +x scripts/install-fonts.sh
./scripts/install-fonts.sh /path/to/fonts.zip
```

تعریف CSS: `src/styles/fonts.css`  
اتصال فرانت: `src/main.jsx` → import fonts.css
