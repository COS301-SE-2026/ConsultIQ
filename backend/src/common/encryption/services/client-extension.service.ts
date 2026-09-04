import { PrismaClient } from "@prisma/client";
import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { getEncryptedFields, hasEncryptedFields } from "./encryption.config"
import { encrypt, decrypt, } from "./crypto.service"

@Injectable()
export class EncryptionPrismaClient extends PrismaClient implements OnModuleInit, OnModuleDestroy {

    private readonly secretKey: string;
    constructor(){
        super();
        const key = process.env.ENCRYPTION_KEY;
        if(!key){
            throw new Error("ENCRYPTION_KEY environment variable is not set");
        }
       this.secretKey=key;
    }


    async onModuleInit() {
        await this.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }

    private extendedClient?: ReturnType<EncryptionPrismaClient["buildExtendedClient"]>;

    get client(){
        if(!this.extendedClient){
            this.extendedClient= this.buildExtendedClient();
        }
        return this.extendedClient;
    }

    private buildExtendedClient() {
        return this.$extends({
            query: {
                $allModels: {
                     $allOperations: async ({ model, operation, args, query }) => {

                        if(!hasEncryptedFields(model ?? "")){
                            return query(args);
                        }

                        const fieldsToEncrypt= getEncryptedFields(model);

                        if (["create", "update", "upsert", "createMany", "updateMany"].includes(operation)) {
                            const writableArgs= args as {data?: unknown};
                            if (writableArgs.data) {
                                this.encryptWriteData(writableArgs.data,fieldsToEncrypt);
                            }
                        }

                        const result = await query(args);

                        if (result) {
                            this.decryptReadData(result,fieldsToEncrypt);
                        }

                        return result;
                    },
                },
            },
        });
    }

    private encryptWriteData(data: any, fieldsToEncrypt: string[]) {
        if (!data || typeof data !== "object") {
            return;
        }

        if (Array.isArray(data)) {
            data.forEach((item) => this.encryptWriteData(item, fieldsToEncrypt));
            return;
        }

        for(const key of Object.keys(data)){
            const value= data[key];

            if(fieldsToEncrypt.includes(key) && typeof value === "string"){
                const{IV,tag,ciphertext}= encrypt(value,this.secretKey);
                data[key]=`${IV.toString("base64")}:${tag.toString("base64")}:${ciphertext.toString("base64")}`;
            }else if(value && typeof value === "object"){
                this.encryptWriteData(value,fieldsToEncrypt);
            }
        }



    }

    private decryptReadData(result: any, fieldsToEncrypt: string[]) {
        if (!result || typeof result !== "object"){
            return;
        }

         if (Array.isArray(result)) {
            result.forEach((item) => this.decryptReadData(item, fieldsToEncrypt));
            return;
        }

        for(const key of Object.keys(result)){
            const value = result[key];

            if(fieldsToEncrypt.includes(key) && typeof value === "string"){
                try {
                    const parts = value.split(":");
                    if(parts.length === 3){
                        const iv= Buffer.from(parts[0], "base64");
                        const tag = Buffer.from(parts[1],"base64");
                        const ciphertext= Buffer.from(parts[2], "base64");

                        result[key]= decrypt(this.secretKey,iv,tag,ciphertext);
                    }
                } catch{
                    result[key]=value;
                }
            }else if(value && typeof value === "object"){
                this.decryptReadData(value,fieldsToEncrypt);

            }
        }

    }
}