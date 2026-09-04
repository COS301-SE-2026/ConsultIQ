export const ENCRYPTION_MAP: Record<string, string[]>={
    consultant:[
        "addressLine1",
        "addressLine2",
        "formattedAddress",
        "phone",
        "idNumber",
        "nationality"
    ]
}

export function getEncryptedFields(tableName?: string):string[]{
    if(!tableName) return [];
    return ENCRYPTION_MAP[tableName.toLowerCase()] || [];
}

export function hasEncryptedFields(tableName: string): boolean{
    return getEncryptedFields(tableName).length > 0;
}