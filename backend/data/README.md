# داده‌های import

## ووکامرس (فروشگاه)

فایل دامپ کامل SQL را اینجا بگذار:

```
backend/data/woocommerce-dump.sql
# یا
backend/data/pardeha1_antic-new.sql
```

سپس:

```bash
cd backend
npm run db:import-woo
# یا
node scripts/import-woocommerce-sql.mjs /path/to/pardeha1_antic-new.sql
```

اسکریپت فقط این‌ها را استخراج می‌کند:
- دسته‌بندی محصولات (`product_cat`) با والد/فرزند
- محصولات منتشرشده + قیمت / موجودی / SKU
- ارتباط محصول ↔ دسته

خروجی در Prisma: `ShopCategory` و `Product`

اگر فایل ۱۱۷ مگابایتی خیلی سنگین است، از phpMyAdmin فقط این جداول را export کن:
`wp_terms`, `wp_term_taxonomy`, `wp_term_relationships`, `wp_posts`, `wp_postmeta`
