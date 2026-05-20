export interface AppConfig {
    db: {
        user: string;
        password: string;
        server: string;
        database: string;
        options: {
            encrypt: boolean;
            trustServerCertificate: boolean;
        };

    };
    sri: {
        url: string; // URL base del WS
    };
}