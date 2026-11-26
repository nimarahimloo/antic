import assert from "node:assert";
import { describe, it } from "node:test";
import { prisma } from "../src/lib/prisma.js";

async function seedCollections() {
  const c1 = await prisma.collection.create({
    data: { title: "Kitchen", slug: "kitchen", order: 1, active: true },
  });
  const c2 = await prisma.collection.create({
    data: { title: "Bedroom", slug: "bedroom", order: 2, active: true },
  });
  return [c1, c2];
}

async function cleanup() {
  await prisma.collectionProduct.deleteMany();
  await prisma.collectionCategory.deleteMany();
  await prisma.collectionProject.deleteMany();
  await prisma.product.deleteMany();
  await prisma.project.deleteMany();
  await prisma.curtainCategory.deleteMany();
  await prisma.collection.deleteMany();
}

describe("Collection relationships — Product → CollectionProduct", () => {
  it("create product with multiple collections", async () => {
    await cleanup();
    const [c1, c2] = await seedCollections();

    const product = await prisma.product.create({
      data: {
        name: "Test Product",
        slug: "test-product",
        price: 100,
        currency: "IRR",
        visible: true,
        inStock: true,
        stock: 10,
      },
    });

    await prisma.collectionProduct.createMany({
      data: [
        { collectionId: c1.id, productId: product.id },
        { collectionId: c2.id, productId: product.id },
      ],
    });

    const rels = await prisma.collectionProduct.findMany({
      where: { productId: product.id },
      select: { collectionId: true },
    });
    assert.strictEqual(rels.length, 2);
    assert.ok(rels.some((r) => r.collectionId === c1.id));
    assert.ok(rels.some((r) => r.collectionId === c2.id));
    await cleanup();
  });

  it("update product collections replaces all assignments", async () => {
    await cleanup();
    const [c1, c2] = await seedCollections();

    const product = await prisma.product.create({
      data: {
        name: "Test Product",
        slug: "test-product",
        price: 100,
        currency: "IRR",
        visible: true,
        inStock: true,
        stock: 10,
      },
    });

    await prisma.collectionProduct.create({
      data: { collectionId: c1.id, productId: product.id },
    });

    // Replace with c2 only
    await prisma.collectionProduct.deleteMany({ where: { productId: product.id } });
    await prisma.collectionProduct.create({
      data: { collectionId: c2.id, productId: product.id },
    });

    const rels = await prisma.collectionProduct.findMany({
      where: { productId: product.id },
      select: { collectionId: true },
    });
    assert.strictEqual(rels.length, 1);
    assert.strictEqual(rels[0].collectionId, c2.id);
    await cleanup();
  });

  it("omit collectionIds on update preserves existing assignments", async () => {
    await cleanup();
    const [c1] = await seedCollections();

    const product = await prisma.product.create({
      data: {
        name: "Test Product",
        slug: "test-product",
        price: 100,
        currency: "IRR",
        visible: true,
        inStock: true,
        stock: 10,
      },
    });

    await prisma.collectionProduct.create({
      data: { collectionId: c1.id, productId: product.id },
    });

    // Update product without touching collections (simulate API without collectionIds)
    await prisma.product.update({
      where: { id: product.id },
      data: { name: "Updated Product" },
    });

    const rels = await prisma.collectionProduct.findMany({
      where: { productId: product.id },
      select: { collectionId: true },
    });
    assert.strictEqual(rels.length, 1);
    assert.strictEqual(rels[0].collectionId, c1.id);
    await cleanup();
  });

  it("empty collectionIds clears all assignments", async () => {
    await cleanup();
    const [c1, c2] = await seedCollections();

    const product = await prisma.product.create({
      data: {
        name: "Test Product",
        slug: "test-product",
        price: 100,
        currency: "IRR",
        visible: true,
        inStock: true,
        stock: 10,
      },
    });

    await prisma.collectionProduct.createMany({
      data: [
        { collectionId: c1.id, productId: product.id },
        { collectionId: c2.id, productId: product.id },
      ],
    });

    // Clear all
    await prisma.collectionProduct.deleteMany({ where: { productId: product.id } });

    const rels = await prisma.collectionProduct.findMany({
      where: { productId: product.id },
      select: { collectionId: true },
    });
    assert.strictEqual(rels.length, 0);
    await cleanup();
  });

  it("retrieve product collection IDs", async () => {
    await cleanup();
    const [c1] = await seedCollections();

    const product = await prisma.product.create({
      data: {
        name: "Test Product",
        slug: "test-product",
        price: 100,
        currency: "IRR",
        visible: true,
        inStock: true,
        stock: 10,
      },
    });

    await prisma.collectionProduct.create({
      data: { collectionId: c1.id, productId: product.id },
    });

    const rels = await prisma.collectionProduct.findMany({
      where: { productId: product.id },
      select: { collectionId: true },
    });
    assert.strictEqual(rels.length, 1);
    assert.strictEqual(rels[0].collectionId, c1.id);
    await cleanup();
  });
});

describe("Collection relationships — CurtainCategory → CollectionCategory", () => {
  it("create curtain category with collections", async () => {
    await cleanup();
    const [c1, c2] = await seedCollections();

    const category = await prisma.curtainCategory.create({
      data: {
        name: "Test Category",
        slug: "test-category",
        mechanism: "roller",
      },
    });

    await prisma.collectionCategory.createMany({
      data: [
        { collectionId: c1.id, categoryId: category.id },
        { collectionId: c2.id, categoryId: category.id },
      ],
    });

    const rels = await prisma.collectionCategory.findMany({
      where: { categoryId: category.id },
      select: { collectionId: true },
    });
    assert.strictEqual(rels.length, 2);
    assert.ok(rels.some((r) => r.collectionId === c1.id));
    assert.ok(rels.some((r) => r.collectionId === c2.id));
    await cleanup();
  });

  it("update curtain category collections replaces all assignments", async () => {
    await cleanup();
    const [c1, c2] = await seedCollections();

    const category = await prisma.curtainCategory.create({
      data: {
        name: "Test Category",
        slug: "test-category",
        mechanism: "roller",
      },
    });

    await prisma.collectionCategory.create({
      data: { collectionId: c1.id, categoryId: category.id },
    });

    // Replace with c2 only
    await prisma.collectionCategory.deleteMany({ where: { categoryId: category.id } });
    await prisma.collectionCategory.create({
      data: { collectionId: c2.id, categoryId: category.id },
    });

    const rels = await prisma.collectionCategory.findMany({
      where: { categoryId: category.id },
      select: { collectionId: true },
    });
    assert.strictEqual(rels.length, 1);
    assert.strictEqual(rels[0].collectionId, c2.id);
    await cleanup();
  });

  it("omit collectionIds on update preserves existing assignments", async () => {
    await cleanup();
    const [c1] = await seedCollections();

    const category = await prisma.curtainCategory.create({
      data: {
        name: "Test Category",
        slug: "test-category",
        mechanism: "roller",
      },
    });

    await prisma.collectionCategory.create({
      data: { collectionId: c1.id, categoryId: category.id },
    });

    // Update category without touching collections
    await prisma.curtainCategory.update({
      where: { id: category.id },
      data: { name: "Updated Category" },
    });

    const rels = await prisma.collectionCategory.findMany({
      where: { categoryId: category.id },
      select: { collectionId: true },
    });
    assert.strictEqual(rels.length, 1);
    assert.strictEqual(rels[0].collectionId, c1.id);
    await cleanup();
  });

  it("retrieve curtain category collection IDs", async () => {
    await cleanup();
    const [c1] = await seedCollections();

    const category = await prisma.curtainCategory.create({
      data: {
        name: "Test Category",
        slug: "test-category",
        mechanism: "roller",
      },
    });

    await prisma.collectionCategory.create({
      data: { collectionId: c1.id, categoryId: category.id },
    });

    const rels = await prisma.collectionCategory.findMany({
      where: { categoryId: category.id },
      select: { collectionId: true },
    });
    assert.strictEqual(rels.length, 1);
    assert.strictEqual(rels[0].collectionId, c1.id);
    await cleanup();
  });
});

describe("Collection relationships — Project → CollectionProject", () => {
  it("create project with collections", async () => {
    await cleanup();
    const [c1, c2] = await seedCollections();

    const project = await prisma.project.create({
      data: {
        title: "Test Project",
        categorySlug: "roller",
      },
    });

    await prisma.collectionProject.createMany({
      data: [
        { collectionId: c1.id, projectId: project.id },
        { collectionId: c2.id, projectId: project.id },
      ],
    });

    const rels = await prisma.collectionProject.findMany({
      where: { projectId: project.id },
      select: { collectionId: true },
    });
    assert.strictEqual(rels.length, 2);
    assert.ok(rels.some((r) => r.collectionId === c1.id));
    assert.ok(rels.some((r) => r.collectionId === c2.id));
    await cleanup();
  });

  it("update project collections replaces all assignments", async () => {
    await cleanup();
    const [c1, c2] = await seedCollections();

    const project = await prisma.project.create({
      data: {
        title: "Test Project",
        categorySlug: "roller",
      },
    });

    await prisma.collectionProject.create({
      data: { collectionId: c1.id, projectId: project.id },
    });

    // Replace with c2 only
    await prisma.collectionProject.deleteMany({ where: { projectId: project.id } });
    await prisma.collectionProject.create({
      data: { collectionId: c2.id, projectId: project.id },
    });

    const rels = await prisma.collectionProject.findMany({
      where: { projectId: project.id },
      select: { collectionId: true },
    });
    assert.strictEqual(rels.length, 1);
    assert.strictEqual(rels[0].collectionId, c2.id);
    await cleanup();
  });

  it("omit collectionIds on update preserves existing assignments", async () => {
    await cleanup();
    const [c1] = await seedCollections();

    const project = await prisma.project.create({
      data: {
        title: "Test Project",
        categorySlug: "roller",
      },
    });

    await prisma.collectionProject.create({
      data: { collectionId: c1.id, projectId: project.id },
    });

    // Update project without touching collections
    await prisma.project.update({
      where: { id: project.id },
      data: { title: "Updated Project" },
    });

    const rels = await prisma.collectionProject.findMany({
      where: { projectId: project.id },
      select: { collectionId: true },
    });
    assert.strictEqual(rels.length, 1);
    assert.strictEqual(rels[0].collectionId, c1.id);
    await cleanup();
  });

  it("retrieve project collection IDs", async () => {
    await cleanup();
    const [c1] = await seedCollections();

    const project = await prisma.project.create({
      data: {
        title: "Test Project",
        categorySlug: "roller",
      },
    });

    await prisma.collectionProject.create({
      data: { collectionId: c1.id, projectId: project.id },
    });

    const rels = await prisma.collectionProject.findMany({
      where: { projectId: project.id },
      select: { collectionId: true },
    });
    assert.strictEqual(rels.length, 1);
    assert.strictEqual(rels[0].collectionId, c1.id);
    await cleanup();
  });
});

describe("Collection relationships — validation", () => {
  it("rejects non-existent collection IDs", async () => {
    await cleanup();
    await seedCollections();

    let error: unknown = null;
    try {
      await prisma.collectionProduct.create({
        data: { collectionId: "non-existent-id", productId: "also-non-existent" },
      });
    } catch (e) {
      error = e;
    }
    // The foreign key constraint should reject this
    assert.ok(error, "Expected foreign key constraint error for non-existent collection ID");
    await cleanup();
  });
});
