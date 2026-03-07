/**
 * 로그인 API: 비밀번호는 서버 환경 변수(ADMIN_PASSWORD)에만 있고, 클라이언트에는 노출되지 않습니다.
 * 환경 변수: ADMIN_PASSWORD, ADMIN_SECRET(토큰 서명용, 긴 랜덤 문자열 권장)
 */

import crypto from "crypto";

const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24시간

function createToken(secret) {
  const payload = {
    admin: true,
    exp: Date.now() + TOKEN_EXPIRY_MS,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(payloadB64).digest("hex");
  return payloadB64 + "." + sig;
}

function verifyToken(token, secret) {
  if (!token || !secret) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payloadB64, sig] = parts;
  const expected = crypto.createHmac("sha256", secret).update(payloadB64).digest("hex");
  if (expected !== sig) return false;
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    return payload.admin === true && payload.exp > Date.now();
  } catch (e) {
    return false;
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function POST(request) {
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SECRET;

  if (!password || !secret) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "서버에 ADMIN_PASSWORD, ADMIN_SECRET 환경 변수를 설정해 주세요.",
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: "JSON 형식이 올바르지 않습니다." }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const submitted = body.password;
  if (submitted !== password) {
    return new Response(
      JSON.stringify({ ok: false, error: "비밀번호가 올바르지 않습니다." }),
      { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const token = createToken(secret);
  return new Response(
    JSON.stringify({ ok: true, token }),
    { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}
