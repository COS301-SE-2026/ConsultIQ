
// Extend Express's Request interface to include the `user` property with our custom JwtPayload type.
declare module 'express-serve-static-core' {
    interface Request {
        user?: {
            userId: string;
            role: string;
            iat?: number;
            exp?: number;
        };
    }
}