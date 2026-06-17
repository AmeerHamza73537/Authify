    import express from "express"
    import cors from "cors"
    import "dotenv/config"
    import cookieParser from "cookie-parser"
    import connectDB from "./config/mongodb.js"
    import {authRouter} from './Routes/auth-routes.js'
    import userRouter from "./Routes/userRoute.js"

    const app = express()
    const port = process.env.PORT || 5000
    connectDB()

    // derive frontend/backend URLs from environment variables so we can deploy later
    // when deploying you'll set these to the real hostnames
    const frontendUrl = process.env.FRONTEND_URL 
    // const backendUrl = process.env.BACKEND_URL 

    // allow multiple origins (comma‑separated list) if provided in FRONTEND_URL
    const allowedOrigins = frontendUrl.split(',').map(u => u.trim())
    // always include the development Netlify preview for reference
    allowedOrigins.push('https://mern-auth-dev-weekends-1.netlify.app')

    app.use(express.json())
    app.use(cookieParser())
    // log incoming requests for debugging
    app.use((req, res, next) => {
        console.log(`${req.method} ${req.originalUrl}`)
        next()
    })
    app.use(cors({origin: allowedOrigins, credentials:true}))

    // API Endpoints
    app.get('/', (req,res)=>{
        res.send("API Working")
    })
    app.use('/api/auth', authRouter)
    app.use('/api/user', userRouter)




    app.listen(port, ()=>{
        console.log(`Server running on PORT: ${port}`);
    })

