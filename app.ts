import express from "express";
import bodyParser from "body-parser";
import { router as index } from "./api/default";
import { router as user } from "./api/user";
import { router as image } from "./api/image";
import { router as vote } from "./api/vote";
import {router as admin } from "./api/admin";
import mysql from "mysql";
import cors from "cors";
import util from "util";

//dbconnect
export const conn = mysql.createPool({
    connectionLimit: 10,
    host: "202.28.34.197",
    user: "web65_64011212102",
    password: "64011212102@csmsu",
    database: "web65_64011212102",
});
//dbconnect by async
export const queryAsync = util.promisify(conn.query).bind(conn);

//App
export const app = express();
app.use(
cors({
    origin: "*",
})
);
app.use(bodyParser.text());
app.use(bodyParser.json());

app.use("/", index);
app.use("/user", user);
app.use("/user/image", image);
app.use("/vote", vote);
app.use("/admin",admin)