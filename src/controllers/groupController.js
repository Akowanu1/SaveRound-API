 import Group from '../models/groupModel.js';

// @desc    Create a new group
// @route   POST /api/groups
// @access  Private (Protected)
export const createGroup = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide a group name.'
      });
    }

    const group = await Group.create({
      name,
      description,
      creator: req.user._id,
      members: [req.user._id]
    });

    res.status(201).json({
      status: 'success',
      message: 'Group created successfully',
      data: { group }
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
};

// @desc    Get all groups
// @route   GET /api/groups
// @access  Private
export const getAllGroups = async (req, res) => {
  try {
    const groups = await Group.find().populate('creator', 'name email');

    res.status(200).json({
      status: 'success',
      results: groups.length,
      data: { groups }
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
};

// @desc    Get single group by ID
// @route   GET /api/groups/:groupId
// @access  Private
export const getGroupById = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId).populate('creator', 'name email');

    if (!group) {
      return res.status(404).json({
        status: 'fail',
        message: 'Group not found.'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { group }
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
};

// @desc    Update group details
// @route   PATCH /api/groups/:groupId
// @access  Private (Creator only)
export const updateGroup = async (req, res) => {
  try {
    let group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({
        status: 'fail',
        message: 'Group not found.'
      });
    }

    // Ensure only the creator can update the group
    if (group.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'fail',
        message: 'Only the group creator can update this group.'
      });
    }

    group = await Group.findByIdAndUpdate(req.params.groupId, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      status: 'success',
      message: 'Group updated successfully',
      data: { group }
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
};

// @desc    Delete group
// @route   DELETE /api/groups/:groupId
// @access  Private (Creator only)
export const deleteGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({
        status: 'fail',
        message: 'Group not found.'
      });
    }

    // Ensure only the creator can delete the group
    if (group.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'fail',
        message: 'Only the group creator can delete this group.'
      });
    }

    await Group.findByIdAndDelete(req.params.groupId);

    res.status(200).json({
      status: 'success',
      message: 'Group deleted successfully',
      data: null
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
};