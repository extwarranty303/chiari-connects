'use client';
import { User } from 'firebase/auth';

export interface DecodedIdToken {
    aud: string;
    auth_time: number;
    claims: {
        [key: string]: any;
        admin?: boolean;
    };
    exp: number;
    firebase: {
        identities: {
            [key: string]: any;
        };
        sign_in_provider: string;
        tenant?: string;
    };
    iat: number;
    iss: string;
    sub: string;
    uid: string;
}

/**
 * Retrieves the decoded ID token from the user, which contains custom claims.
 * @param user The Firebase user object.
 * @param forceRefresh Whether to force a refresh of the ID token.
 * @returns A promise that resolves with the decoded ID token, or null if there's no user.
 */
export async function getDecodedIdToken(user: User | null, forceRefresh: boolean = false): Promise<DecodedIdToken | null> {
    if (!user) {
        return null;
    }

    try {
        const idToken = await user.getIdToken(forceRefresh);
        if (!idToken) {
            return null;
        }

        const payload = idToken.split('.')[1];
        if (!payload) {
            return null;
        }

        const decodedPayload = atob(payload);
        const decodedToken = JSON.parse(decodedPayload);
        
        // Add the claims directly to the decodedToken for easier access
        decodedToken.claims = { ...decodedToken };

        return decodedToken as DecodedIdToken;

    } catch (error) {
        console.error("Error getting or decoding ID token:", error);
        throw new Error("Could not retrieve user claims.");
    }
}
