// This File is to register, login and logout people.
// The file contains only controller function
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import userModel from "../models/user-model.js"
import transporter from "../config/nodemailer.js"
import { EMAIL_VERIFY_TEMPLATE,PASSWORD_RESET_TEMPLATE } from "../config/EmailTemplate.js"

// Function to register poeple
export const register = async(req, res)=>{
    console.log('test');
    
    const {name, email, password} = req.body

    // it will check if the name, email or password is available and after this try will be executed.
    if(!name || !email || !password){
        return res.json({success:false, message: 'Missing Details'})
    }

    // try will create the user who registers himself
    try{
        const existingUser = await userModel.findOne({email})

        if(existingUser){
            return res.json({success: false, message: "User already exist"})
        }

        const hashPassword = await bcrypt.hash(password, 10)
        // To create user and save it
        const user = new userModel({name, email, password: hashPassword})
        await user.save()
        // Generated 1 token for id using jwt and 1 token for expiry using userModel
        const token = jwt.sign({id: user._id}, process.env.JWT_SECRET, {expiresIn: '7d'})
        
        // cookies must be sent on cross‑site requests; browsers reject SameSite=None unless secure is true
        // for local development we will run the React dev server with a proxy so the API is same‑origin
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            // Chrome requires `secure:true` when `sameSite:'none'`.  During local HTTP
            // development we switch to 'lax' so the browser will accept the cookie.
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // Expiry time for cookie
        })
        console.log('🔐 AuthController - token cookie set (register) - sameSite',
                    process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                    'secure', process.env.NODE_ENV === 'production');
        // Sending Welcome Email
        // mailOptions -- this will create an email
        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: email,
            subject: 'Welcome to ZARB',
            text: `Welcome to ZARB, your account has been created with ${email}`
        }
        // Respond immediately — the account is already created above.
        // The welcome email is best‑effort and must NOT block or fail signup.
        res.json({success:true})

        // Fire‑and‑forget: send the welcome email in the background so a slow or
        // misconfigured SMTP server can never hang the registration request.
        transporter.sendMail(mailOptions)
            .catch(err => console.error('Welcome email failed:', err.message))
        return
    }
    catch(error){
        res.json({success:false, message: error.message})
    }
}

// Function to login people
export const login = async(req,res)=>{
    const {email, password} = req.body

    if(!email || !password){
        return res.json({success: false, message: 'Email and password are required'})
    }

    try {
        // Finding user
        const user = await userModel.findOne({email})
        //  If user is not present
        if(!user){
            return res.json({success:false, message: 'Invalid email'})
        }
        // Getting password and comparing it from that stored in database
        const isMatch = await bcrypt.compare(password, user.password) 
        if(!isMatch){
            return res.json({success: false, message: 'Invalid Password'})
        }
        // Generating token if both email and password are correct
        const token = jwt.sign({id: user._id}, process.env.JWT_SECRET, {expiresIn: '7d'})
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // Expiry time for cookie
        })
        console.log('🔐 AuthController - token cookie set (login) - sameSite',
                    process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                    'secure', process.env.NODE_ENV === 'production');
        return res.json({success:true})

    } catch (error) {
        return res.json({success:false, message: error.message})
    }
}

// Function for logout
export const logout = async (req,res)=>{
    try {
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        })
        console.log('🔐 AuthController - token cookie cleared (logout) - sameSite:', process.env.NODE_ENV === 'production' ? 'none' : 'lax');
        return res.json({success: true, message: 'User Logout'})
    } catch (error) {
        return res.json({success: false, message: error.message})
    }
}

// Function so that user can verify their account by sending verification OTP
export const sendVerifyOtp = async (req,res)=>{
    try {
        const {userId} = req.body
        const user = await userModel.findById(userId)
        // Checking if account is verified
        if(user.isAccountVerified){
            return res.json({success: 'false', message: 'Account Already Verified'})
        }
        // Generating the OTP
        const OTP = String(Math.floor(100000 + Math.random() * 900000))

        // Saving the OTP in databse
        user.verifyOtp = OTP
        user.verifyOtpExpireAt = Date.now() + 24 * 60 * 60 *1000
        await user.save()

        // Sending OTP to user through email
        const mailOption = {
            from: process.env.SENDER_EMAIL,
            to: user.email,
            subject: 'Account Verification OTP',
            // text: `Your OTP is ${OTP}. Verify your account using this OTP.`,
            html: EMAIL_VERIFY_TEMPLATE.replace("{{otp}}", OTP).replace("{{email}}",user.email)
        }
        await transporter.sendMail(mailOption)

        return res.json({success: true, message: "Verification OTP sent on email"})

    } catch (error) {
        return res.json({success: false, message:error.message})
    }
}

// Function to verify email on adding OTP
export const verifyEmail = async (req,res)=>{
    const {userId, otp} = req.body
    if(!userId || !otp){
        return res.json({success:false, message: "missing details"})
    }
    try {
        const user = await userModel.findById(userId)
        if(!user){
            return res.json({success:false, message: 'User not found'})
        }
        if(user.verifyOtp === '' || user.verifyOtp !== otp){
            return res.json({success:false, message: 'Invalid OTP'})
        }
        if(user.verifyOtpExpireAt < Date.now()){
            return res.json({success:false, message: 'OTP Expired'})
        }
        user.isAccountVerified = true;
        user.verifyOtp = ''
        user.verifyOtpExpireAt = 0
        
        await user.save()
        return res.json({success:true, message:'Email Verified Successfully'})

    } catch (error) {
        return res.json({success:false, message: error.message})
    }
}

// Function to check if user is Authenticated
export const isAuthenticated = async (req,res)=>{
    // Before this controller function, a middleware will be executed 
    // and which will check if it is authenticated ot not
    try {
        return res.json({success:true})
    } catch (error) {
        return res.json({success:false, message: 'User Not Authenticated'})
    }
}

// Function to send password reset OTP
export const sendResetOtp = async (req,res)=>{
    const {email} = req.body
    if(!email){
        return res.json({success:false, message: 'Email is required'})
    }
    try {
        const user = await userModel.findOne({email})
        if(!user){
            return res.json({success:false, message: 'User Not Found'})
        }

        // Generating the OTP
        const OTP = String(Math.floor(100000 + Math.random() * 900000))

        // Saving the OTP in databse
        user.resetOtp = OTP
        user.resetOtpExpireAt = Date.now() + 15 * 60 *1000
        await user.save()

        // Sending OTP to user through email
        const mailOption = {
            from: process.env.SENDER_EMAIL,
            to: user.email,
            subject: 'Password Reset OTP',
            // text: `Your OTP is ${OTP}. Reset your password using this OTP.`
            html:PASSWORD_RESET_TEMPLATE.replace("{{otp}}", OTP).replace("{{email}}",user.email)
        }
        await transporter.sendMail(mailOption)
 
        return res.json({success:true, message: "OTP sent to your email"})
 
    } catch (error) {
        return res.json({success:false, message: error.message})
    }
}

// Function to reset Password
export const resetPassword = async (req,res)=>{
    const {email,otp,newPassword} = req.body
    if(!email || !otp || !newPassword){
        return res.json({success:false, message: 'Email, OTP and new Passwords are required'})
    }
    try {
        const user = await userModel.findOne({email})
        if(!user){
        return res.json({success:false, message: 'User Not Found'})
        }
        // IF user didn't enterotp orif user enter wrong otp
        if(user.resetOtp === '' || user.resetOtp !== otp){
            return res.json({success:false, message: 'Invalid OTP'})
        }
        // Checking for expiry
        if(user.resetOtpExpireAt < Date.now()){
        return res.json({success:false, message: 'OTP expired'})
        }
        // Hashing the new password
        const hashPassword = await bcrypt.hash(newPassword, 10)
        user.password = hashPassword
        user.resetOtp = ''
        user.resetOtpExpireAt = 0

        await user.save()
        return res.json({success:true, message: 'Password has been reset successfully'})


    } catch (error) {
        return res.json({success:false, message: error.message})
        
    }
}