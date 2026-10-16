import { getPublicShareData } from "@/lib/server/public-share";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const NO_CACHE = {
  "Cache-Control": "no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } },
) {
  try {
    const data = await getPublicShareData(params.token);
    if (!data) {
      return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_CACHE });
    }
    return NextResponse.json(data, { headers: NO_CACHE });
  } catch (error) {
    console.error("public share GET failed", error);
    return NextResponse.json({ error: "unavailable" }, { status: 500, headers: NO_CACHE });
  }
}
