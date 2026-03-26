ALTER TABLE "Leave" ADD COLUMN "title" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Complaint" ADD COLUMN "assignedToId" TEXT;

CREATE TABLE "StudentFaculty" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentFaculty_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentFaculty_studentId_memberId_key" ON "StudentFaculty"("studentId", "memberId");

ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "AdminMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudentFaculty" ADD CONSTRAINT "StudentFaculty_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentFaculty" ADD CONSTRAINT "StudentFaculty_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "AdminMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
