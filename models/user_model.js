const {mongoose, Schema }  = require('mongoose');



const userSchema =new Schema({

    username:{
        type:String,
        required:true,
    },
    phoneNumber:{
        type:String,
        required:true,
    },
    uid:{
        type:String,
        required:true,
    },
    profilePic:{
        type:{
            url:String,
            localPath:String
        }
    },
    isOnline:{
        type:Boolean,
        required:true,
        default:false
    },
    lastOfflineAt:{
        type:Date,
        default:null
    }

},{ timestamps: true });

const User = mongoose.model("User",userSchema);
module.exports= User;

