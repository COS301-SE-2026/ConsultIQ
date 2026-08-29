import { EncryptionPrismaClient } from "./client-extension.service";
import { getEncryptedFields, hasEncryptedFields } from "./encryption.config";
import { encrypt, decrypt } from "./crypto.service"


jest.mock("@prisma/client", () => {
    return {
        PrismaClient: class {
            $connect = jest.fn().mockResolvedValue(undefined);
            $disconnect = jest.fn().mockResolvedValue(undefined);
            $extends(config: unknown) {
                return config;
            }
        },
    };
});

jest.mock("./encryption.config", () => ({
    getEncryptedFields: jest.fn(),
    hasEncryptedFields: jest.fn(),

}));

jest.mock("./crypto.service", () => ({
    encrypt: jest.fn(),
    decrypt: jest.fn(),
}));

const mockedGetEncryptedFields = getEncryptedFields as jest.Mock;
const mockedHasEncryptedFields = hasEncryptedFields as jest.Mock;
const mockedEncrypt = encrypt as jest.Mock;
const mockedDecrypt = decrypt as jest.Mock;

describe("EncryptionPrismaClient", () => {

    const ENV = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...ENV, ENCRYPTION_KEY: "test-key" }
    });

    afterAll(() => {
        process.env = ENV;
    });

    function getAllOperations(client: EncryptionPrismaClient){
        const extended: any = client.client;
        return extended.query.$allModels.$allOperations;
    }

    describe("client getter", () => {
        it("build the extended client", () => {
            const client = new EncryptionPrismaClient();
            const spy = jest.spyOn(client as any, "buildExtendedClient");

            const first = client.client;
            const second = client.client;

            expect(spy).toHaveBeenCalledTimes(1);
            expect(first).toBe(second);
        });

    });

    describe("$allOperations", ()=>{
         function getAllOperations(client: EncryptionPrismaClient){
        const extended: any = client.client;
        return extended.query.$allModels.$allOperations;
    }
        it("skips encryption and decryption when the model has no encrypted fields",async ()=>{
            mockedHasEncryptedFields.mockReturnValue(false);

            const client = new EncryptionPrismaClient();
            const allOps = getAllOperations(client);
            
            const args = {data: {name: "unencrypted"}};
            const query= jest.fn().mockResolvedValue({id:1, name: "unencrypted"});

            const result= await allOps({model: "User", operation:"create",args,query});

            expect(mockedHasEncryptedFields).toHaveBeenCalledWith("User");
            expect(mockedGetEncryptedFields).not.toHaveBeenCalled();
            expect(mockedEncrypt).not.toHaveBeenCalled();
            expect(mockedDecrypt).not.toHaveBeenCalled();
            expect(query).toHaveBeenCalledWith(args);
            expect(result).toEqual({id:1, name: "unencrypted"});
        });

         it("handles a null or undefined ",async ()=>{
            mockedHasEncryptedFields.mockReturnValue(false);
            const client = new EncryptionPrismaClient();
            const allOps = getAllOperations(client);

            const query= jest.fn().mockResolvedValue(null);

            await allOps({model: undefined, operation:"queryRaw",args:{},query});

            expect(mockedHasEncryptedFields).toHaveBeenCalledWith("");


         });

         it.each(["create","update","upsert","createMany","updateMany"])(
            "encrypts matching fields on %s before calling query",

            async (op) =>{
                mockedHasEncryptedFields.mockReturnValue(true);
                mockedGetEncryptedFields.mockReturnValue(["phone"]);
                mockedEncrypt.mockReturnValue({
                    IV: Buffer.from("iv-bytes"),
                    tag: Buffer.from("tag-bytes"),
                    ciphertext: Buffer.from("cipher-bytes"),
                });

                const client = new EncryptionPrismaClient();
                const allOps = getAllOperations(client);

                const args = {data: {phone:"0123456789",name: "Alice"}};
                const query= jest.fn().mockResolvedValue(null);

                await allOps({model: "Consultant", operation:op,args,query});

                expect(mockedEncrypt).toHaveBeenCalledWith("0123456789","test-key");
                expect(args.data.phone).toBe([
                    Buffer.from("iv-bytes").toString("base64"),
                    Buffer.from("tag-bytes").toString("base64"),
                    Buffer.from("cipher-bytes").toString("base64"),
                ].join(":"),
            );

                expect(args.data.name).toBe("Alice");
                expect(query).toHaveBeenCalledWith(args);
            },
         );

         it("decrypts matching fields on the returned result", async () =>{
             mockedHasEncryptedFields.mockReturnValue(true);
            mockedGetEncryptedFields.mockReturnValue(["phone"]);
            mockedDecrypt.mockReturnValue("0123456789");

            const client = new EncryptionPrismaClient();
            const allOperations= getAllOperations(client);
            
            const encoded = [
                Buffer.from("iv").toString("base64"),
                Buffer.from("tag").toString("base64"),
                Buffer.from("cipher").toString("base64"),

            ].join(":");

             const query= jest.fn().mockResolvedValue({phone: encoded});

            const result = await allOperations({model: "Consultant",operation:"findUnique",args:{},query});

            expect(mockedDecrypt).toHaveBeenCalledWith(
                "test-key",
                Buffer.from("iv"),
                Buffer.from("tag"),
                Buffer.from("cipher"),

            );

            expect(result.phone).toBe("0123456789");
         });

         it("decrypts every item when the result is an array",async () => {

            mockedHasEncryptedFields.mockReturnValue(true);
            mockedGetEncryptedFields.mockReturnValue(["phone"]);
            mockedDecrypt.mockReturnValue("decrypted");

            const client = new EncryptionPrismaClient();
            const allOperations= getAllOperations(client);
            
            const encoded = [
                Buffer.from("a").toString("base64"),
                Buffer.from("b").toString("base64"),
                Buffer.from("c").toString("base64"),

            ].join(":");

             const query= jest.fn().mockResolvedValue([{phone: encoded},{phone: encoded}]);

            const result = await allOperations({model: "Consultant",operation:"findMany",args:{},query});

            expect(mockedDecrypt).toHaveBeenCalledTimes(2);
            expect(result[0].phone).toBe("decrypted");
            expect(result[1].phone).toBe("decrypted");
         });

         it("recurses into nested objects when encrypting and decrypting",async () => {
                 mockedHasEncryptedFields.mockReturnValue(true);
                mockedGetEncryptedFields.mockReturnValue(["phone"]);
                mockedEncrypt.mockReturnValue({
                    IV: Buffer.from("iv-bytes"),
                    tag: Buffer.from("tag-bytes"),
                    ciphertext: Buffer.from("cipher-bytes"),
                });

                const client = new EncryptionPrismaClient();
                const allOps = getAllOperations(client);

                const args = {data:{profile: {phone:"0123456789"}} };
                const query= jest.fn().mockResolvedValue(null);

                await allOps({model: "Consultant", operation: "create",args,query});

                expect(mockedEncrypt).toHaveBeenCalledWith("0123456789","test-key");
                expect(args.data.profile.phone).not.toBe("0123456789");
         });



    });

    describe("encryptWriteData and decryptReadData", () => {
        it("encryptWriteData handles arrays of records", () => {
            mockedEncrypt.mockReturnValue({
                IV: Buffer.from("iv"),
                tag: Buffer.from("tag"),
                ciphertext: Buffer.from("cipher"),
            });

            const client = new EncryptionPrismaClient();
            const data = [{ phone: "0721112222" }, { phone: "0823334444" }];

            (client as any).encryptWriteData(data, ["phone"]);

            expect(mockedEncrypt).toHaveBeenCalledTimes(2);
            expect(mockedEncrypt).toHaveBeenNthCalledWith(1, "0721112222", "test-key");
            expect(mockedEncrypt).toHaveBeenNthCalledWith(2, "0823334444", "test-key");

        });

        it("decryptReadData does nothing for null,undefined and non-object input", () => {
            const client = new EncryptionPrismaClient();

            expect(() => (client as any).decryptReadData(null, ["phone"])).not.toThrow();
            expect(() => (client as any).decryptReadData(undefined, ["phone"])).not.toThrow();
            expect(() => (client as any).decryptReadData("string", ["phone"])).not.toThrow();
            expect(mockedDecrypt).not.toHaveBeenCalled();
        });

    });

});