/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as logger from "firebase-functions/logger";
import { beforeUserSignedIn } from "firebase-functions/v2/identity";
import * as admin from "firebase-admin";

/**
 * BeforeSignIn blocking function
 * This function runs BEFORE the user gets their session cookie/token
 * It handles:
 * 1. Setting custom claims for organization ID from WorkOS
 * 2. Ensuring the user has a profile record in Firestore
 */
export const createBeforeSignIn = beforeUserSignedIn(
  {
    region: "us-central1",
  },
  async (event) => {
    const { credential, additionalUserInfo } = event;
    const user = event.data;

    if (!user) {
      throw new Error("User missing in event data");
    }

    // 1. Check if the sign-in is coming from WorkOS
    if (credential?.providerId !== "oidc.workos") {
      throw new Error("Invalid credential provider id");
    }

    // 2. Extract WorkOS Data
    const workosProfile = additionalUserInfo?.profile || {};

    // Attempt to find the Org ID in standard profile or raw attributes
    const organizationId =
      workosProfile.organization_id ||
      workosProfile.raw_attributes?.organization_id;

    if (!organizationId) {
      throw new Error("Missing organization id in WorkOS profile");
    }

    // Extract Display Name and Photo URL (OIDC standard fields)
    const displayName =
      workosProfile.name ||
      workosProfile.display_name ||
      user.displayName ||
      null;

    const photoURL = workosProfile.picture || user.photoURL || null;

    logger.info("WorkOS Data Extracted", {
      uid: user.uid,
      orgId: organizationId,
      displayName,
    });

    // 3. Update Firestore Structure
    const db = admin.firestore();

    // Define the reference to the Organization document
    const orgRef = db.collection("organizations").doc(organizationId);

    // Define the reference to the User Profile (Subcollection of Organization)
    const userProfileRef = orgRef.collection("profiles").doc(user.uid);

    try {
      // Run as a transaction or batch to ensure consistency
      // (Using simple await here for readability, but batch is safer for multi-writes)

      // A. Ensure the Organization document exists (Optional but recommended)
      // This creates a placeholder if the Org doc is missing, preventing "phantom" parents.
      const orgDoc = await orgRef.get();
      if (!orgDoc.exists) {
        // You might want to pull the Org Name from WorkOS metadata if available
        // For now, we just ensure the ID is set.
        await orgRef.set(
          {
            id: organizationId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      // B. Handle the Profile Document
      const profileDoc = await userProfileRef.get();

      const profileData = {
        uid: user.uid,
        email: user.email,
        displayName: displayName,
        photoURL: photoURL,
        orgId: organizationId, // Useful to have the ID inside the doc as well
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (!profileDoc.exists) {
        // Create new profile in the subcollection
        await userProfileRef.set({
          ...profileData,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        logger.info("Created new profile in org subcollection", {
          uid: user.uid,
          orgId: organizationId,
        });
      } else {
        // Update existing profile
        await userProfileRef.update(profileData);
        logger.info("Updated profile in org subcollection", {
          uid: user.uid,
          orgId: organizationId,
        });
      }
    } catch (error) {
      logger.error("Error writing to Firestore", { uid: user.uid, error });
      // We don't block sign-in on DB error, but we log it.
    }

    // 4. Return Custom Claims & User Overrides
    return {
      displayName: displayName,
      photoURL: photoURL,
      customClaims: {
        organizationId,
        role: "member",
      },
    };
  }
);
