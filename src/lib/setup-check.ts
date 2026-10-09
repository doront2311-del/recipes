import "server-only";
import { db } from "./supabase";

/** Returns a Hebrew explanation of what's misconfigured, or null when the database is reachable. */
export async function setupProblem(): Promise<{ title: string; details: string } | null> {
  const missing = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY", "ANTHROPIC_API_KEY"].filter((k) => !process.env[k]?.trim());
  if (missing.length) {
    return {
      title: "חסרים משתני סביבה ב-Vercel",
      details: `לא הוגדרו: ${missing.join(", ")}. הוסף אותם ב-Vercel תחת Settings ← Environment Variables, ואז Redeploy.`,
    };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url) && !url.startsWith("http://127.0.0.1")) {
    return {
      title: "כתובת Supabase לא נראית תקינה",
      details: `NEXT_PUBLIC_SUPABASE_URL צריך להיות בצורה https://xxxx.supabase.co (בלי שום דבר אחרי). כרגע: ${url}`,
    };
  }

  if (isPublicKey(process.env.SUPABASE_SECRET_KEY!.trim())) {
    return {
      title: "הוכנס המפתח הלא נכון של Supabase",
      details:
        "ב-SUPABASE_SECRET_KEY הוכנס המפתח הציבורי (Publishable / anon). צריך את ה-Secret key שמתחיל ב-sb_secret_ (או service_role בלשונית Legacy). תקן ב-Vercel ועשה Redeploy.",
    };
  }

  try {
    const { error } = await db().from("categories").select("id").limit(1);
    if (!error) return null;
    const msg = `${error.code ?? ""} ${error.message}`;
    if (/42P01|PGRST205|does not exist|schema cache/i.test(msg)) {
      return {
        title: "הטבלאות לא נוצרו ב-Supabase",
        details: "צריך להריץ את הקובץ supabase/schema.sql ב-SQL Editor של Supabase (שלב 2.3 במדריך).",
      };
    }
    if (/api key|jwt|unauthorized|401|403/i.test(msg)) {
      return {
        title: "המפתח של Supabase לא תקין",
        details: "SUPABASE_SECRET_KEY צריך להיות ה-Secret key (מתחיל ב-sb_secret_) או ה-service_role, לא ה-Publishable/anon key. בדוק שהועתק במלואו ועשה Redeploy.",
      };
    }
    return { title: "שגיאה מ-Supabase", details: msg };
  } catch (e) {
    return {
      title: "לא מצליח להתחבר ל-Supabase",
      details: `בדוק את NEXT_PUBLIC_SUPABASE_URL, ושהפרויקט ב-Supabase לא מושהה. (${e instanceof Error ? e.message : String(e)})`,
    };
  }
}

function isPublicKey(key: string): boolean {
  if (key.startsWith("sb_publishable_")) return true;
  const payload = key.split(".")[1];
  if (!payload) return false;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString()).role === "anon";
  } catch {
    return false;
  }
}
