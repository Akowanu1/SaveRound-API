import ApiError from "../utils/ApiError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { uploadImage, deleteImage } from "../utils/cloudinaryUpload.js";

export const getMe = async (req, res) => {
  const u = req.user;
  return sendSuccess(res, 200, "Profile fetched", {
    id: u._id,
    fullName: u.fullName,
    email: u.email,
    profilePicture: u.profilePicture,
    createdAt: u.createdAt,
  });
};

export const updateAvatar = async (req, res) => {
  if (!req.file) throw new ApiError(400, "Image file is required (field name: image)");
  const user = req.user;
  if (user.profilePicture?.publicId) await deleteImage(user.profilePicture.publicId);
  user.profilePicture = await uploadImage(req.file.buffer, "SaveRound/avatars");
  await user.save();
  return sendSuccess(res, 200, "Profile picture updated", { profilePicture: user.profilePicture });
};
