import express from "express";
import multer from "multer";
import mysql from "mysql";
import { conn } from "../app";
import { storage } from "../firebaseconnection";
import { deleteObject,ref } from "firebase/storage";
import { uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { UploadPostRequest } from "../model/Request/UploadPostRequest";
import { ImageResponse } from "../model/Response/ImageResponse";

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

export const router = express.Router();

// Get Image by id user
router.get("/userimage/:uid", (req, res) => {
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

// Get Image by id user
router.get("/getImageById/:mid", (req, res) => {
  const mid = req.params.mid;
  conn.query(
    "SELECT * FROM image WHERE mid = ?",
    [mid],
    async (err, result) => {
      if (err) {
        res.status(500).send(err);
      } else {
        res.status(200).json(result[0])
      }
    }
  );
});

// upload file ลงใน Firebase Store และเก็บที่อยู่ภาพลงใน database
const fileUpload = new FileMiddleware();
router.post(
  "/",
  fileUpload.diskLoader.single("file"),
  async (req, res) => {
    console.log("File "+req.file);
    
    try {
      // upload รูปภาพลง firebase โดยใช้ parameter ที่ส่งมาใน URL path
      const url = await firebaseUpload(req.file!);
      res.send("Image: " + url);
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(500).send("Failed to upload image");
    } 
  }
);

async function firebaseUpload(file: Express.Multer.File) {
  // Upload to firebase storage
  const filename = Date.now() + "-" + Math.round(Math.random() * 1000) + ".png";
  // Define locations to be saved on storag
  const storageRef = ref(storage, "/images/" + filename);
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

//Upload to user
router.post(
  "/upload",
  fileUpload.diskLoader.single("file"),
  async (req, res) => {
    // Upload to firebase storage
    const filename =
      Date.now() + "-" + Math.round(Math.random() * 1000) + ".png";
    // Define locations to be saved on storag
    const storageRef = ref(storage, "/images/" + filename);
    // define file detail
    const metaData = { contentType: req.file!.mimetype };
    // Start upload
    const snapshost = await uploadBytesResumable(
      storageRef,
      req.file!.buffer,
      metaData
    );
    // Get url image from storage
    const url = await getDownloadURL(snapshost.ref);
    let user: UploadPostRequest = req.body;
    let sql = "INSERT INTO `image`(`path`, `name`, `userID`, `score`) VALUES (?,?,?,?)";
    sql = mysql.format(sql, [
      url, 
      user.name, 
      user.userID,
      user.score,
    ]);
    conn.query(sql, (err, result) => {
      if (err) {
        res
          .status(409)
          .json({ affected_row: 0, last_idx: 0, result: err.sqlMessage });
      } else {
        res.status(201).json({
          affected_row: result.affectedRows,
          last_idx: result.insertId,
          result: url,
        });
      }
    });
  }
);

router.get("/", (req, res) => {  
  conn.query(
    "SELECT * FROM `image`",
    (err, result) => {
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
    }
  );
});

//สุ่มรูปภาพ ผ่านแล้ว
router.get("/random", (req, res) => {  
  conn.query(
    "SELECT * FROM `image`",
    (err, result) => {
      if (err) {
        res.status(500).json({ result: err.sqlMessage });
      } else {
        res.status(200).json({ random: result });
        // const images: ImageResponse[] = result;
        // console.log("test ");

        // let image1: ImageResponse = images[Math.floor(Math.random() * images.length)];
        // let image2: ImageResponse = images[Math.floor(Math.random() * images.length)];
        // สุ่มอีกรูปใหม่จนกว่ารูปทั้ง2 ไม่ใช่รูปของคนคนเดียวกัน
        // while (image1.mid === image2.mid) {
        //   image2 = images[Math.floor(Math.random() * images.length)];
        // }
        // res.status(200).json([image1, image2]);
      }
    }
  );
});

//Sort Order by Max to min
router.get("/sort", (req, res) => {
  conn.query(
    "SELECT image.mid, image.path, image.name, image.userID , image.score FROM `image` GROUP by image.mid ORDER by score DESC",
    (err, result) => {
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
    }
  );
});

//ลบรูปภาพจาก firebase และลบข้อมูลจาก database ผ่านแล้ว
router.delete("/delete/:id", fileUpload.diskLoader.single("file"), (req, res) => {
  const mid = req.params.id;
  // ค้นหาข้อมูลรูปภาพที่ต้องการลบจาก database
  conn.query(
    "SELECT * FROM `image` WHERE mid = ?",
    [mid],
    async (err, result) => {
      if (err) {
        res.status(500).send("Failed to delete file");
      } else {
        if (result.length > 0) {
          const image: ImageResponse[] = result;
          // ลบรูปภาพออกจาก firebase
          await firebaseDelete(image[0].path);        
          // ลบข้อมูลการโหวตของรูปภาพออกจาก database
          conn.query(
            "DELETE FROM `vote` WHERE imageID = ?",
            [mid],
            (err, result) => {
              if (err) {
                res.status(500).json({ affected_row: 0 });
              } else {
                // ลบข้อมูลรูปภาพจาก database
                conn.query(
                  "DELETE FROM `image` WHERE mid = ?",
                  [mid],
                  (err, result) => {
                    if (err) {
                      res.status(500).json({ affected_row: 0 });
                    } else {
                      res
                        .status(200)
                        .json({ affected_row: result.affectedRows });
                    }
                  }
                );
              }
            }
          );
        } else {
          res.status(500).send("ImageID not found");
        }
      }
    }
  );
});

// ลบรูปภาพใน firebase
async function firebaseDelete(path: string) {
  const storageRef = ref(
    storage,
    "/images/" + path.split("F")[1].split("?")[0]
  );
  const snapshost = await deleteObject(storageRef);
}

router.get('/rank', async (req, res)=>{
  // หาลำดับของรูปภาพทั้งหมดในวันนี้
  let resultDay1: any = await new Promise((resolve, reject) => {
    // ค้นหาอันดับรูปภาพทั้งหมดย้อนหลังตามจำนวนวันที่ต้องการ ด้วยวันย้อนหลังที่ i วัน
    conn.query(
      "SELECT image.mid, image.path, image.name, image.userID, SUM(vote.vote) as total FROM image INNER JOIN vote ON vote.imageID = image.mid and vote.datetime <= DATE_SUB(NOW(), INTERVAL ? DAY) GROUP BY image.mid ORDER BY total DESC",
      [0],
      (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      }
    );
  });
  let today: ImageResponse[] = resultDay1;

  let resultDay2: any = await new Promise((resolve, reject) => {
    // ค้นหาอันดับรูปภาพทั้งหมดย้อนหลังตามจำนวนวันที่ต้องการ ด้วยวันย้อนหลังที่ i วัน
    conn.query(
      "SELECT image.mid, image.path, image.name, image.userID, SUM(vote.vote) as total FROM image INNER JOIN vote ON vote.imageID = image.mid and vote.datetime <= DATE_SUB(NOW(), INTERVAL ? DAY) GROUP BY image.mid ORDER BY total DESC",
      [1],
      (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      }
    );
  });
  let yesterday: ImageResponse[] = resultDay2;

    // คำนวนผลปัจจุบันกับเมื่อวานว่าขึ้นลงกี่อันดับ
    for (let i = 0; i < today.length; i++) {
      for (let j = 0; j < yesterday.length; j++) {
        if (today[i].mid == yesterday[j].mid) {
          if (j + 1 - (i + 1) > 0) {
            today[i].result = "เพิ่มมา +" + (j + 1 - (i + 1)).toString() + " อันดับ";
          } else if (j + 1 - (i + 1) < 0) {
            today[i].result = "ลดลง " + (j + 1 - (i + 1)).toString() + " อันดับ";
          } else if (i == j){
            today[i].result = "ไม่กระดิกเลยยย";
          }
          break;
        }
      }
    }

    // Response
  res.status(200).json({
    today: today,
    yesterday: yesterday
  });
});

router.get('/getAllbyuserid/:id', async (req, res)=>{
  const id = req.params.id;
  // หาลำดับของรูปภาพทั้งหมดในวันนี้
  let imageResult: any = await new Promise((resolve, reject) => {
    conn.query(
      "SELECT * FROM `image` WHERE userID = ?",
      [id],
      (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      }
    );
  });

  let userResult: any = await new Promise((resolve, reject) => {
    conn.query(
      "SELECT * FROM `user` WHERE uid = ?",
      [id],
      (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      }
    );
  });

    // Response
  res.status(200).json({ 
    imageResult: imageResult ,
    userResult: userResult
  });
});

router.put("/Editname/:mid/:name", (req, res) => {
  const mid = +req.params.mid;
  const name = req.params.name;
  conn.query(
    "UPDATE `image` SET `name`= ? WHERE mid = ?", [name, mid],
    (err, result) => {
      if (err) {
        res.status(500).json({
          affectedRows: result.affectedRows,
          result: err.sqlMessage,
        });
      } else {
        res.status(200).json({
          affectedRows: result.affectedRows,
          result: "",
        });
      }
    }
  );
});