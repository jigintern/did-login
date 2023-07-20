# DID とは

DID とは分散型 ID のことでブロックチェーン（ビットコインの背後にある技術の一つで、ネット上の取引記録を誰もが見ることができる透明な「帳簿」のようなもの）を利用して、人々が自分自身の ID を管理する新しい方法です。

例えば、今までの ID は大学や会社、Facebook や Google のような大きな組織が管理していました。それらの組織が ID とパスワードを管理し、ユーザーはそれを使ってログインします。しかし、それではサービスごとに ID とパスワードを設定しなければならないので面倒です。またそのサービスがデータを失ったりハッキングされたりすると、ユーザーの ID も危険に晒されることになります。

ここで DID の登場です。DID は自分自身が自分の ID を管理できるようにするものです。自分だけが自分の ID を制御し、誰にどんな情報を提供するかを自分で決定できるようになります。

# 公開鍵認証との違い

DID はデジタル暗号の一部ですが同じデジタル暗号に公開鍵認証というものがあります。

公開鍵認証とは、一対の鍵（公開鍵と秘密鍵）を使用して行われる認証のことです。公開鍵は誰でも知ることができデータを暗号化するために使用され、秘密鍵は所有者のみが知っているもので暗号化されたデータを復号化するために使用されます。また、公開鍵と秘密鍵は中央の認証局(CA)によって管理されているため公開鍵の変更やといったことをしたい場合は認証局に任せなければならず自分ではできないことになっています。

一方 DID は上記の通り自分で作成した ID（公開鍵）を自分自身で管理するため公開鍵認証とは**鍵の管理者が異なります。**これが公開鍵認証と DID の違いです。

DID について詳しくは[こちら](https://www.w3.org/TR/did-core/)

# DID を使ったログイン機能

公開鍵暗号の一種である `Ed25519` を使って DID とパスワードを生成し、それを用いて電子署名の作成、検証を行っていきます。検証が成功すれば正しいキーペアと判断しサーバーとの通信を行い、DB にアクセスするという流れになります。ですので以下の項目に分けて実装する必要があります。

1. Ed25519 を使ってキーペアを作成
2. DID とパスワードの組み合わせが正しいかの検証
3. 電子署名の生成
4. 電子署名の検証

ここまでで DID、パスワード、電子署名の生成、検証ができるようになったので実際にそれらをログイン機能に組み込んでいきます。

5. 新規登録の実装
6. ログインの実装

# 1. Ed25519 を使ってキーペアを作成

[Ed25519 モジュール](https://taisukef.github.io/forge-es/lib/ed25519.js)を使ってキーペアを作成します。さらに作成したキーペアを [DIDKey モジュール](https://code4fukui.github.io/Ed25519/DIDKey.js)を使ってエンコードすることでキーペアから生成された DID とパスワードを取得することができます。

```js
import Ed25519 from "https://taisukef.github.io/forge-es/lib/ed25519.js";
import { DIDKey } from "https://code4fukui.github.io/Ed25519/DIDKey.js";

const keys = Ed25519.generateKeyPair();
const did = DIDKey.encodePublicKey(keys.publicKey);
const password = DIDKey.encodePrivateKey(keys.privateKey);
```

# 2. DID とパスワードの組み合わせが正しいかの検証

[Ed25519 モジュール](https://taisukef.github.io/forge-es/lib/ed25519.js)を使って秘密鍵から生成された公開鍵と入力された公開鍵を比較することで DID とパスワードの組み合わせが正しいかを判断します。そのため DID とパスワードを [DIDKey モジュール](https://code4fukui.github.io/Ed25519/DIDKey.js)と [bincat モジュール](https://js.sabae.cc/binutil.js) を使って公開鍵と秘密鍵に変換する必要があります。

```js
import { DIDKey } from "https://code4fukui.github.io/Ed25519/DIDKey.js";
import { bincat } from "https://js.sabae.cc/binutil.js";

// DID とパスワードから公開鍵と秘密鍵を取得
const publicKey = DIDKey.decode(did).data;
const privateKey = bincat(DIDKey.decode(password).data, publicKey);
```

続いて、取得した `publicKey` と `privateKey` から生成した `publicKeyFromPrivateKey` を使って公開鍵が一致しているかチェックします。

```js
const publicKeyFromPrivateKey = Ed25519.publicKeyFromPrivateKey({
  privateKey: keys.privateKey,
});
if (!equalsBin(publicKeyFromPrivateKey, keys.publicKey)) {
  throw new Error(
    'throw new Error("Unable to extract valid keys from the provided PEM file. Please verify the file.'
  );
}
```

# 3. 電子署名の生成

電子署名を生成するためには公開鍵、秘密鍵、メッセージの 3 つが必要になります。メッセージには任意の文字列を代入してください。

```js
import { Text } from "https://code4fukui.github.io/Ed25519/Text.js";

const msg = "任意の文字列";
const encodeMsg = Text.encode(message);
const msgSig = Ed25519.sign({
  privateKey: keys.privateKey,
  message: encodeMsg,
  encoding: "binary",
});
const sign = DIDKey.encode(keys.publicKey) + "-" + DIDKey.encodeSign(msgSig);
```

# 4. 電子署名の検証

電子署名から公開鍵を取得できます。その公開鍵と入力してもらった DID から取得できる公開鍵が一致しているかどうかをチェックします。一致していれば [Ed25519 モジュール](https://taisukef.github.io/forge-es/lib/ed25519.js)を使って電子署名の検証を行います。

```js
import Ed25519 from "https://taisukef.github.io/forge-es/lib/ed25519.js";
import { DIDKey } from "https://code4fukui.github.io/Ed25519/DIDKey.js";
import { Text } from "https://code4fukui.github.io/Ed25519/Text.js";

// DIDから公開鍵を取得
let publicKeySet = null;
if (did.length > 0) {
  try {
    publicKeySet = DIDKey.decode(did).data || "key";
  } catch (e) {
    return new Error("不正なDIDです" + e.message);
  }
}

// 公開鍵の一致検証
const [publicKeySign, msgSign] = sign.split("-");
const publicKey = DIDKey.decode(publicKeySign).data;
if (publicKeySet && !equalsBin(publicKey, publicKeySet)) {
  return new Error("公開鍵が一致しません");
}

// 電子署名の検証
const encodedMsg = Text.encode(message);
const signData = DIDKey.decode(msgSign).data;
const chk = Ed25519.verify({
  signature: signData,
  publicKey,
  message: encodedMsg,
  encoding: "binary",
});
```

# 5. 新規登録の実装

ここからはフロントエンドとサーバーでそれぞれの要件を満たした実装をしていく必要があります。

フロントエンドの要件

- DID、パスワード、メッセージ、電子署名を生成する
- POST API を叩くときに DID、ハンドルネーム、メッセージ、電子署名を body としてサーバーへ渡す
- 新規登録が完了すればローカルストレージにユーザー情報を保存する

サーバーの要件

- DID、ハンドルネーム、メッセージ、電子署名を受け取る
- 電子署名が正しいかの検証をする
- DID が DB に保存されているかチェック
  - 保存されていなければ DID を DB に保存して登録完了する
  - 保存されていればすでに登録済みということをフロントエンドを伝える

それではフロントエンドから実装していきましょう。
今回はユーザーにハンドルネーム(name)を入力してもらう程で進めます。

```js
// `DIDAuth` モジュールの `createNewUser` を使って DID、パスワード、メッセージ、電子署名を取得します。
const [did, password, message, sign] = DIDAuth.createNewUser(name);
// 公開鍵・名前・電子署名をサーバーに渡す
try {
  const resp = await fetch("/users/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      did,
      sign,
      message,
    }),
  });

  // サーバーから成功ステータスが返ってこないときの処理
  if (!resp.ok) {
    const errMsg = await resp.text();
    document.getElementById("error").innerText = "エラー：" + errMsg;
    return;
  }

  // レスポンスが正常ならローカルストレージに保存
  localStorage.setItem("did", did);
  localStorage.setItem("password", password);
  localStorage.setItem("name", name);
} catch (err) {
  document.getElementById("error").innerText = err.message;
}
```

続いてサーバー側の実装をします。DB に接続してクエリを叩く処理は `db-controller.js` にまとめてあります。

`serve.js`

```js
// ユーザー新規登録API
if (req.method === "POST" && pathname === "/users/register") {
  const json = await req.json();
  const userName = json.name;
  const sign = json.sign;
  const did = json.did;
  const message = json.message;

  // 電子署名が正しいかチェック
  try {
    const chk = DIDAuth.verifySign(did, sign, message);
    if (!chk) {
      return new Response("不正な電子署名です", { status: 400 });
    }
  } catch (e) {
    return new Response(e.message, { status: 400 });
  }

  // 既にDBにDIDが登録されているかチェック
  try {
    const isExists = await checkIfIdExists(did);
    if (isExists) {
      return Response("登録済みです", { status: 400 });
    }
  } catch (e) {
    return new Response(e.message, { status: 500 });
  }

  // DBにDIDとuserNameを保存
  try {
    await addDID(did, userName);
    return new Response("ok");
  } catch (e) {
    return new Response(e.message, { status: 500 });
  }
}
```

`db-controller.js`

```js
import { Client } from "https://deno.land/x/mysql@v2.11.0/mod.ts";
import "https://deno.land/std@0.192.0/dotenv/load.ts";

// SQLの設定
const connectionParam = {
  hostname: Deno.env.get("HOST_NAME"),
  username: Deno.env.get("SQL_USER"),
  password: Deno.env.get("SQL_PASSWORD"),
  db: Deno.env.get("DATABASE"),
  port: Deno.env.get("PORT"),
};

// クライアントの作成
const client = await new Client().connect(connectionParam);

export async function checkIfIdExists(did) {
  // DBにDIDがあるか
  const res = await client.execute(
    `select count(*) from users where did = "${did}";`
  );
  return res.rows[0][res.fields[0].name] === 1;
}

export async function addDID(did, userName) {
  // DBにデータを追加
  await client.execute(
    `insert into users (did, name) values ("${did}", "${userName}");`
  );
}
```

# 6. ログインの実装

新規登録と同様にフロントエンドとサーバーでそれぞれの要件を満たした実装をしていきます。

フロントエンド

- DID と パスワードを入力してもらう
- 入力してもらった DID とパスワードの組み合わせが正しいかの検証
- DID、パスワード、パス、メソッドからメッセージと電子署名を取得
- `fetch` メソッドを使って DID、メッセージ、電子署名をサーバーへ送信
- ログインに成功すればユーザー情報がサーバーから返ってくるため、それをローカルストレージに保存する

サーバー

- DID、メッセージ、電子署名を受け取る
- 電子署名が正しいかの検証をする
- DID が DB に保存されているかチェック
  - 保存されていなければ未登録ということをフロントエンドに伝える
  - 保存されていればログイン成功と判断しユーザー情報を返す

まずはフロントエンドから実装します。今回は DID とパスワードの入力は `pem` ファイルをインポートすることとします。また DID とパスワードの組み合わせの検証は `DIDAuth` モジュールの `getDIDAndPasswordFromPem()` 内で行っています。

```js
// pemファイルを受け取って、DIDとパスワードを取得する
const pemFile = document.getElementById("pemFile").files[0];
if (!pemFile) {
  document.getElementById("error").innerText = "ファイルを選択してください。";
}

const [did, password] = await DIDAuth.getDIDAndPasswordFromPem(pemFile);

// サーバーにユーザー情報を問い合わせる
const path = "/users/login";
const method = "POST";
// 電子署名とメッセージの作成
const [message, sign] = DIDAuth.genMsgAndSign(did, password, path, method);

// 公開鍵・電子署名をサーバーに渡す
try {
  const resp = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ did, sign, message }),
  });

  // サーバーから成功ステータスが返ってこないときの処理
  if (!resp.ok) {
    const errMsg = await resp.text();
    document.getElementById("error").innerText = "エラー：" + errMsg;
  }

  // レスポンスが正常ならローカルストレージに保存
  const json = await resp.json();
  localStorage.setItem("did", did);
  localStorage.setItem("password", password);
  localStorage.setItem("name", json.user.name);

  document.getElementById("status").innerText = "ログイン成功";
  document.getElementById("name").innerText = json.user.name;
  document.getElementById("did").innerText = did;
  document.getElementById("password").innerText = password;
} catch (err) {
  document.getElementById("error").innerText = err.message;
}
```

続いてサーバー側を実装します。電子署名のチェックと DB に DID が保存されているかのチェックは新規登録と同じ処理になっています。

`serve.js`

```js
// ユーザーログインAPI
if (req.method === "POST" && pathname === "/users/login") {
  const json = await req.json();
  const sign = json.sign;
  const did = json.did;
  const message = json.message;

  // 電子署名が正しいかチェック
  try {
    const chk = DIDAuth.verifySign(did, sign, message);
    if (!chk) {
      return new Response("不正な電子署名です", { status: 400 });
    }
  } catch (e) {
    return new Response(e.message, { status: 400 });
  }

  // DBにDIDが登録されているかチェック
  try {
    const isExists = await checkIfIdExists(did);
    if (!isExists) {
      return new Response("登録されていません", { status: 400 });
    }
    // 登録済みであればuser情報を返す
    const res = await getUser(did);
    const user = { did: res.rows[0].did, name: res.rows[0].name };
    return new Response(JSON.stringify({ user }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(e.message, { status: 500 });
  }
}
```

`db-controller.js`

```js
// 以下のコードを追加
export async function getUser(did) {
  // DBからDIDが一致するレコードを取得
  const res = await client.execute(`select * from users where did = "${did}";`);
  return res;
}
```

以上がログイン機能の実装となります。
