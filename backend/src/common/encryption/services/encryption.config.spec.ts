import { getEncryptedFields,hasEncryptedFields,ENCRYPTION_MAP } from "./encryption.config";

describe("encryption.config", () => {
    describe("getEncryptedFields", ()=>{
        it("returns the encrypted fields for a known table name",() => {
            expect(getEncryptedFields("consultant")).toEqual(ENCRYPTION_MAP.consultant);
        });

        it("returns an empty array for an unkown table name", () => {
            expect(getEncryptedFields("user")).toEqual([]);
        });
    });

    describe("hasEncryptedFields", () => {
        it("returns true for a table with encrypted fields", () => {
            expect(hasEncryptedFields("consultant")).toBe(true);
        });

        it("returns false for a table with no encrypted fields", () => {
            expect(hasEncryptedFields("user")).toBe(false);
        });
    })
});