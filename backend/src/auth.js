import jwt from "jsonwebtoken";

const TOKEN_TTL = process.env.JWT_EXPIRES_IN || "12h";

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value) {
    throw new Error("JWT_SECRET is not set");
  }
  return value;
}

export function signToken(instructor) {
  return jwt.sign(
    { sub: instructor.id, name: instructor.display_name },
    secret(),
    { expiresIn: TOKEN_TTL }
  );
}

export function requireAuth(req, res, next) {
  const header = req.get("authorization") || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "authentication required" });
  }
  try {
    const payload = jwt.verify(token, secret());
    req.instructor = { id: payload.sub, name: payload.name };
    return next();
  } catch {
    return res.status(401).json({ error: "invalid or expired token" });
  }
}
