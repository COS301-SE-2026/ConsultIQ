import { Injectable } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../common/prisma.service";

@Injectable()
export class AuthService {
    constructor(private prisma: PrismaService) {}
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    async hashpassword(password: string) : Promise<string>{
        const salt = await bcrypt.genSalt(10);
        return await bcrypt.hash(password, salt);
    }

    async validatePassword(email: string, password: string) : Promise<object | null>{
        const user = await this.prisma.user.findFirst({
            where: {
                email
            }
        });
        if (!user) {
            return null;
        }

        const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);

        if (!isPasswordValid) {
            return null;
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return user as object;
    }
}