//Import libraries
const express = require("express")
const ejs = require("ejs")
const {createClient} =  require("@supabase/supabase-js")
const multer = require("multer")
const argon2 = require("argon2")
const crypto = require("crypto")
const cors = require("cors")

//Config
const port = process.env.PORT || 3000
const debug_host = "localhost"
const marks = ["",1,2,3]
const database_url = 2//process.env.DATABASE || "https://nsdgbqozatxvpowkxkav.supabase.co"
const database_key = 2//process.env.DATABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zZGdicW96YXR4dnBvd2t4a2F2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODkxODY4NCwiZXhwIjoyMDc0NDk0Njg0fQ.0UNL6EQjMnRR2KVUzRGC9fRcPZwPbnaGZvHOdomJbFM"
const app = express()
//const database = createClient(database_url,database_key)
const upload = multer({ storage: multer.memoryStorage() })
const sessions = {}
const debug = true

app.use(express.urlencoded({extended : true}))
app.set("view engine","ejs")
app.use(express.json())
app.use(express.static("sources"))
app.use(cors({
    origin: ["localhost"],
    methods: ["GET", "POST"],
    credentials: true
}))

const requireCookieId = (req) => {
    const cookie = req.headers.cookie
    if(!cookie)
    {
        return ""
    }
    const sessionId = cookie.split("=")[1]||""
    return sessionId
}
const auth = (req,res,next) => {
    const sessionId = requireCookieId(req)
    if(!sessions[sessionId])
    {
        res.locals.user = null
    }
    else
    {
        if(debug) console.log(sessions[sessionId])
        res.locals.user = sessions[sessionId]
    }
    next()
}
const createCookie = () => {
    return crypto.randomBytes(32).toString("hex")
}
const exc = (handler) => {
  return async (req, res, next) => {
        try
        {
            await handler(req, res, next)
        }
        catch (err) 
        {
            res.render("error", {error : err})
        }
    }
}

//Sources
app.get("/style",(req,res) => {
    res.sendFile(__dirname + "/sources/style/index.css")
})
app.get("/render_style",(req,res) => {
    res.sendFile(__dirname + "/sources/style/render.css")
})

//Endpoint
app.get(["/","/home","/index"],exc((req,res) => {
    res.render("index")
}))
app.get("/view",exc((req,res) => {
    if(!req.query.default)
        return res.render("view",{
            default : parseInt(req.query.default)
        });
    res.render("view")
}))
app.get("/upload",exc((req,res) => {
    res.render("upload")
}))

app.get("/render/:type",exc((req,res) => {
    const type = req.params.type
    const from = req.headers["sec-fetch-dest"];
    if (from != "iframe") 
        return res.status(403).send("Not Authorized")
    switch(type)
    {
        case "fractal" : return res.render("render",{ type: type })
        default : return res.status(403).send("Not Authorized")
    }
}))
//

debug?
    app.listen(port,debug_host,(err) => {
        console.log(err?err:"Server online : http://" + debug_host + ":" + port)
    }) :  
    app.listen(port,(err) => {
        console.log(err?err:"Server online")
    })