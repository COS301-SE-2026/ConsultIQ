import { Test, TestingModule } from '@nestjs/testing';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';
import { cleanDatabase } from '../../../prisma/prisma-test-utils';
import { EncryptionPrismaClient } from "./services/client-extension.service";
import { EncryptionModule } from './encryption.module';
import { Role, ConsultantAvailability } from '@prisma/client';

function ConsultantData(userId: string) {
        return {
            userId,
            addressLine1: "123 South road",
            addressLine2: "Unit 4",
            suburb: "Hillbrow",
            city: "Johannesburg",
            province: "Gauteng",
            postalCode: "2001",
            phone: "0821234567",
            idNumber: "9901015555081",
            nationality: "South African",
            costToCompany: 50000,
            availability: ConsultantAvailability.AVAILABLE,
            latitude: null,
            longitude: null,
            placeId: null,
            formattedAddress: "123 South road, Hillbrow, Johannesburg",
        };
    }



describe('EncryptionPrismaClient - Integration Test', () => {
    let moduleRef: TestingModule;
    let encryptionClient: EncryptionPrismaClient;
    let prisma: PrismaService;

    beforeAll(async () => {
        moduleRef = await Test.createTestingModule({
            imports: [EncryptionModule, PrismaModule],
        }).compile();

        encryptionClient = moduleRef.get<EncryptionPrismaClient>(EncryptionPrismaClient);
        prisma = moduleRef.get<PrismaService>(PrismaService);
    });

    beforeEach(async () => {
        await cleanDatabase(prisma);
    });

    afterAll(async () => {
        await prisma.$disconnect();
        if (moduleRef) {
            await moduleRef.close();
        }
    });

    async function createTestUser(name: string) {
        return prisma.user.create({
            data: {
                fullName: `${name}`,
                email: `consultant-${name}@test.local`,
                role: Role.CONSULTANT,
            },
        });
    }

    const ciphertext_shape = /^[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/;

    const Plaintext = {
        addressLine1: "123 South road",
        formattedAddress: "123 South road, Hillbrow, Johannesburg",
        phone: "0821234567",
        idNumber: "9901015555081",
        nationality: "South African",
    };

    describe("encryption and decryption of  fields in ENCRYPTION_MAP", () => {

        it("Never stores the plaintext value on fields in Encryption map  in the database", async () => {

            const user1 = await createTestUser("user-1");
            const created = await encryptionClient.client.consultant.create({
                data: ConsultantData(user1.id),
            });

            const rawRow = await prisma.consultant.findUniqueOrThrow({
                where: { id: created.id },
            });

            expect(rawRow.idNumber).not.toBe(Plaintext.idNumber);
            expect(rawRow.addressLine1).not.toBe(Plaintext.addressLine1);
            expect(rawRow.formattedAddress).not.toBe(Plaintext.formattedAddress);
            expect(rawRow.phone).not.toBe(Plaintext.phone);
            expect(rawRow.nationality).not.toBe(Plaintext.nationality);

            expect(rawRow.idNumber).toMatch(ciphertext_shape);
            expect(rawRow.addressLine1).toMatch(ciphertext_shape);
            expect(rawRow.formattedAddress).toMatch(ciphertext_shape);
            expect(rawRow.phone).toMatch(ciphertext_shape);
            expect(rawRow.nationality).toMatch(ciphertext_shape);
        })

        it("leaves unprotected fields untouched", async () => {
            const user2 = await createTestUser("user-2");
            const created = await encryptionClient.client.consultant.create({
                data: ConsultantData(user2.id),
            });

            const rawRow = await prisma.consultant.findUniqueOrThrow({
                where: { id: created.id },
            });

            expect(rawRow.suburb).toBe("Hillbrow");
            expect(rawRow.city).toBe("Johannesburg");
            expect(rawRow.province).toBe("Gauteng");

        });

        it("decrypts protected fields", async () => {
            const user3 = await createTestUser("user-3");
            const created = await encryptionClient.client.consultant.create({
                data: ConsultantData(user3.id),
            });

            const found = await encryptionClient.client.consultant.findUniqueOrThrow({
                where: { id: created.id },
            });

            expect(found.addressLine1).toBe(Plaintext.addressLine1);
            expect(found.formattedAddress).toBe(Plaintext.formattedAddress);
            expect(found.phone).toBe(Plaintext.phone);
            expect(found.idNumber).toBe(Plaintext.idNumber);
            expect(found.nationality).toBe(Plaintext.nationality);
        });



    });

    describe("encrypt updated fields that are in ENCRYPTION_MAP", () => {
        it("encrypt changed fields and reencrypt unchanged ones", async () => {
            const user4 = await createTestUser("user-4");
            const created = await encryptionClient.client.consultant.create({
                data: ConsultantData(user4.id),
            });

            await encryptionClient.client.consultant.update({
                where: { id: created.id },
                data: { phone: "0825845678" },
            });

            const rawRow = await prisma.consultant.findUniqueOrThrow({
                where: { id: created.id },
            });

            expect(rawRow.phone).not.toBe("0825845678");
            expect(rawRow.phone).toMatch(ciphertext_shape);

            const found = await encryptionClient.client.consultant.findUniqueOrThrow({
                where: { id: created.id },
            });

            expect(found.phone).toBe("0825845678");


        });
    });

    describe("$transaction", () => {
        it("encrypts protected fields when $transaction is called on the extended client", async () => {
            const user5 = await createTestUser("user-5");

            const created = await encryptionClient.client.$transaction(async (tx) => {
                return tx.consultant.create({ data: ConsultantData(user5.id) });
            });

            const rawRow = await prisma.consultant.findUniqueOrThrow({
                where: { id: created.id },
            });

            expect(rawRow.idNumber).not.toBe(Plaintext.idNumber);
            expect(rawRow.idNumber).toMatch(ciphertext_shape);
        });

        it ("it doeos not encrypt when $transaction is called on the plain prisma service", async () => {
            const user6 = await createTestUser("user-6");

            const created = await encryptionClient.client.$transaction(async (tx) => {
                return tx.consultant.create({ data: ConsultantData(user6.id) });
            });


            expect(created.idNumber).toBe(Plaintext.idNumber);

        });
    });

});