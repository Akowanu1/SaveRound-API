// Lets helpers and controllers throw a status + message and handle it in one place
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const sendError = (res, error) => {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ message: error.message });
  }

  // Unique indexes are the last line of defence against race conditions
  if (error.code === 11000) {
    const key = error.keyPattern || {};
    if (key.name) return res.status(409).json({ message: "Group name already in use" });
    if (key.cycle) {
      return res.status(409).json({ message: "You have already recorded a contribution for this cycle" }); // R14
    }
    if (key.payoutPosition) {
      return res.status(409).json({ message: "Another approval was processed at the same time. Please try again" });
    }
    return res.status(409).json({ message: "This record already exists" }); // R8
  }

  // Never leak raw database errors to the client
  return res.status(500).json({ message: "Something went wrong" });
};