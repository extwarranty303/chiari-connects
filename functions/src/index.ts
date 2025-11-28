import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

export const onusercreated = functions.auth.user().onCreate(async (user) => {
  console.log("A new user was created", user);
  return admin.firestore().collection('users').doc(user.uid).set({
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
});
