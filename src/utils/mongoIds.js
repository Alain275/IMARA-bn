import mongoose from 'mongoose';

/** Cast JWT user id string to ObjectId for queries on ownerUserId / authorizedUserIds. */
export function toUserObjectId(userId) {
  if (userId == null) return null;
  const s = String(userId);
  if (!mongoose.Types.ObjectId.isValid(s)) return null;
  return new mongoose.Types.ObjectId(s);
}
