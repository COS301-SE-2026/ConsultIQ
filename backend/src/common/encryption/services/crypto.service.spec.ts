import crypto from "node:crypto";
import {encrypt,decrypt,generateKey} from "./crypto.service"

describe("crypto service", () => {
    const validKey = generateKey(32);

    describe("generateKey", () =>{
        it("returns a base64 string that is the same length as paramertised length",()=> {
            const  key= generateKey(32);
            expect(Buffer.from(key,"base64").length).toBe(32);
        });

        it("returns different keys on each call", () => {
            expect(generateKey(32)).not.toBe(generateKey(32));
        });
    });

    describe("encrypt", () =>{
        it("throws an error if the key is not 32 bytes",()=>{
            const shortKey=generateKey(16);
            expect(()=> encrypt("hello",shortKey)).toThrow("key must be 32 bytes long.",);
        });

        it("produces a 12 byte IV and 16 byte auth tag",()=>{
            const {IV, tag} = encrypt("hello world", validKey);
            expect(IV.length).toBe(12);
            expect(tag.length).toBe(16);
        });

        it("produces different ciphertext fot the same plaintext with different IV values",()=>{
            const plaintext= "this is some random text";
            const a= encrypt(plaintext,validKey);
            const b = encrypt(plaintext,validKey);
            expect(a.ciphertext.equals(b.ciphertext)).toBe(false);
        });
    });

    describe("decrypt", ()=>{
        it("throws an error of the key is not 32 bytes", ()=> {
            const {IV,tag,ciphertext} = encrypt("hello", validKey);
            const shortKey= generateKey(16);
            expect(() => decrypt(shortKey,IV,tag,ciphertext)).toThrow("key must be 32 bytes long.",);
        });

        it("throws an error when decrypting with the wrong", ()=>{
            const {IV, tag, ciphertext} = encrypt("secret data", validKey);
            const wrongKey= generateKey(32);
             expect(() => decrypt(wrongKey,IV,tag,ciphertext)).toThrow();
        });
       
        it("throws when the ciphertext has been tampered with",()=>{
            const {IV, tag, ciphertext} = encrypt("secret data", validKey);
            const tampered= Buffer.from(ciphertext);
            tampered[0] ^= 0b00000001;
            expect(() => decrypt(validKey,IV,tag,tampered)).toThrow();
        });

        it("throws when the IV does not match the one used for encryption", () => {
            const {tag, ciphertext} = encrypt("secret data", validKey);
            const wrongIV = crypto.randomBytes(12);
            expect(() => decrypt (validKey,wrongIV,tag,ciphertext)).toThrow();
        });
    });

    describe("encrypt and decrypt working together", ()=>{
        it("decrypt back to the original plaintext",()=>{
                const plaintext = "some random text";
                const {IV, tag,ciphertext} = encrypt(plaintext,validKey);
                const result= decrypt(validKey,IV,tag,ciphertext);
                expect(result).toBe(plaintext);
        });

        it("handles empty string", () =>{
            const {IV,tag, ciphertext}= encrypt("",validKey);
            expect(decrypt (validKey,IV,tag,ciphertext)).toBe("");
        });

        it("handles long plaintext", ()=>{
            const plaintext= "a".repeat(100_000);
            const {IV, tag, ciphertext} = encrypt(plaintext,validKey);
            expect(decrypt (validKey,IV,tag,ciphertext)).toBe(plaintext);
        });

    });


});



