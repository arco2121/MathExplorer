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
            res.render("error", {code : 200 , message : err})
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
//
//Endpoint
app.get(["/","/home","/index"],exc((req,res) => {
    res.render("index")
}))
app.get("/view",exc((req,res) => {
    if(req.query.default_element && req.query.type)
        return res.render("view",{
            default_element : parseInt(req.query.default_element),
            type : req.query.type
        });
    res.render("view")
}))
app.get("/upload",exc((req,res) => {
    res.render("upload")
}))
app.get("/hub", exc((req,res) => {
    if(!req.query.urls)
        return res.render("error", { code : 405, message : "Array of URLs not valid"})
    res.render("hub", { rendering : req.query.urls })
}))
app.get("/render",exc((req,res) => {
    const from = req.headers["sec-fetch-dest"];
    if (from != "iframe") 
        return res.render("error", { code : 403, message : "Not Authorized"})
    return res.render("render")
}))
//

app.use((req,res) => {
    res.render("error", {
        code : 404,
        message : "Page not found or malformed request"
    })
})

debug ?
    app.listen(port,debug_host,(err) => {
        console.log(err?err:"Server online : http://" + debug_host + ":" + port)
    }) :  
    app.listen(port,(err) => {
        console.log(err?err:"Server online")
    })