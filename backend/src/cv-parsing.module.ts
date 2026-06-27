import { ConfigModule } from "@nestjs/config";
import {Module} from "@nestjs/common";
import {CVParsingController} from "./controllers/cv-parsing/cv-parsing.controller";
import { S3Service} from "./cv-parsing/services/s3.service";
 
@Module({imports: [ConfigModule], controllers: [CVParsingController], 
    providers: [S3Service], exports: [S3Service],})
    export class CVParsingModule{}