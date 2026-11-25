-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "images" JSONB NOT NULL,
    "material" TEXT NOT NULL,
    "dimensions" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "monthlyPaise" INTEGER NOT NULL,
    "purchasePaise" INTEGER NOT NULL,
    "depositPaise" INTEGER NOT NULL DEFAULT 0,
    "stock" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "companyId" TEXT NOT NULL DEFAULT 'lyor-demo',
    "cities" TEXT[],
    "variants" JSONB NOT NULL,
    "components" JSONB NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cart" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT,
    "city" TEXT NOT NULL DEFAULT 'noida',
    "lines" JSONB NOT NULL DEFAULT '[]',
    "revision" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "cartRevision" INTEGER NOT NULL,
    "ownerId" TEXT,
    "city" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "lines" JSONB NOT NULL,
    "breakdown" JSONB NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderIntent" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL DEFAULT 'lyor-demo',
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" JSONB NOT NULL,
    "lines" JSONB NOT NULL,
    "breakdown" JSONB NOT NULL,
    "orderState" TEXT NOT NULL DEFAULT 'pending',
    "paymentState" TEXT NOT NULL DEFAULT 'not_collected',
    "stockState" TEXT NOT NULL DEFAULT 'unreserved',
    "deliveryState" TEXT NOT NULL DEFAULT 'not_scheduled',
    "externalId" TEXT,
    "failureReason" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderIntent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "leaseUntil" TIMESTAMP(3),
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessEnquiry" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "contact" JSONB NOT NULL,
    "sites" JSONB NOT NULL,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'received',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessEnquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "detail" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "OrderIntent_quoteId_key" ON "OrderIntent"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderIntent_externalId_key" ON "OrderIntent"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderIntent_ownerId_idempotencyKey_key" ON "OrderIntent"("ownerId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "OutboxEvent_orderId_key" ON "OutboxEvent"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_orderId_productId_key" ON "Reservation"("orderId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessEnquiry_idempotencyKey_key" ON "BusinessEnquiry"("idempotencyKey");

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderIntent" ADD CONSTRAINT "OrderIntent_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboxEvent" ADD CONSTRAINT "OutboxEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "OrderIntent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "OrderIntent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
