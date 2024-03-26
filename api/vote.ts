import express from "express";
import { conn } from "../app";
import { ImageResponse } from "../model/Response/ImageResponse";

export const router = express.Router();

router.get('/', (req, res)=>{
  res.send('Get in vote.ts');
});

// การกดโหวต
router.post("/:win/:Wscore/:lose/:Lscore/:winUserID/:loseUserID", (req, res) => {
  const win:number = parseInt(req.params.win);
  const Wscore:number = parseInt(req.params.Wscore);
  const lose:number = parseInt(req.params.lose);
  const Lscore:number = parseInt(req.params.Lscore);
  const winUserID:string = req.params.winUserID;
  const loseUserID:string = req.params.loseUserID;
  // ลงคะแนนให้ผู้ชนะ
  conn.query(
    "INSERT INTO `vote`(`imageID`, `userID`, `vote`) VALUES (?,?,?)",
    [win, winUserID, Wscore],
    (err, result) => {
      if (err) {
        res.status(500).json({ result: err.sqlMessage });
      } else {
        // ลงคะแนนให้ผู้แพ้
        conn.query(
          "INSERT INTO `vote`(`imageID`, `userID`, `vote`) VALUES (?,?,?)",
          [lose, loseUserID, Lscore],
          (err, result) => {
            if (err) {
              res.status(500).json({ result: err.sqlMessage });
            } else {
              
            // อัปเดตคะแนนในตาราง image
            conn.query(
              "UPDATE `image` SET `score` = `score` + ? WHERE `mid` = ?",
              [Wscore, win],
              (err, result) => {
                if (err) {
                  res.status(500).json({ result: err.sqlMessage });
                }
                conn.query(
                  "UPDATE `image` SET `score` = `score` + ? WHERE `mid` = ?",
                  [Lscore, lose],
                  (err, result) => {
                    if (err) {
                      res.status(500).json({ result: err.sqlMessage });
                    } else {
                      res.status(200).json({ result: "" });
                    }
                  }
                );
              }
            );
            }
          }
        );
      }
    }
  );
});

//ผลโหวต 7 วันล่าสุด
router.get("/vote7day/:mid", async (req, res) => {
  const mid = +req.params.mid;
  let name: string;
  let path: string;
  let scores: number[] = [];
  let date: string[] = [];
  let upScore: number[] = [];
  for (let i = 0; i < 7; i++){
    let result: any = await new Promise((resolve, reject) => {
      conn.query(
        "SELECT image.mid, image.path, image.name, image.userID, SUM(vote.vote) as score FROM image INNER JOIN vote ON vote.imageID = image.mid and vote.datetime <= DATE_SUB(NOW(), INTERVAL ? DAY) and image.mid = ?",
        [i , mid],
        async (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        }
      );
    });

    let image: ImageResponse[] = result;
    if (i == 0) {
      name = image[0].name;
      path = image[0].path;
    }
    scores.push(image[0].score);

    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() - i);
    const formattedDate = currentDate.toISOString().split("T")[0];
    date.push(formattedDate);
  }

  // ตรวจสอบการเพิ่มลดคะแนน วันนี้กับเมื่อวาน
  for (let i = 0; i < date.length - 1; i++) {
    if (scores[i] - scores[i + 1] > 0) {
      upScore[i] = (scores[i] - scores[i + 1]);
    } else if(scores[i] - scores[i + 1] < 0) {
      upScore[i] = (scores[i] - scores[i + 1]);
    }
  }
  
  res.status(200).json({
    mid: mid,
    name: name!,
    path: path!,
    score: scores,
    date: date,
    upScore: upScore,
  });
});