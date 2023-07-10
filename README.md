## DID Login Sample

### DIDAuth

DIDログインに必要な処理群を`auth/DIDAuth.js`にまとめた。

https://nabe1005.github.io/did-login/auth/DIDAuth.js

### `createNewUser('test')`

新しいユーザーを作成します。  
返り値は配列で、DID、パスワード、API用メッセージ、電子署名の順に返されます。

optionsには、性別・誕生日など、名前以外のユーザー情報を追加する際に使用します。

```js
const name = 'test';
const [did, password, message, sign] = DIDAuth.createNewUser(name);

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
```

### `savePem(did, password)`

DIDとパスワードを公開鍵・秘密鍵の形式に変換し、PEMファイルとしてローカルに保存します。
新規登録時にダウンロードし、ログインするときにこのPEMファイルを使用して、DIDとパスワードを復元する想定です。

```js
const did = document.getElementById('did').value;
const password = document.getElementById('password').value;
DIDAuth.savePem(did, password);
```

### `getDIDAndPasswordFromPem(pemFile)`

PEMファイルから、公開鍵・秘密鍵を取り出して、DIDとパスワードを返すメソッドです。
PEMファイルから取り出された公開鍵と秘密鍵が正しいかどうかの検証もします。

```js
const pemFile = document.getElementById('pemFile').files[0];
if (!pemFile) {
  document.getElementById('error').innerText = 'ファイルを選択してください。';
}

const [did, password] = await DIDAuth.getDIDAndPasswordFromPem(pemFile);
```

### `verifySign(did, sign, message)`

DIDとメッセージを使用して、電子署名(sign)の検証をするメソッドです。
電子署名が正しければtrue、正しくなければfalseを返します。

また、「不正なDIDが使用された」、「公開鍵が一致しない」場合はエラーが返ります。

```js
try {
  const chk = DIDAuth.verifySign(did, sign, message);
  if (!chk) {
    return new Response("不正な電子署名です", { status: 400 })
  }
} catch (e) {
  return new Response(e.message, { status: 400 });
}
```

### `genMsgAndSign(did, password, path, method, params = {})`

API用メッセージと電子署名を生成するメソッドです。
pathとmethodはAPIのもの  
paramsにはDID、メッセージ、電子署名以外に必要なパラメータがあれば指定してください。

```js
const path = '/users/login';
const method = 'POST';
const [message, sign] = DIDAuth.genMsgAndSign(did, password, path, method);
```