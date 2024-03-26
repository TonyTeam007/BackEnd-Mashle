import express from "express";
import { conn } from "../app";
export const router = express.Router();
import mysql from "mysql";

//user ทั้งหมด
router.get('/showalluser', (req, res)=>{
    conn.query('select * from user', (err, result, fields)=>{
      res.json(result);
    });
})

//GetByID
router.get('/showuserbyid/:id', (req, res)=>{
    let id = +req.params.id;
    let sql = mysql.format("select * from user where uid = ?", [id]);
    conn.query(sql, (err, result)=>{
      res.json(result[0]);
    });
});

//image ของ user ทั้งหมด
router.get('/showallimage', (req, res)=>{
    conn.query('select * from image', (err, result, fields)=>{
      res.json(result);
    });
})

// Get Image by id user
router.get("/showuserimagebyid/:uid", (req, res) => {
    const uid = req.params.uid;
    conn.query(
      "SELECT * FROM image WHERE image.userID = ?",
      [uid],
      async (err, result) => {
        if (err) {
          res.status(500).send(err);
        } else {
          res.status(200).json(result)
        }
      }
    );
});

