export declare class ICAError extends Error {
    error: string;
    error_description: string;
    status?: number;
    constructor(error: string, error_description: string, status?: number);
}
