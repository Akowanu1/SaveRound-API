import User from '../models/userModel.js';
import Group from '../models/groupModel.js';
import { uploadBuffer, deleteImage } from '../utils/cloudinaryUtils.js';

// @desc    Update user profile picture
// @route   PUT /api/users/me/avatar
// @access  Private
export const updateUserAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'fail', message: 'Please provide an image file.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'User not found.' });
    }

    // Delete old avatar from Cloudinary if it exists
    if (user.profilePicturePublicId) {
      await deleteImage(user.profilePicturePublicId);
    }

    // Upload new image
    const uploadResult = await uploadBuffer(req.file.buffer, 'avatars');

    user.profilePicture = uploadResult.url;
    user.profilePicturePublicId = uploadResult.publicId;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Profile picture updated successfully',
      data: { profilePicture: user.profilePicture }
    });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: error.message });
  }
};

// @desc    Upload group image (Creator-only)
// @route   POST /api/groups/:groupId/image
// @access  Private (Creator only)
export const uploadGroupImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'fail', message: 'Please provide an image file.' });
    }

    const group = await Group.findById(req.params.groupId);
    if (!group) {
      return res.status(404).json({ status: 'fail', message: 'Group not found.' });
    }

    // Ensure only creator can upload
    if (group.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ status: 'fail', message: 'Only the group creator can upload an image for this group.' });
    }

    // Delete old group image if it exists
    if (group.imagePublicId) {
      await deleteImage(group.imagePublicId);
    }

    const uploadResult = await uploadBuffer(req.file.buffer, 'groups');

    group.image = uploadResult.url;
    group.imagePublicId = uploadResult.publicId;
    await group.save();

    res.status(200).json({
      status: 'success',
      message: 'Group image uploaded successfully',
      data: { group }
    });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: error.message });
  }
};