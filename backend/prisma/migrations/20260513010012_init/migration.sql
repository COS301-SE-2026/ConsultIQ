-- CreateTable
CREATE TABLE "User" (
    "userID" SERIAL NOT NULL,
    "roleID" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "surname" TEXT NOT NULL,
    "IDNumber" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "PhoneNumber" TEXT NOT NULL,
    "tokens" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("userID")
);

-- CreateTable
CREATE TABLE "Role" (
    "roleID" SERIAL NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("roleID")
);

-- CreateTable
CREATE TABLE "Permission" (
    "permissionID" SERIAL NOT NULL,
    "roleID" INTEGER NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("permissionID")
);

-- CreateTable
CREATE TABLE "role_permission" (
    "permissionID" INTEGER NOT NULL,
    "roleID" INTEGER NOT NULL,

    CONSTRAINT "role_permission_pkey" PRIMARY KEY ("permissionID","roleID")
);

-- CreateTable
CREATE TABLE "Consultant" (
    "consultantID" SERIAL NOT NULL,
    "UserID" INTEGER NOT NULL,
    "availability" BOOLEAN NOT NULL,
    "location" TEXT NOT NULL,

    CONSTRAINT "Consultant_pkey" PRIMARY KEY ("consultantID")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "certificateID" SERIAL NOT NULL,
    "consultantID" INTEGER NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("certificateID")
);

-- CreateTable
CREATE TABLE "Skills" (
    "skillID" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Skills_pkey" PRIMARY KEY ("skillID")
);

-- CreateTable
CREATE TABLE "ConsultantSkills" (
    "consultantSkillsID" SERIAL NOT NULL,
    "consultantID" INTEGER NOT NULL,
    "skillID" INTEGER NOT NULL,
    "competencyLevel" TEXT NOT NULL,
    "experience" TEXT NOT NULL,

    CONSTRAINT "ConsultantSkills_pkey" PRIMARY KEY ("consultantSkillsID")
);

-- CreateTable
CREATE TABLE "Project" (
    "projectID" SERIAL NOT NULL,
    "project" TEXT NOT NULL,
    "teamSize" INTEGER NOT NULL,
    "location" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "budget" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("projectID")
);

-- CreateTable
CREATE TABLE "ProjectSkills" (
    "skillsProjectID" SERIAL NOT NULL,
    "skillID" INTEGER NOT NULL,
    "projectID" INTEGER NOT NULL,

    CONSTRAINT "ProjectSkills_pkey" PRIMARY KEY ("skillsProjectID")
);

-- CreateTable
CREATE TABLE "ProjectManager" (
    "projectManagerID" SERIAL NOT NULL,
    "userID" INTEGER NOT NULL,
    "projectID" INTEGER NOT NULL,

    CONSTRAINT "ProjectManager_pkey" PRIMARY KEY ("projectManagerID")
);

-- CreateTable
CREATE TABLE "ProjectPlacement" (
    "projectPlacementId" SERIAL NOT NULL,
    "projectID" INTEGER NOT NULL,
    "consultantID" INTEGER NOT NULL,

    CONSTRAINT "ProjectPlacement_pkey" PRIMARY KEY ("projectPlacementId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Consultant_UserID_key" ON "Consultant"("UserID");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleID_fkey" FOREIGN KEY ("roleID") REFERENCES "Role"("roleID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_roleID_fkey" FOREIGN KEY ("roleID") REFERENCES "Role"("roleID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_permissionID_fkey" FOREIGN KEY ("permissionID") REFERENCES "Permission"("permissionID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultant" ADD CONSTRAINT "Consultant_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "User"("userID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_consultantID_fkey" FOREIGN KEY ("consultantID") REFERENCES "Consultant"("consultantID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantSkills" ADD CONSTRAINT "ConsultantSkills_consultantID_fkey" FOREIGN KEY ("consultantID") REFERENCES "Consultant"("consultantID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantSkills" ADD CONSTRAINT "ConsultantSkills_skillID_fkey" FOREIGN KEY ("skillID") REFERENCES "Skills"("skillID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSkills" ADD CONSTRAINT "ProjectSkills_skillID_fkey" FOREIGN KEY ("skillID") REFERENCES "Skills"("skillID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSkills" ADD CONSTRAINT "ProjectSkills_projectID_fkey" FOREIGN KEY ("projectID") REFERENCES "Project"("projectID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectManager" ADD CONSTRAINT "ProjectManager_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("userID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectManager" ADD CONSTRAINT "ProjectManager_projectID_fkey" FOREIGN KEY ("projectID") REFERENCES "Project"("projectID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectPlacement" ADD CONSTRAINT "ProjectPlacement_projectID_fkey" FOREIGN KEY ("projectID") REFERENCES "Project"("projectID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectPlacement" ADD CONSTRAINT "ProjectPlacement_consultantID_fkey" FOREIGN KEY ("consultantID") REFERENCES "Consultant"("consultantID") ON DELETE RESTRICT ON UPDATE CASCADE;
