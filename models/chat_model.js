const {mongoose, Schema }  = require('mongoose');


const chatSchema = new Schema({
    name:{
        type:String,
        required:true
    },
    members:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"User"
        }
    ],

    isGroupChat:{
        type:Boolean,
        default:false
    },

    lastMessage:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Message"
    },

    admin:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    },

    unReadMessageCount:{
        type:Number,
        default:0
    }
},{timestamps: true});


 const Chat = mongoose.model("Chat", chatSchema);
 module.exports= Chat;
