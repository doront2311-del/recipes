export const SESSION_COOKIE = "recipes_session";

/** The cookie value is a hash of the password, so changing APP_PASSWORD signs everyone out. */
export async function sessionToken(): Promise<string> {
  const password = process.env.APP_PASSWORD ?? "";
  const data = new TextEncoder().encode(`recipes-session:${password}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}
