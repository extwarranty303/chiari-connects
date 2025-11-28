"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onusercreated = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
exports.onusercreated = functions.auth.user().onCreate(async (user) => {
    console.log("A new user was created", user);
    return admin.firestore().collection('users').doc(user.uid).set({
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
});
//# sourceMappingURL=index.js.map