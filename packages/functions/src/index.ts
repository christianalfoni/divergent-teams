/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as admin from "firebase-admin";

admin.initializeApp();

export { createBeforeSignIn } from "./authentication";
export { onUserUpdate, onTeamUpdate, onTaskUpdate } from "./mentions";
export { onMessageCreated } from "./messages-trigger";
export { onTodoChange } from "./todos-trigger";
