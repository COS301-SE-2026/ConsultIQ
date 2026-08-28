import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH= 12;
const KEY_LENGTH= 32;


export function encrypt(plaintext: string, secretKey: string){

    const key = Buffer.from(secretKey,"base64");
    if(key.length !== KEY_LENGTH){
        throw new Error(`key must be ${KEY_LENGTH} bytes long.`);
    }

    const  IV = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM,key,IV);
    let ciphertext= Buffer.concat([
        cipher.update(plaintext,"utf-8"),
         cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return {
        IV,
        tag,
        ciphertext
    };
}

export function decrypt(secretKey: string, iv: Buffer,tag: Buffer,ciphertext: Buffer):string{
    const key= Buffer.from(secretKey,"base64");
    if(key.length !== KEY_LENGTH){
        throw new Error(`key must be ${KEY_LENGTH} bytes long.`);
    }

    const decipher = crypto.createDecipheriv(ALGORITHM,key,iv);

    decipher.setAuthTag(tag);

    let plaintext= Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
    ]); 
    

    return plaintext.toString("utf-8");


}

export function generateKey(size: number):string{
    return crypto.randomBytes(size).toString("base64");

}

