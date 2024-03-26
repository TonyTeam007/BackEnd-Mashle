import express from "express";
import { conn , queryAsync  } from "../app";
import { LoginPostRequest } from "../model/Request/LoginPostReq";
import { UserPostRequest } from "../model/Request/UserPostRequest";
import { uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { ref } from "firebase/storage";
import { storage } from "../firebaseconnection";
export const router = express.Router();
import * as crypto from 'crypto';
import mysql from "mysql";
import multer from "multer";

class FileMiddleware {
  //Attribute of class
  filename = "";
  //Attribute diskloader for saving file to disk
  public readonly diskLoader = multer({
    // storage = saving file to memory
    storage: multer.memoryStorage(),
    // limit file size
    limits: {
      fileSize: 67108864, // 64 MByte
    },
  });
}

// ใช้ crypto เพื่อเข้ารหัสผ่านของผู้ใช่
function hashPassword(password: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(password);
  return hash.digest('hex');
}

//Show all
router.get('/show', (req, res)=>{
  conn.query('select * from user', (err, result, fields)=>{
    res.json(result);
  });
});

//GetByID
router.get('/show/:id', (req, res)=>{
  let id = +req.params.id;
  let sql = mysql.format("select * from user where uid = ?", [id]);
  conn.query(sql, (err, result)=>{
    res.json(result);
  });
});

//Login
router.post('/login', (req, res)=>{
  let login: LoginPostRequest = req.body;
  conn.query("SELECT * FROM `user` WHERE email = ? AND password = ?",
  [login.email , hashPassword(login.password)],
  (err , result) => {
    if (err) {
      res.status(500).json({
        result: err.sqlMessage,
      });
    } else {
      if (result.length > 0) {
        res.status(200).json(result);
      } else {
        res.status(401).json(result);
      }
    }
  });
});


// sql = mysql.format(sql, [
//   user.email,
//   hashPassword(user.password),
//   user.name,
//   user.image,
//   user.type,
// ]);
// "INSERT INTO `user`(`email`, `password`, `name`, `image`, `type`) VALUES (?,?,?,?,?)";
//Register
router.post('/register', (req, res)=>{
  let user: UserPostRequest = req.body;
  let sql = "INSERT INTO `user`(`email`, `password`, `name`, `image`, `type`) VALUES (?,?,?,?,?)";
  sql = mysql.format(sql, [
    user.email,
    hashPassword(user.password),
    user.name,
    user.image,
    user.type,
  ]);
  conn.query(sql, (err, result) => {
    if (err) {
      res
      .status(401)
      .json({ affected_row: 0, last_idx: 0, result: err.sqlMessage });
    } else {
      res.status(201).json({
        affected_row: result.affectedRows,
        last_idx: result.insertId,
        result: "",
      });
    }
  });
});

//Update
router.put("/edit/:id", async (req, res) => {
  let id = +req.params.id;
  let user: UserPostRequest = req.body;
  let userOriginal: UserPostRequest | undefined;

  let sql = mysql.format("select * from user where uid = ?", [id]);

  let result = await queryAsync(sql);
  const rawData = JSON.parse(JSON.stringify(result));
  console.log(rawData);
  userOriginal = rawData[0] as UserPostRequest;
  console.log(userOriginal);

  let updateUser = {...userOriginal, ...user};
  console.log(user);
  console.log(updateUser);

    sql =
      "update  `user` set `name`=?, `email`=?, `password`=?, `image`=?, `type`=? where `uid`=?";
    sql = mysql.format(sql, [
      updateUser.name,
      updateUser.email,
      hashPassword(updateUser.password),
      updateUser.image,
      updateUser.type,
      id,
    ]);
    conn.query(sql, (err, result) => {
      if (err) throw err;
      res.status(201).json({ affected_row: result.affectedRows });
    });
});

// upload รูปภาพใน firebase
async function firebaseUpload(file: Express.Multer.File) {
  // Upload to firebase storage
  const filename = Date.now() + "-" + Math.round(Math.random() * 1000) + ".png";
  // Define locations to be saved on storag
  const storageRef = ref(storage, "/images/user_profile" + filename);
  // define file detail
  const metaData = { contentType: file.mimetype };
  // Start upload
  const snapshost = await uploadBytesResumable(
    storageRef,
    file.buffer,
    metaData
  );
  // Get url image from storage
  const url = await getDownloadURL(snapshost.ref);

  return url;
}