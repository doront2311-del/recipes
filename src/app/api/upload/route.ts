import { NextResponse } from "next/server";
import { uploadImage } from "@/lib/supabase";

/** Uploads one image (used for replacing a cover image in the edit form). */
export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "קובץ לא תקין" }, { status: 400 });
  }
  const path = await uploadImage(await file.arrayBuffer(), file.type, "covers");
  return NextResponse.json({ path });
}
