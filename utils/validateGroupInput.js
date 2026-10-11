const FREQUENCIES = ["weekly", "bi-weekly", "monthly"];

// Returns an error message, or null when the input is valid
export const validateGroupInput = (body) => {
  const { name, description, contributionAmount, frequency, maxMembers, startDate } = body;

  if (typeof name !== "string" || !name.trim()) return "Group name is required";
  if (description !== undefined && typeof description !== "string") return "Description must be text";
  if (!FREQUENCIES.includes(frequency)) return "Frequency must be weekly, bi-weekly or monthly"; // R5
  if (!Number.isInteger(contributionAmount) || contributionAmount <= 0)
    return "Contribution amount must be a whole number of Naira greater than 0"; // R6
  if (!Number.isInteger(maxMembers) || maxMembers < 4 || maxMembers > 20)
    return "Maximum members must be a whole number from 4 to 20"; // R4
  if (!startDate || Number.isNaN(new Date(startDate).getTime())) return "A valid start date is required";

  return null;
};