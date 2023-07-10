import { DIDKey } from "https://code4fukui.github.io/Ed25519/DIDKey.js";
import { PEMFile } from "https://code4fukui.github.io/Ed25519/PEMFile.js";
import { Text } from "https://code4fukui.github.io/Ed25519/Text.js";
import { bincat } from "https://js.sabae.cc/binutil.js";
import { downloadFile } from "https://js.sabae.cc/downloadFile.js";
import Ed25519 from "https://taisukef.github.io/forge-es/lib/ed25519.js";

export class DIDAuth {
  constructor() {
    // initialize properties if any
  }

  /**
   * 新しいユーザーを作成します
   * 
   * @param {string} name - ユーザーの名前(必須)
   * @param {Object} options - ユーザーの追加情報はこちらに指定する
   * @return {Object} user
   * @return {string} user.name - ユーザー名
   * @return {string} user.did - DID
   * @return {string} user.password - パスワード
   * @return {string} user.message - API通信用メッセージ
   * @return {string} user.sign - 電子署名
   *  
   */
  static createNewUser(name, options = {}) {
    // 名前が指定されてなければエラー
    if (!name) {
      throw new Error('name is requried parameter');
    }

    // 鍵・DID・パスワードの生成
    const keys = Ed25519.generateKeyPair();
    const did = DIDKey.encodePublicKey(keys.publicKey);
    const password = DIDKey.encodePrivateKey(keys.privateKey);

    // メッセージと電子署名を作る
    const message = '{method: createNewUser, name: ' + name + ', options: ' + JSON.stringify(options) + '}';
    const encodeMsg = Text.encode(message);
    const msgSig = Ed25519.sign({ privateKey: keys.privateKey, message: encodeMsg, encoding: "binary" });
    const sign = DIDKey.encode(keys.publicKey) + '-' + DIDKey.encodeSign(msgSig);

    return [did, password, message, sign];
  }

  /**
   * didとpasswordをpemファイルとして保存する
   * 
   * @param {string} did 
   * @param {string} password 
   */
  static async savePem(did, password) {
    // 鍵の取得
    const publicKey = DIDKey.decode(did).data;
    const privateKey = bincat(DIDKey.decode(password).data, publicKey);

    const keys = { publicKey, privateKey }
    const pem = PEMFile.encode(keys);
    await downloadFile("key.secret.pem", new TextEncoder().encode(pem));
  }


  /**
   * 
   * @param {File} pemFile 
   * @returns {[string, string]} DID, password
   */
  static async getDIDAndPasswordFromPem(pemFile) {
    // 公開鍵・秘密鍵を取り出す
    const fileTxt = await pemFile.text();
    const keys = PEMFile.decode(fileTxt);

    // 公開鍵と秘密鍵の検証
    const publicKeyFromPrivateKey = Ed25519.publicKeyFromPrivateKey({ privateKey: keys.privateKey });
    if (!equalsBin(publicKeyFromPrivateKey, keys.publicKey)) {
      throw new Error('throw new Error("Unable to extract valid keys from the provided PEM file. Please verify the file.');
    }

    const did = DIDKey.encodePublicKey(keys.publicKey);
    const password = DIDKey.encodePrivateKey(keys.privateKey);
    return [did, password];
  }

  /**
   * 電子署名が正しいか確認する  
   * 正しければtrue、正しくなければfalse
   * @param {string} did 
   * @param {string} sign 
   * @param {string} message
   * @return {Boolean} result
   */
  static validSign(did, sign, message) {
    // didから公開鍵を取得
    let publicKeySet = null;
    if (did.length > 0) {
      try {
        publicKeySet = DIDKey.decode(did).data || "key";
      } catch (e) {
        return new Error("不正なDIDです" + e.message);
      }
    }

    // 公開鍵の一致検証
    const [rawPublicKey, rawSign] = sign.split('-');
    const publicKey = DIDKey.decode(rawPublicKey).data;
    if (publicKeySet && !equalsBin(publicKey, publicKeySet)) {
      return new Error("公開鍵が一致しません");
    }

    // 電子署名の検証
    const encodedMsg = Text.encode(message);
    const signData = DIDKey.decode(rawSign).data;
    const chk = Ed25519.verify({ signature: signData, publicKey, message: encodedMsg, encoding: "binary" });
    return chk;
  }

  /**
   * メッセージと電子署名を生成する
   * @param {string} did 
   * @param {string} password 
   * @param {string} path 
   * @param {string} method 
   * @param {Object} params 
   * @returns {[string, string]} message, sign
   */
  static genMsgAndSign(did, password, path, method, params = {}) {
    // 鍵の取得
    const publicKey = DIDKey.decode(did).data;
    const privateKey = bincat(DIDKey.decode(password).data, publicKey);

    // メッセージと電子署名を作成
    const message = JSON.stringify(path, method, params);
    const encodeMsg = Text.encode(message);
    const messageSig = Ed25519.sign({ privateKey, message: encodeMsg, encoding: "binary" });
    const sign = DIDKey.encode(publicKey) + '-' + DIDKey.encodeSign(messageSig);

    return [message, sign];
  }
}

export const equalsBin = (b1, b2) => {
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