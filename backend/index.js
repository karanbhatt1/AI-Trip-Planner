import express from 'express'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import chatBotRoutes from './Routes/chatbot.routes.js'
const app = express()
dotenv.config()

const port = process.env.PORT || 3000

//middleware
app.use(express.json())

//Mongo Db connected
mongoose.connect(process.env.MONGO_URI)
.then(()=>{
    console.log("Mongo DB Connected successfully!")
}).catch((error)=>{
    console.log("Error connecting to MongoDB",error)
})

// Defining Routes
app.use('/bot/v1/',chatBotRoutes)

app.listen(port, () => {
  console.log(`Server is running on Port: ${port}`)
})
