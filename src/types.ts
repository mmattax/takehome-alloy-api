export interface Link {
    label?: string;
    url: string;
};

// https://developer.typeform.com/webhooks/example-payload/
export interface TypeformAnswer {
    type: string;
    email?: string;
    field: {
        id: string;
        type: string;
    }
};

export interface TypeformFormResponse {
    form_id: string;
    token: string;
    answers: TypeformAnswer[];
};

export interface SlackAccessTokenRequest {
    client_id: string;
    client_secret: string;
    code: string;
    redirect_uri: string;
};