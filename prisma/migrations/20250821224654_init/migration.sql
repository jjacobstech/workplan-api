-- CreateEnum
CREATE TYPE "public"."Status" AS ENUM ('PENDING', 'COMPLETED', 'IN_PROGRESS');

-- CreateEnum
CREATE TYPE "public"."Day" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY');

-- CreateEnum
CREATE TYPE "public"."Month" AS ENUM ('JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER');

-- CreateEnum
CREATE TYPE "public"."Week" AS ENUM ('WEEK_1', 'WEEK_2', 'WEEK_3', 'WEEK_4', 'WEEK_5');

-- CreateEnum
CREATE TYPE "public"."Priority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "public"."Completed" AS ENUM ('YES', 'NO');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "employee_id" TEXT NOT NULL,
    "ministry_id" INTEGER,
    "department_id" INTEGER,
    "unit_id" INTEGER,
    "password" TEXT NOT NULL,
    "role" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "head_of_department" BOOLEAN NOT NULL DEFAULT false,
    "head_of_service" BOOLEAN NOT NULL DEFAULT false,
    "head_of_unit" BOOLEAN NOT NULL DEFAULT false,
    "permanent_secretary" BOOLEAN NOT NULL DEFAULT false,
    "staff" BOOLEAN NOT NULL DEFAULT false,
    "avatar" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Plan" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "month" "public"."Month" NOT NULL,
    "month_order" INTEGER NOT NULL,
    "week" "public"."Week" NOT NULL,
    "week_order" INTEGER NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Task" (
    "id" SERIAL NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "day" "public"."Day" NOT NULL,
    "day_order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "tools" TEXT NOT NULL,
    "priority" "public"."Priority" NOT NULL,
    "time" TEXT NOT NULL,
    "status" "public"."Status" NOT NULL,
    "constraints" TEXT NOT NULL,
    "completed" "public"."Completed",
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "date" TEXT NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Ministry" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ministry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Department" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "ministry_id" INTEGER NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Unit" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "department_id" INTEGER NOT NULL,
    "ministry_id" INTEGER NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" SERIAL NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT NOT NULL,
    "last_activity" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_employee_id_key" ON "public"."User"("employee_id");

-- CreateIndex
CREATE INDEX "Plan_id_approved_idx" ON "public"."Plan"("id", "approved");

-- CreateIndex
CREATE INDEX "Plan_user_id_idx" ON "public"."Plan"("user_id");

-- CreateIndex
CREATE INDEX "Plan_month_order_idx" ON "public"."Plan"("month_order");

-- CreateIndex
CREATE INDEX "Plan_week_order_idx" ON "public"."Plan"("week_order");

-- CreateIndex
CREATE INDEX "Task_plan_id_idx" ON "public"."Task"("plan_id");

-- CreateIndex
CREATE INDEX "Task_day_order_idx" ON "public"."Task"("day_order");

-- CreateIndex
CREATE UNIQUE INDEX "Ministry_id_key" ON "public"."Ministry"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Ministry_name_key" ON "public"."Ministry"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Department_id_key" ON "public"."Department"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_ministry_id_key" ON "public"."Department"("name", "ministry_id");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_id_key" ON "public"."Unit"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_name_department_id_ministry_id_key" ON "public"."Unit"("name", "department_id", "ministry_id");

-- CreateIndex
CREATE UNIQUE INDEX "Session_session_id_key" ON "public"."Session"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "public"."Session"("token");

-- CreateIndex
CREATE INDEX "Session_user_id_idx" ON "public"."Session"("user_id");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "public"."Session"("token");

-- CreateIndex
CREATE INDEX "Session_user_agent_idx" ON "public"."Session"("user_agent");

-- CreateIndex
CREATE INDEX "Session_ip_address_idx" ON "public"."Session"("ip_address");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_ministry_id_fkey" FOREIGN KEY ("ministry_id") REFERENCES "public"."Ministry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "public"."Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Plan" ADD CONSTRAINT "Plan_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Task" ADD CONSTRAINT "Task_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Department" ADD CONSTRAINT "Department_ministry_id_fkey" FOREIGN KEY ("ministry_id") REFERENCES "public"."Ministry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Unit" ADD CONSTRAINT "Unit_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Unit" ADD CONSTRAINT "Unit_ministry_id_fkey" FOREIGN KEY ("ministry_id") REFERENCES "public"."Ministry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
