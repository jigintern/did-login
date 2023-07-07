import { DIDKey } from "https://code4fukui.github.io/Ed25519/DIDKey.js";
import { Text } from "https://code4fukui.github.io/Ed25519/Text.js";
import { serveDir } from "https://deno.land/std@0.180.0/http/file_server.ts";
import { serve } from "https://deno.land/std@0.180.0/http/server.ts";
import Ed25519 from "https://taisukef.github.io/forge-es/lib/ed25519.js";

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
    const signData = json.sign;
    const did = json.did;
    const message = json.message;

    console.log(message);

    // didから公開鍵を取得
    let publicKeySet = null;
    if (did.length > 0) {
      try {
        publicKeySet = DIDKey.decode(did).data || "key";
      } catch (e) {
        return new Response("不正なDIDです" + e.message, { status: 400 });
      }
    }

    // 公開鍵の一致検証
    const [rawPublicKey, rawSign] = signData.split('-');
    const publicKey = DIDKey.decode(rawPublicKey).data;
    if (publicKeySet && !equalsBin(publicKey, publicKeySet)) {
      return new Response("公開鍵が一致しません", { status: 400 });
    }

    // 電子署名の検証
    const encodedMsg = Text.encode(message);
    const sign = DIDKey.decode(rawSign).data;
    const chk = Ed25519.verify({ signature: sign, publicKey, message: encodedMsg, encoding: "binary" });
    if (!chk) {
      return new Response("電子署名が正しくありません", { status: 400 });
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
    const signData = json.sign;
    const did = json.did;
    const message = json.message;

    console.log(message);

    // didから公開鍵を取得
    let publicKeySet = null;
    if (did.length > 0) {
      try {
        publicKeySet = DIDKey.decode(did).data || "key";
      } catch (e) {
        return new Response("不正なDIDです" + e.message, { status: 400 });
      }
    }

    // 公開鍵の一致検証
    const [rawPublicKey, rawSign] = signData.split('-');
    const publicKey = DIDKey.decode(rawPublicKey).data;
    if (publicKeySet && !equalsBin(publicKey, publicKeySet)) {
      return new Response("公開鍵が一致しません", { status: 400 });
    }

    // 電子署名の検証
    const encodedMsg = Text.encode(message);
    const sign = DIDKey.decode(rawSign).data;
    const chk = Ed25519.verify({ signature: sign, publicKey, message: encodedMsg, encoding: "binary" });
    if (!chk) {
      return new Response("電子署名が正しくありません", { status: 400 });
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

const equalsBin = (b1, b2) => {
  if (b1 == b2) {
    return true;
  }
  if (!b1 || !b2) {
    return false;
  }
  if (typeof (b1) != typeof (b2)) {
    return false;
  }
  if (b1.length != b2.length) {
    return false;
  }
  for (let i = 0; i < b1.length; i++) {
    if (b1[i] != b2[i]) {
      return false;
    }
  }
  return true;
};