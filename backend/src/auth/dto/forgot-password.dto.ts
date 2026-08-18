import {IsEmail} from 'class-validator';

export class ForgotPasswordDto{
    @IsEmail({}, {message: 'A valid email address is required.'})
    email!: string;
}