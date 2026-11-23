# Next.js 16 Modernization Plan - Phase 2-4

## Phase 2: Server Components & Data Fetching (IN PROGRESS)
- [ ] Convert public pages to Server Components (RSC)
- [ ] Move data fetching to server (async components)
- [ ] Use `generateStaticParams` for dynamic routes
- [ ] Add `loading.tsx` and `error.tsx` for each route segment
- [ ] Implement proper caching with `revalidatePath`/`revalidateTag`
- [ ] Use Suspense boundaries for streaming

## Phase 3: Navigation & Routing
- [ ] Ensure all links use `<Link />` with proper prefetching
- [ ] Use `useRouter`/`usePathname`/`useSearchParams` from `next/navigation`
- [ ] Implement middleware for auth/redirects
- [ ] Add parallel routes for dashboard layouts

## Phase 4: Forms & Mutations
- [ ] Convert forms to Server Actions
- [ ] Use `useActionState` for form handling
- [ ] Implement progressive enhancement

## Phase 5: Admin Dashboard Modernization
- [ ] Convert admin pages to Server Components where possible
- [ ] Use Server Actions for mutations
- [ ] Add proper loading/error states
- [ ] Implement optimistic updates with `useOptimistic`

---

## Key Files to Modernize (Priority Order)

### 1. Public Pages - Convert to Server Components
```
/app/(public)/page.tsx                    → RSC with Suspense
/app/(public)/catalog/page.tsx            → RSC + Suspense (InteractiveCatalog as client island)
/app/(public)/curtain/[id]/page.tsx       → RSC with generateStaticParams
/app/(public)/projects/page.tsx           → RSC
/app/(public)/projects/category/[slug]/page.tsx → RSC with generateStaticParams
/app/(public)/shop/page.tsx               → RSC (useShop is client)
/app/(public)/product/[slug]/page.tsx     → RSC with generateStaticParams
/app/(public)/about/page.tsx              → RSC
/app/(public)/contact/page.tsx            → RSC (form as client island)
```

### 2. Data Fetching - Move to Server
- Create `src/lib/server-data.ts` for server-side data fetching
- Use `cache` from React for request deduplication
- Implement `revalidateTag`/`revalidatePath` for cache invalidation

### 3. Loading/Error States
- Add `loading.tsx` for each route segment
- Add `error.tsx` for each route segment
- Wrap client islands in `<Suspense>`

### 3. Admin Dashboard
- Keep auth-protected pages as Client Components
- Use Server Actions for CRUD operations
- Add proper loading states