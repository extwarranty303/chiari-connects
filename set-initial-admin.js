
// set-initial-admin.js

/**
 * @fileoverview This script sets a custom user claim to make a specified user an admin.
 * 
 * IMPORTANT: To run this script, you need to:
 * 1. Install the Firebase Admin SDK by running this command in your terminal:
 *    `npm install firebase-admin`
 * 
 * 2. Replace the placeholder for the service account credentials below.
 *    - Go to your Firebase project settings > Service accounts.
 *    - Click "Generate new private key" to download a JSON file with your credentials.
 *    - Copy the contents of that downloaded file and paste it to replace the `serviceAccount` object below.
 * 
 * 3. Replace the `uid` placeholder with the UID of the user you want to make an admin.
 *    - You can find a user's UID in the Firebase Console under Authentication > Users.
 * 
 * 4. Run the script from your terminal: `node set-initial-admin.js`
 */

const admin = require('firebase-admin');

// =======================================================================================
// === 1. REPLACE THE PLACEHOLDER OBJECT BELOW WITH YOUR FIREBASE SERVICE ACCOUNT JSON ===
// =======================================================================================
const serviceAccount = {
  "type": "service_account",
  "project_id": "studio-3480612328-634ea",
  "private_key_id": "a9d842450312d5f002c2c8bc88ec9fa07204238b",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDCkQx45vUgbYtD\nhR+xgYLR6NUvTz9+vGQBJEkGt5YbvuGzgXHFYdcJLleFtRcDDLD4Ot5nryj6Q/NO\nyCr/mt/RuZ1wUSmUSoHIv4NkRyIQq/8tSSnLD09V9FEbSCsNQvnyM/EB61PjzbB8\nzNpkzTHibpOv2pvi1jqUjHocUr0CKQu4W6c2mPjSQ68VyHft493t6sxjPqFar2Kl\nF4cw0G256J/cDMs+K+HedkEa4WWq487af+WwyAJXkA8omEx+KGLCQyAgGJipJSQo\nmhkpyfrXkjN7kMQ3OG68UK3n9zf05uZzC8yMP0xXT68srUmVZOWfthXOHfVLnJ4Z\nFVq1e0XXAgMBAAECggEAQ7HX1xD0ZI34kEt3FXlsHMCXu9gkzWGaodMQHWgusASf\n3qbBAN3jxWv8Q6cYFJWL1TIWQ5jr9vdBZj26yCgIi527K2LxxoiN01zeyDr/nTFa\nnVUBV4dCITPaLFXVtM2CzURJLFPGYlIkf6d+rOe/3Xp/pAW5ixjiVODzc3tOC7vE\nzPYoMdp2InNjKeuRNBk7lqkuCFCzkrGc0RWQPo2kKaswVXaArLepbeaduzX58ttP\n8BUmM2y3MgfbwnZ/CUx5fbyrZrcdk/XyRSo1ZX06p1crB26FDk3orRASBXnje4Vd\naQuPpD29T3itkqu/Qn6YmEExDpKrVayCjNHBQadhIQKBgQDoS8FARYHAJ+zOq/hk\nL9roTjFyTYi8AotCxI8lN5sxhWDbZuYXbrOXAxoW7i1x2k8TQdjX4xa77nb5hvVU\nLbBWEuYD9YKdY2Dw6l5qntX3kfcdnjmno6b/spwPrzVfZObfjLGi4jQ+X4tKsYSB\nkTjioT8dN4Gdc1EbRKB9Wb00DwKBgQDWa7G4EY1UlpAG3NZaBxLSA0b2apn8kZaI\ntTEiIowf8XHOpP3bUOoWp+UBLN0Hz+SpJVDTpAeat7K9oUCDmZARD6r34ydBuLyy\nqHVcOqwoZ5p5mWvmEidk5nGxRJdxE+5plM9pJPbZ0M8uZXQpJnvHdVypmOG0gmjV\nbINBx7HpuQKBgQDQvToj0hG9JWNTeA8VoDca5yDhsLB9GeAgGFb1P5mSj2Mw5K9A\nQTbaLWxlTJPDqkPCbzo3DRYhvDBnG5IamY/KWOMejaBYY7P56PD86EwnUp/3mnX+\noT1wqgQ4x92zIg2gtmHtl00Q+3REo24JrACtDe6UB4vOe5BXa3y4B0rQmwKBgDQl\n/xQYWLog4Ch7HzrIC6C+IU0fAhJ2Shk3kBqQMmo2a4ppgEANvtEBxmVxxtP2kNM+\nexjuBNdxI+yQwkL/XxV3LQqa2VpXlrUQ2XIz5tjw0ZYPZTmQYrpcfXwyhW5//XT6\nNzOIRO0WprzO+eBkNqh896tbvlELgnmdqZKfAbspAoGBAI4+oXJEQRWRVfB7F3JM\nOwpXUULz217PIHU5TiEEMdKIxVxPmzjfwp5FG0aK7p8UgRnvggM5CyeEYq50Cxop\n7NkJsmV5AUpDkRKhZjRpN2u84DCRuUK/sTjB7Yc20jtFLzYfw0lg6SVT3TccJlls\nwwkllAqL84kykxsJQOoDe1e4\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-app-hosting-compute@studio-3480612328-634ea.iam.gserviceaccount.com",
  "client_id": "112674791925878801226",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-app-hosting-compute%40studio-3480612328-634ea.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
}

// =======================================================================================


// =======================================================================================
// === 2. REPLACE THE PLACEHOLDER UID BELOW WITH THE USER'S AUTHENTICATION UID         ===
// =======================================================================================
const uid = 'pV9ikRWytLfQd6rQ4gNeHMAOAMP2';
// =======================================================================================


try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  console.log('Setting admin claim for user:', uid);

  admin.auth().setCustomUserClaims(uid, { admin: true }).then(() => {
    console.log('================================================================');
    console.log(`✅ Success! Custom claim set for user ${uid}.`);
    console.log('They are now an admin.');
    console.log('The user may need to log out and log back in for the new role to take effect.');
    console.log('================================================================');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Error setting custom claims:', error.message);
    process.exit(1);
  });

} catch (error) {
    console.error('❌ Error initializing Firebase Admin SDK:');
    console.error(error.message);
    console.log('Please ensure you have replaced the placeholder `serviceAccount` object with your actual credentials.');
    process.exit(1);
}