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

  if (req.method === "GET" && pathname === "/welcome-message") {
    return new Response("jigインターンへようこそ！");
  }

  if (req.method === "POST" && pathname === "/users/register") {
    const json = await req.json();
    const userName = json.name;
    const sign = json.sign;
    const did = json.did;
    const message = json.message;

    let chk = false;
    try {
      chk = DIDAuth.validSign(did, sign, message);
    } catch (e) {
      return new Response(e.message, { status: 400 });
    }

    if (!chk) {
      return new Response("不正な電子署名です", { status: 400 })
    }

    const isExists = users.some(e => e.name === userName);
    if (isExists) {
      return new Response("登録済みです", { status: 400 });
    }

    users.push({ did, name: userName });
    console.dir(users);
    return new Response("ok");
  }

  if (req.method === "POST" && pathname === "/users/login") {
    const json = await req.json();
    const sign = json.sign;
    const did = json.did;
    const message = json.message;

    let chk = false;
    try {
      chk = DIDAuth.validSign(did, sign, message);
    } catch (e) {
      return new Response(e.message, { status: 400 });
    }

    if (!chk) {
      return new Response("不正な電子署名です", { status: 400 })
    }

    const user = users.find(e => e.did === did);
    if (!user) {
      return new Response("登録されていません", { status: 400 });
    }

    return new Response(JSON.stringify({ user }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // GET
  // クライアント側で単純にデータベースなどに入っている情報を取得したいときに使う
  if (req.method === "GET" && pathname === "/test-get") {
    return new Response("test");
  }

  // GETでもデータを受け取ることはできる
  if (req.method === "GET" && pathname === "/test-get-json") {
    const u = new URL(req.url);
    const params = u.searchParams;
    const testWord = params.get("testword");
    if (!testWord) {
      return new Response("testWordを指定してください");
    }
    return new Response(`${testWord}を受け取りました`);
  }

  // POST
  // クライアント側のフォームの入力情報等を受け取って保存したりするとかはこっち
  // 例では、クライアント側から Json で testWord という String 型のデータを受け取ってる想定です
  if (req.method === "POST" && pathname === "/test-post") {
    const requestJson = await req.json();
    const testWord = requestJson.testWord;
    console.log(testWord);
    if (!testWord) {
      return new Response("testWordを指定してください");
    }
    return new Response(`${testWord}を受け取りました`);
  }

  return serveDir(req, {
    fsRoot: "public",
    urlRoot: "",
    showDirListing: true,
    enableCors: true,
  });
});