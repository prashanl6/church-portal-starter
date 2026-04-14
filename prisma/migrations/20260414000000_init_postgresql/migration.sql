-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'guest',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" SERIAL NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "submitterId" INTEGER NOT NULL,
    "approver1Id" INTEGER,
    "approver2Id" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "comment1" TEXT,
    "comment2" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "actorId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "theme" TEXT,
    "resourceType" TEXT NOT NULL,
    "resourceId" INTEGER NOT NULL,
    "beforeJson" TEXT,
    "afterJson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" SERIAL NOT NULL,
    "reference" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL,
    "labelCategory" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChurchIndividual" (
    "id" SERIAL NOT NULL,
    "displayName" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "dateOfDeath" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChurchIndividual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeddingAnniversary" (
    "id" SERIAL NOT NULL,
    "individualAId" INTEGER NOT NULL,
    "individualBId" INTEGER NOT NULL,
    "anniversaryDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeddingAnniversary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notice" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "weekOf" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sermon" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "speaker" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "dateOnly" TIMESTAMP(3) NOT NULL,
    "link" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'published',
    "tagsJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sermon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SermonRating" (
    "id" SERIAL NOT NULL,
    "sermonId" INTEGER NOT NULL,
    "clientId" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SermonRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessDoc" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "ownerUserId" INTEGER NOT NULL,
    "contentHtml" TEXT NOT NULL,
    "audience" TEXT NOT NULL DEFAULT 'public',
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessDoc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessAttachment" (
    "id" SERIAL NOT NULL,
    "processDocId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "storedPath" TEXT NOT NULL,
    "mimeType" TEXT,
    "byteSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" SERIAL NOT NULL,
    "bookingRef" TEXT NOT NULL,
    "hall" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "requesterName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "paymentRef" TEXT,
    "amount" DOUBLE PRECISION,
    "slipUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HallBookingSettings" (
    "id" INTEGER NOT NULL,
    "ratePer30Minutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HallBookingSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChurchBankAccount" (
    "id" INTEGER NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChurchBankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChurchBankAccountProposal" (
    "id" SERIAL NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChurchBankAccountProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalItem" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "quantityTotal" INTEGER NOT NULL,
    "quantityAvailable" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "MedicalItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalLoan" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "givenTo" TEXT NOT NULL,
    "givenByUserId" INTEGER NOT NULL,
    "requestDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedByAdminId" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "issuedAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "returned" BOOLEAN NOT NULL DEFAULT false,
    "returnedAt" TIMESTAMP(3),
    "conditionOnReturn" TEXT,

    CONSTRAINT "MedicalLoan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Upload" (
    "id" SERIAL NOT NULL,
    "ownerUserId" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksum" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Upload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "WeddingAnniversary_individualAId_idx" ON "WeddingAnniversary"("individualAId");

-- CreateIndex
CREATE INDEX "WeddingAnniversary_individualBId_idx" ON "WeddingAnniversary"("individualBId");

-- CreateIndex
CREATE UNIQUE INDEX "Sermon_dateOnly_key" ON "Sermon"("dateOnly");

-- CreateIndex
CREATE INDEX "SermonRating_sermonId_idx" ON "SermonRating"("sermonId");

-- CreateIndex
CREATE UNIQUE INDEX "SermonRating_sermonId_clientId_key" ON "SermonRating"("sermonId", "clientId");

-- CreateIndex
CREATE INDEX "ProcessDoc_audience_idx" ON "ProcessDoc"("audience");

-- CreateIndex
CREATE INDEX "ProcessAttachment_processDocId_idx" ON "ProcessAttachment"("processDocId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_bookingRef_key" ON "Booking"("bookingRef");

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_approver1Id_fkey" FOREIGN KEY ("approver1Id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_approver2Id_fkey" FOREIGN KEY ("approver2Id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeddingAnniversary" ADD CONSTRAINT "WeddingAnniversary_individualAId_fkey" FOREIGN KEY ("individualAId") REFERENCES "ChurchIndividual"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeddingAnniversary" ADD CONSTRAINT "WeddingAnniversary_individualBId_fkey" FOREIGN KEY ("individualBId") REFERENCES "ChurchIndividual"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SermonRating" ADD CONSTRAINT "SermonRating_sermonId_fkey" FOREIGN KEY ("sermonId") REFERENCES "Sermon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessAttachment" ADD CONSTRAINT "ProcessAttachment_processDocId_fkey" FOREIGN KEY ("processDocId") REFERENCES "ProcessDoc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalLoan" ADD CONSTRAINT "MedicalLoan_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MedicalItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

