import {IsNotEmpty, IsString} from "class-validator";
export class DeleteCVFileDto{
    @IsString()
    @IsNotEmpty({message: "File required."})
    fileKey!: string;
}