export declare const config: {
    env: string;
    port: number;
    baseUrl: string;
    database: {
        url: string;
        pool: {
            min: number;
            max: number;
        };
    };
    redis: {
        url: string;
    };
    jwt: {
        secret: string;
        expiry: string;
    };
    telnyx: {
        apiKey: string;
        callRatePerMinute: number;
        smsRate: number;
    };
    metriport: {
        apiKey: string;
    };
    features: {
        enableRepeatPatientDetection: boolean;
        enableAIRecommendations: boolean;
        enableMetriportSync: boolean;
    };
};
//# sourceMappingURL=index.d.ts.map