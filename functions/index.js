"use strict";

const crypto = require("node:crypto");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore, FieldValue} = require("firebase-admin/firestore");
const {getMessaging} = require("firebase-admin/messaging");
const {setGlobalOptions} = require("firebase-functions/v2");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");
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
