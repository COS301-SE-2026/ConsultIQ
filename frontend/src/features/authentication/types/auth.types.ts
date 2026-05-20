export interface LoginPayload {
    email: string;
    password: string;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

export interface LoginResult extends AuthTokens {
    userId: string;
    email: string;
    role: string;
    dashboardRoute: string;
}

export interface LoginResponse {
    message: string;
    result: LoginResult;
}