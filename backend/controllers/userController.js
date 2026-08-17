const User = require("../models/User");

const createUser = async (req,res) => {
    try{
        const user = await User.create(req.body);
        res.status(201).json(user);
    } catch(error){
        res.status(500).json({ message:error.message });
    }
};

const getUsers = async (req, res) => {
    try{
        const users = await User.find();
        res.json(users);
    } catch(error){
        res.status(500).json({ message:error.message });
    }
};

const updateUser = async (req, res) => {
    try{
        const user = await User.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new:true }
        );

        res.json(user);
    } catch(error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteUser = async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: "User Deleted" });
    } catch(error) {
        res.status(500).json({ message:error.message });
    }
};

module.exports = {
    createUser,
    getUsers,
    updateUser,
    deleteUser
};