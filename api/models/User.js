const crypto = require('crypto');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
    username: {
        type : String,
        required : [true, "Please provide a username"]
    },
    email: {
        type : String,
        required : [true, "Please provide a valid email"]   ,
        unique: true
    },
    password:{
        type : String,
        required : [true, "Please provide a password"],
        minlength : 6,
        select: false
    },
    token :{
        type : String,
        required : [true, "Please provide a valid Access Token"],
        select: false
    },
    resetPasswordToken : String,
    resetPasswordExpire: Date

});

UserSchema.pre("save", async function(next) {
    if(!this.isModified("password")){
        next();
    }
    if(!this.isModified("token")){
        next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password,salt);
    this.token = await bcrypt.hash(this.token,salt);
    next();
})


UserSchema.methods.matchPassword = async function(password){
    return await bcrypt.compare(password, this.password);
}

UserSchema.methods.getSignedToken = function(){
    return jwt.sign({id : this.token}, process.env.JWT_SECRET, {})
}

UserSchema.methods.getResetPasswordToken =  function(){
    const resetToken = crypto.randomBytes(20).toString("hex");
    this.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    this.resetPasswordExpire = Date.now() + 10 * (60 *1000);

    return resetToken ;
}

const User = mongoose.model("User", UserSchema);

module.exports = User;