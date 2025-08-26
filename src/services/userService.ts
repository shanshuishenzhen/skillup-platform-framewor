// /src/services/userService.ts
import { UserRole } from "@/lib/db/schema";

// TODO: Replace with actual database calls (e.g., using Prisma or another ORM)
// TODO: Implement password hashing with bcrypt

/**
 * Registers a new user.
 * In a real implementation, this would:
 * 1. Validate input
 * 2. Check if user already exists
 * 3. Hash the password
 * 4. Save the new user to the database
 */
export async function registerUser(phone: string, password_raw: string) {
  console.log(`Registering user with phone: ${phone}`);
  // Placeholder logic
  if (!phone || !password_raw) {
    throw new Error("Phone and password are required.");
  }
  // Pretend to save to DB and return a user object
  return { id: Date.now().toString(), phone, role: UserRole.REGISTERED_USER };
}

/**
 * Authenticates a user.
 * In a real implementation, this would:
 * 1. Find user by phone in the database
 * 2. Compare the hashed password
 * 3. If match, return user data
 * 4. For paying users, trigger the face recognition flow
 */
export async function loginUser(phone: string, password_raw: string) {
  console.log(`Authenticating user with phone: ${phone}`);

  // Simulate an admin user
  if (phone === "13900139000" && password_raw === "adminpassword") {
    return { id: '0', phone, role: UserRole.ADMIN, needsFaceScan: false };
  }

  // Simulate a paying user for testing the face scan flow
  if (phone === "13800138000" && password_raw === "password123") {
    return { id: '1', phone, role: UserRole.PAID_STUDENT, needsFaceScan: true };
  }

  // Simulate a regular registered user
  return { id: '2', phone, role: UserRole.REGISTERED_USER, needsFaceScan: false };
}

/**
 * Verifies face scan.
 * In a real implementation, this would:
 * 1. Receive Base64 image data
 * 2. Send it to a third-party AI service (e.g., Baidu AI)
 * 3. Compare the result with a stored face embedding if available
 * 4. Return success or failure
 */
export async function verifyFaceScan(userId: string, imageBase64: string) {
  console.log(`Verifying face scan for user: ${userId}`);
  if (!imageBase64) {
    throw new Error("Image data is required.");
  }
  // Placeholder logic: always succeeds for now
  return { success: true };
}
