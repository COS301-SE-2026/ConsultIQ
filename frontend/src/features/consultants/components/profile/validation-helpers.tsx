    export function validateSAID(id: string): boolean {
    if (!/^\d{13}$/.test(id)) return false;
    const month = Number.parseInt(id.substring(2, 4));
    const day = Number.parseInt(id.substring(4, 6));
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    let sum = 0;
    let isEven = false;
    for (let i = id.length - 1; i >= 0; i--) {
      let digit = Number.parseInt(id[i]);
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      isEven = !isEven;
    }
    return sum % 10 === 0;
  }

  export const normaliseSAPhone = (raw :string) : string =>{
    let digits = raw.replace(/[\s\-()]/g, "");

    if(digits.startsWith("+27")){
      digits = "0" + digits.slice(3);
    }else if(digits.startsWith("27") && digits.length === 11){
      digits = "0" + digits.slice(2);
    }

    return digits;

  }