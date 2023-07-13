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

/**
 * 任意のDIDがDBに保存されているかをチェック
 * DIDがDBに保存されていればtrue、保存されていなければfalseを返す
 * @param {string} did
 * @returns {boolean} result
 */
export async function checkDIDExists(did) {
  // DBに電子署名があるか
  const res = await client.execute(
    `select count(*) from users where did = "${did}";`
  );
  // レスポンスのObjectから任意のDIDと保存されているDIDが一致している数を取得し
  // その数が1かどうかを返す
  // DBにはDIDが重複されない設計になっているので一致している数は0か1になる
  return res.rows[0][res.fields[0].name] === 1;
}

/**
 * 任意のDIDとユーザー名をDBに保存する
 * @param {string} did
 * @param {string} userName
 */
export async function addDID(did, userName) {
  // DBにデータを追加
  await client.execute(
    `insert into users (did, name) values ("${did}", "${userName}");`
  );
}

/**
 * DBから任意のDIDと一致するレコードを取得
 * @param {string} did
 * @returns {Object} result
 */
export async function getUser(did) {
  // DBからDIDが一致するレコードを取得
  const res = await client.execute(`select * from users where did = "${did}";`);
  return res;
}
