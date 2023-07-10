import { serveDir } from "https://deno.land/std@0.180.0/http/file_server.ts";
import { serve } from "https://deno.land/std@0.180.0/http/server.ts";
import { DIDAuth } from "https://nabe1005.github.io/did-login/auth/DIDAuth.js";

const users = [
  {
    did: "did:key:z6MkpLMhzfdm9z7fe4tasU9DooqdYH52YNtdz3QF1zuYizmz",
    name: "nabe"
  }
];

serve(async (req) => {
  const pathname = new URL(req.url).pathname;
  console.log(pathname);

  // ユーザー新規登録API
  if (req.method === "POST" && pathname === "/users/register") {
    const json = await req.json();
    const userName = json.name;
    const sign = json.sign;
    const did = json.did;
    const message = json.message;

    try {
      const chk = DIDAuth.validSign(did, sign, message);
      if (!chk) {
        return new Response("不正な電子署名です", { status: 400 })
      }
    } catch (e) {
      return new Response(e.message, { status: 400 });
    }

    const isExists = users.some(e => e.name === userName);
    if (isExists) {
      return new Response("登録済みです", { status: 400 });
    }

    users.push({ did, name: userName });
    console.dir(users);
    return new Response("ok");
  }

  // ユーザーログインAPI
  if (req.method === "POST" && pathname === "/users/login") {
    const json = await req.json();
    const sign = json.sign;
    const did = json.did;
    const message = json.message;

    try {
      const chk = DIDAuth.validSign(did, sign, message);
      if (!chk) {
        return new Response("不正な電子署名です", { status: 400 })
      }
    } catch (e) {
      return new Response(e.message, { status: 400 });
    }

    const user = users.find(e => e.did === did);
    if (!user) {
      return new Response("登録されていません", { status: 400 });
    }

    return new Response(JSON.stringify({ user }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return serveDir(req, {
    fsRoot: "public",
    urlRoot: "",
    showDirListing: true,
    enableCors: true,
  });
});