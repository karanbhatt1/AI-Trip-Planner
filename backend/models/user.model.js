import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    firebaseUid: {
        type: String,
        unique: true,
        sparse: true,
        index: true
    },
    username:{
        type:String,   
        required: true,
        trim: true
    },
    phone:{ 
        type: String,
        trim: true
    },
    email:{
        type: String,
        lowercase: true,
        trim: true
    },
    profilePicture: {
        type: String,
        default: null,
        trim: true
    },
    lastLoginAt: {
        type: Date,
        default: Date.now
    },
    createdAt:{
        type: Date,
        default: Date.now
    }
})

// Unique only when a non-empty string is present.
userSchema.index(
    { phone: 1 },
    {
        unique: true,
        partialFilterExpression: {
            phone: { $type: "string", $gt: "" }
        }
    }
)

// Unique only when a non-empty string is present.
userSchema.index(
    { email: 1 },
    {
        unique: true,
        partialFilterExpression: {
            email: { $type: "string", $gt: "" }
        }
    }
)

const User = mongoose.model("User",userSchema)
export default User;      