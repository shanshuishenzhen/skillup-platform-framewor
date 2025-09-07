// /src/services/userService.ts
import bcrypt from 'bcryptjs';
import { User, UserRole, UserStatus } from '@/lib/db/schema';

// In-memory store to act as a temporary database, conforming to the User schema
const users: User[] = [];

/**
 * Registers a new user.
 * This implementation now aligns with the schema.ts definition.
 * It checks for existing users, hashes the password, and saves to the in-memory store.
 */
export async function registerUser(phone: string, password_raw: string) {
  console.log(`Registering user with phone: ${phone}`);

  if (!phone || !password_raw) {
    throw new Error("手机号和密码是必填项。");
  }

  // Check if user already exists
  const existingUser = users.find(user => user.phone === phone);
  if (existingUser) {
    throw new Error("该手机号已被注册。");
  }

  // Hash the password
  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(password_raw, salt);

  const newUser: User = {
    id: (users.length + 1).toString(),
    phone,
    password_hash,
    face_embedding: null, // No face scan on initial registration
    role: phone.endsWith('0') ? UserRole.PAID_STUDENT : UserRole.REGISTERED_USER,
    status: UserStatus.ACTIVE,
    created_at: new Date(),
    updated_at: new Date(),
  };

  users.push(newUser);
  console.log('Current users in memory:', users);

  // Return a user object without the password hash
  const { password_hash: _, ...userToReturn } = newUser;
  return userToReturn;
}

/**
 * Authenticates a user by finding them in the in-memory store
 * and comparing their hashed password.
 */
export async function loginUser(phone: string, password_raw: string) {
  console.log(`Authenticating user with phone: ${phone}`);

  const user = users.find(u => u.phone === phone);
  if (!user) {
    console.log("User not found.");
    return null; // User not found
  }

  const isMatch = await bcrypt.compare(password_raw, user.password_hash);
  if (!isMatch) {
    console.log("Password does not match.");
    return null; // Passwords do not match
  }

  console.log("User authenticated successfully.");
  // Add a `needsFaceScan` property for the API layer to consume.
  // This is based on the user's role, which we'll simplify for now.
  const needsFaceScan = user.role === UserRole.PAID_STUDENT;

  // Return a new object combining user data and the face scan requirement.
  const { password_hash: _, ...userToReturn } = user;
  return { ...userToReturn, needsFaceScan };
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
