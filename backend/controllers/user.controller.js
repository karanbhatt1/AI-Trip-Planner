import User from "../models/user.model.js";

export const registerUser = async (req, res) => {
    try {
        const { username, phone, email } = req.body;

        if (!username || !phone || !email) {
            return res.status(400).json({ error: "All fields are required" });
        }

        if (typeof username !== "string" || username.trim().length < 2) {
            return res.status(400).json({ error: "username must be at least 2 characters" });
        }

        if (!/^\S+@\S+\.\S+$/.test(String(email))) {
            return res.status(400).json({ error: "Invalid email format" });
        }

        if (!/^\d{10,15}$/.test(String(phone))) {
            return res.status(400).json({ error: "Invalid phone format" });
        }

        const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
        if (existingUser) {
            return res.status(400).json({ error: "User already exists" });
        }

        const user = await User.create({ username, phone, email });
        res.status(201).json({ message: "User registered successfully", user });
    } catch (error) {
        console.log("Error in registerUser:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const getUserProfile = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.status(200).json(user);
    } catch (error) {
        console.log("Error in getUserProfile:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
