import { Module } from "@nestjs/common";
import { PrismaService } from "src/common/__mocks__/prisma.service";
import { AdminUserService } from "./users/services/admin.user.service";
import { AdminController } from "src/controllers/admin/admin.controller";

@Module({
    imports: [PrismaService],
    providers: [AdminUserService],
    controllers: [AdminController],
})

export class AdminModule { }
