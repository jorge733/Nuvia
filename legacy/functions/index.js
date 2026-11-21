"use strict";

const crypto = require("node:crypto");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore, FieldValue} = require("firebase-admin/firestore");
const {getMessaging} = require("firebase-admin/messaging");
const {getAuth} = require("firebase-admin/auth");
const {getStorage} = require("firebase-admin/storage");
const {setGlobalOptions} = require("firebase-functions/v2");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {logger} = require("firebase-functions");

initializeApp();

const db = getFirestore();
const APP_URL = "https://redsocialnuvia.vercel.app/";
const INVALID_TOKEN_CODES = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
]);

setGlobalOptions({
  region: "southamerica-west1",
  maxInstances: 10,
  memory: "256MiB",
});

function cleanText(value, fallback = "Usuario") {
  const text = String(value || "").trim();
  return text ? text.slice(0, 90) : fallback;
}

function eventDocumentId(eventId) {
  return `event_${crypto.createHash("sha256").update(String(eventId)).digest("hex")}`;
}

async function getUserName(uid, fallback = "Alguien") {
  if (!uid) return fallback;
  const snap = await db.collection("users").doc(uid).get();
  if (!snap.exists) return fallback;
  const data = snap.data() || {};
  return cleanText(data.name || data.displayName || data.username || data.handle, fallback);
}

async function sendPushToUser(userId, notification) {
  const tokensSnap = await db.collection("users").doc(userId)
    .collection("pushTokens").where("enabled", "==", true).get();

  const tokenDocs = tokensSnap.docs.filter((doc) => Boolean(doc.get("token")));
  if (!tokenDocs.length) return {successCount: 0, failureCount: 0};

  let successCount = 0;
  let failureCount = 0;

  for (let start = 0; start < tokenDocs.length; start += 500) {
    const batchDocs = tokenDocs.slice(start, start + 500);
    const response = await getMessaging().sendEachForMulticast({
      tokens: batchDocs.map((doc) => doc.get("token")),
      notification: {
        title: notification.title,
        body: notification.text,
      },
      data: {
        type: String(notification.type || "activity"),
        notificationId: String(notification.id),
        url: APP_URL,
      },
      webpush: {
        fcmOptions: {link: APP_URL},
        notification: {
          icon: `${APP_URL}icon-192.svg`,
          badge: `${APP_URL}icon-192.svg`,
          tag: `uniluva-${notification.type || "activity"}`,
        },
      },
    });

    successCount += response.successCount;
    failureCount += response.failureCount;

    const cleanup = [];
    response.responses.forEach((result, index) => {
      const code = result.error?.code;
      if (code && INVALID_TOKEN_CODES.has(code)) {
        cleanup.push(batchDocs[index].ref.delete());
      }
    });
    await Promise.all(cleanup);
  }

  return {successCount, failureCount};
}

async function notifyUser({eventId, userId, actorId, type, text, targetId = ""}) {
  if (!userId || userId === actorId) return;

  const ref = db.collection("notifications").doc(eventDocumentId(eventId));
  const payload = {
    userId,
    actorId: actorId || "",
    type,
    text,
    targetId,
    url: APP_URL,
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  };

  try {
    await ref.create(payload);
  } catch (error) {
    if (error?.code === 6 || error?.code === "already-exists") return;
    throw error;
  }

  try {
    const result = await sendPushToUser(userId, {
      id: ref.id,
      title: "Uniluva",
      text,
      type,
    });
    logger.info("Notificación procesada", {type, userId, ...result});
  } catch (error) {
    logger.error("La notificación se guardó, pero el push falló", {
      type,
      userId,
      error: error?.message || String(error),
    });
  }
}

exports.notifyNewFollower = onDocumentCreated(
  "users/{userId}/followers/{actorId}",
  async (event) => {
    const {userId, actorId} = event.params;
    const actorName = await getUserName(actorId);
    await notifyUser({
      eventId: event.id,
      userId,
      actorId,
      type: "follow",
      text: `${actorName} comenzó a seguirte.`,
      targetId: actorId,
    });
  },
);

exports.notifyPostReaction = onDocumentCreated(
  "posts/{postId}/reactions/{actorId}",
  async (event) => {
    const {postId, actorId} = event.params;
    const postSnap = await db.collection("posts").doc(postId).get();
    if (!postSnap.exists) return;

    const post = postSnap.data() || {};
    const actorName = await getUserName(actorId);
    const reactionType = event.data?.get("type");
    const action = reactionType === "value"
      ? "valoró tu publicación"
      : reactionType === "help"
        ? "marcó tu publicación como útil"
        : "reaccionó a tu publicación";

    await notifyUser({
      eventId: event.id,
      userId: post.authorId,
      actorId,
      type: "reaction",
      text: `${actorName} ${action}.`,
      targetId: postId,
    });
  },
);

exports.notifyPostComment = onDocumentCreated(
  "posts/{postId}/comments/{commentId}",
  async (event) => {
    const {postId} = event.params;
    const comment = event.data?.data() || {};
    const postSnap = await db.collection("posts").doc(postId).get();
    if (!postSnap.exists) return;

    const post = postSnap.data() || {};
    const actorName = cleanText(comment.authorName, await getUserName(comment.authorId));
    await notifyUser({
      eventId: event.id,
      userId: post.authorId,
      actorId: comment.authorId,
      type: "comment",
      text: `${actorName} comentó tu publicación.`,
      targetId: postId,
    });
  },
);

exports.notifyCommentReply = onDocumentCreated(
  "posts/{postId}/comments/{commentId}/replies/{replyId}",
  async (event) => {
    const {postId, commentId} = event.params;
    const reply = event.data?.data() || {};
    const commentSnap = await db.collection("posts").doc(postId)
      .collection("comments").doc(commentId).get();
    if (!commentSnap.exists) return;

    const comment = commentSnap.data() || {};
    const actorName = cleanText(reply.authorName, await getUserName(reply.authorId));
    await notifyUser({
      eventId: event.id,
      userId: comment.authorId,
      actorId: reply.authorId,
      type: "reply",
      text: `${actorName} respondió tu comentario.`,
      targetId: postId,
    });
  },
);

async function deleteQueryDocs(query) {
  let deleted = 0;
  for (;;) {
    const snap = await query.limit(400).get();
    if (snap.empty) return deleted;
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    deleted += snap.size;
  }
}

async function deleteStoragePrefix(prefix) {
  try {
    await getStorage().bucket().deleteFiles({prefix, force: true});
  } catch (error) {
    logger.warn("No se pudieron borrar archivos", {prefix, error: error?.message || String(error)});
  }
}

// Elimina la cuenta de quien la solicita junto con su contenido y relaciones.
exports.deleteMyAccount = onCall({timeoutSeconds: 300, memory: "512MiB"}, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");

  const authTime = Number(request.auth.token?.auth_time || 0);
  if (!authTime || Date.now() / 1000 - authTime > 10 * 60) {
    throw new HttpsError("failed-precondition", "Vuelve a iniciar sesión para confirmar que eres tú.");
  }

  const userRef = db.collection("users").doc(uid);
  const summary = {posts: 0, comments: 0, replies: 0};

  // Publicaciones propias, con sus comentarios, reacciones y votos.
  const postsSnap = await db.collection("posts").where("authorId", "==", uid).get();
  for (const post of postsSnap.docs) {
    await db.recursiveDelete(post.ref);
    await deleteStoragePrefix(`postMedia/${post.id}/`);
    summary.posts += 1;
  }

  // Comentarios y respuestas en publicaciones de otras personas.
  for (const group of ["comments", "replies"]) {
    try {
      const snap = await db.collectionGroup(group).where("authorId", "==", uid).get();
      for (const item of snap.docs) {
        await db.recursiveDelete(item.ref);
        summary[group] += 1;
      }
    } catch (error) {
      logger.error(`No se pudieron borrar ${group}`, {uid, error: error?.message || String(error)});
    }
  }

  // Relaciones guardadas en perfiles ajenos y membresías en comunidades.
  const [followingSnap, followersSnap, communitiesSnap] = await Promise.all([
    userRef.collection("following").get(),
    userRef.collection("followers").get(),
    db.collection("communities").get(),
  ]);
  const writer = db.bulkWriter();
  followingSnap.docs.forEach((doc) => {
    writer.delete(db.collection("users").doc(doc.id).collection("followers").doc(uid));
  });
  followersSnap.docs.forEach((doc) => {
    writer.delete(db.collection("users").doc(doc.id).collection("following").doc(uid));
  });
  communitiesSnap.docs.forEach((community) => {
    writer.delete(community.ref.collection("members").doc(uid));
  });
  await writer.close();

  await deleteQueryDocs(db.collection("usernames").where("uid", "==", uid));
  await deleteQueryDocs(db.collection("notifications").where("userId", "==", uid));
  await db.recursiveDelete(userRef);
  await deleteStoragePrefix(`users/${uid}/`);

  try {
    await getAuth().deleteUser(uid);
  } catch (error) {
    if (error?.code !== "auth/user-not-found") throw error;
  }

  logger.info("Cuenta eliminada", {uid, ...summary});
  return {ok: true, ...summary};
});
