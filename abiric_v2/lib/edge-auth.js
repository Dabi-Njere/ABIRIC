import { jwtVerify } from "jose";

// Vercel's middleware runs on the Edge Runtime, which does not support
// the Node.js crypto APIs that `jsonwebtoken` (used in lib/auth.js by
// the actual Node.js API routes) depends on. `jose` is Edge-compatible,
// so middleware verification is split out here rather than sharing
// lib/auth.js, which would pull jsonwebtoken/bcryptjs into the Edge bundle.
const encodedSecret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function verifyTokenEdge(token) {
  try {
    const { payload } = await jwtVerify(token, encodedSecret);
    return payload;
  } catch {
    return null;
  }
}
