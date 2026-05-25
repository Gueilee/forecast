-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'VIEWER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "nameReduced" TEXT NOT NULL,
    "nameChart" TEXT,
    "accountManager" TEXT,
    "commercialType" TEXT,
    "pl4Bu" TEXT,
    "entity" TEXT,
    "category" TEXT,
    "categoryBkNv" TEXT,
    "analytics" BOOLEAN NOT NULL DEFAULT false,
    "modality" TEXT,
    "conexosCode" INTEGER,
    "conexosName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BudgetEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "plan" REAL NOT NULL DEFAULT 0,
    "fcMonth" REAL,
    "orders" REAL,
    "withoutOrders" REAL,
    "mbPlanPct" REAL,
    "mbFcPct" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BudgetEntry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActualNF" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT,
    "conexosClientCode" INTEGER,
    "clientNameRaw" TEXT NOT NULL,
    "buName" TEXT,
    "filial" INTEGER,
    "invoiceNumber" TEXT NOT NULL,
    "emissionDate" DATETIME NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "weekOfMonth" INTEGER NOT NULL,
    "cfop" TEXT,
    "scope" TEXT,
    "processRef" TEXT,
    "totProduct" REAL NOT NULL DEFAULT 0,
    "totNet" REAL NOT NULL DEFAULT 0,
    "icms" REAL,
    "icmsSt" REAL,
    "iss" REAL,
    "pis" REAL,
    "cofins" REAL,
    "ipi" REAL,
    "marginLiquid" REAL,
    "source" TEXT NOT NULL DEFAULT 'API',
    "syncJobId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActualNF_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActualWeekly" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "weekOfMonth" INTEGER NOT NULL,
    "totFaturado" REAL NOT NULL DEFAULT 0,
    "totProduct" REAL NOT NULL DEFAULT 0,
    "icms" REAL,
    "pis" REAL,
    "cofins" REAL,
    "ipi" REAL,
    "marginLiquid" REAL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ActualWeekly_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ForecastRevision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" REAL,
    "newValue" REAL NOT NULL,
    "comment" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ForecastRevision_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ForecastRevision_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WeekComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "weekOfMonth" INTEGER,
    "comment" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WeekComment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WeekComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SyncJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "recordsTotal" INTEGER NOT NULL DEFAULT 0,
    "recordsNew" INTEGER NOT NULL DEFAULT 0,
    "recordsUpdated" INTEGER NOT NULL DEFAULT 0,
    "errors" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "triggeredBy" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "BudgetEntry_year_month_idx" ON "BudgetEntry"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetEntry_clientId_year_month_key" ON "BudgetEntry"("clientId", "year", "month");

-- CreateIndex
CREATE INDEX "ActualNF_year_month_weekOfMonth_idx" ON "ActualNF"("year", "month", "weekOfMonth");

-- CreateIndex
CREATE INDEX "ActualNF_clientId_year_month_idx" ON "ActualNF"("clientId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "ActualNF_invoiceNumber_filial_key" ON "ActualNF"("invoiceNumber", "filial");

-- CreateIndex
CREATE INDEX "ActualWeekly_year_month_idx" ON "ActualWeekly"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "ActualWeekly_clientId_year_month_weekOfMonth_key" ON "ActualWeekly"("clientId", "year", "month", "weekOfMonth");

-- CreateIndex
CREATE INDEX "ForecastRevision_clientId_year_month_idx" ON "ForecastRevision"("clientId", "year", "month");

-- CreateIndex
CREATE INDEX "WeekComment_clientId_year_month_idx" ON "WeekComment"("clientId", "year", "month");
