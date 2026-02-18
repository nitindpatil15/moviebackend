// Buffer polyfill for Node.js v25 compatibility
import { Buffer } from 'buffer';
globalThis.Buffer = Buffer;

import {app} from './app.js'
import dotenv from 'dotenv'
import { connectDB } from './config/db.js';
import { PORT } from "./constant.js";

dotenv.config({
    path:'./env'
})

connectDB()
.then(()=>{
    app.on('Error',(error)=>{
        console.log("Server Error ",error)
    })
    app.listen(PORT || 5600,()=>{
        console.log(`Server is Running on http://localhost:${PORT}`)
    })
})