import User from "../models/User.js";
import SavingsGroup from "../models/SavingsGroup.js";
import ApiError from "../utils/ApiError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { uploadImage, deleteImage } from "../utils/cloudinaryUpload.js";

// Cloudinary folders. Keep the two prefixes in sync with the team.
const AVATAR_FOLDER = "SaveRound/avatars";
const GROUP_FOLDER = "SaveRound/groups";

// Deletes an old image but never fails the request if Cloudinary cannot delete it.
const removeOldImage = async (publicId) => {
  if (!publicId) return;
  try {
    await deleteImage(publicId);
  } catch (err) {
    console.error("Could not delete old image:", err.message);
  }
};

// PUT /api/users/me/avatar   (protect + upload.single("image"))
export const uploadAvatar = async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "No image uploaded. Send the file in the 'image' field");
  }

  // The logged-in user comes from the protect middleware, never from the request body.
  const userId = req.user._id ?? req.user.id;
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");

  const oldPublicId = user.profilePicture?.publicId;

  // Upload the new image first, so a failed upload never leaves the user without a picture.
  const { url, publicId } = await uploadImage(req.file.buffer, AVATAR_FOLDER);

  await User.findByIdAndUpdate(userId, { profilePicture: { url, publicId } });

  // The new image is saved, so now it is safe to delete the old one.
  await removeOldImage(oldPublicId);

  return sendSuccess(res, 200, "Profile picture updated", { profilePicture: { url } });
};

// POST /api/groups/:groupId/image   (protect + upload.single("image"))
export const uploadGroupImage = async (req, res) => {
  const { groupId } = req.params; // an invalid ID is turned into a clean 400 by errorHandler
  const userId = req.user._id ?? req.user.id;

  const group = await SavingsGroup.findById(groupId);
  if (!group) throw new ApiError(404, "Group not found");

  // Only the creator may change the group image.
  if (String(group.creator) !== String(userId)) {
    throw new ApiError(403, "Only the group creator can change the group image");
  }

  if (!req.file) {
    throw new ApiError(400, "No image uploaded. Send the file in the 'image' field");
  }

  const oldPublicId = group.image?.publicId;
  const { url, publicId } = await uploadImage(req.file.buffer, GROUP_FOLDER);

  await SavingsGroup.findByIdAndUpdate(groupId, { image: { url, publicId } });
  await removeOldImage(oldPublicId);

  return sendSuccess(res, 200, "Group image updated", { image: { url } });
};
