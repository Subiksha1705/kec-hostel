DO $$ BEGIN
  CREATE TYPE "Gender" AS ENUM ('MALE','FEMALE','OTHER');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE','INACTIVE','PASSED_OUT');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "FeeStatus" AS ENUM ('PAID','PENDING','OVERDUE');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "LeaveType" AS ENUM ('SICK','PERSONAL','EMERGENCY','OD');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE "Student" ALTER COLUMN "gender" TYPE "Gender" USING "gender"::"Gender";
ALTER TABLE "Student" ALTER COLUMN "status" TYPE "StudentStatus" USING "status"::"StudentStatus";
ALTER TABLE "Student" ALTER COLUMN "feeStatus" TYPE "FeeStatus" USING "feeStatus"::"FeeStatus";

ALTER TABLE "Student" ALTER COLUMN "profileImage" DROP NOT NULL;
ALTER TABLE "Student" ALTER COLUMN "idCardPdf" DROP NOT NULL;
ALTER TABLE "Student" ALTER COLUMN "checkOutDate" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS "Student_collegeId_idx" ON "Student"("collegeId");
CREATE INDEX IF NOT EXISTS "Student_classId_idx" ON "Student"("classId");
CREATE INDEX IF NOT EXISTS "Student_hostelId_idx" ON "Student"("hostelId");

ALTER TABLE "Leave" ADD COLUMN IF NOT EXISTS "leaveType" "LeaveType" NOT NULL DEFAULT 'PERSONAL';
ALTER TABLE "Leave" ADD COLUMN IF NOT EXISTS "totalDays" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Leave" ADD COLUMN IF NOT EXISTS "documentUrl" TEXT;
ALTER TABLE "Leave" ADD COLUMN IF NOT EXISTS "reviewerComment" TEXT;
ALTER TABLE "Leave" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Leave" ALTER COLUMN "title" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS "Leave_studentId_idx" ON "Leave"("studentId");
CREATE INDEX IF NOT EXISTS "Leave_collegeId_idx" ON "Leave"("collegeId");
CREATE INDEX IF NOT EXISTS "Leave_status_idx" ON "Leave"("status");
