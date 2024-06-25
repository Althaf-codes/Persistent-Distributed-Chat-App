const {mongoose, Schema }  = require('mongoose');




const attachmentSchema = new Schema({
    url:{
        type:String,    
    },
    localPath:{
        type:String
    },
    mimeType:{
        type:String,
        enum:{
            values:['AUDIO', 'VIDEO', 'IMAGE', 'GIF','TEXT','OTHER_FILES'],//'PDF','DOC','DOCX','CSV','.EXE'
            message:'Only these are allowed :audio,video,image,gif and text'
        },
        default:'TEXT'
    }
})

const messageSchema = new Schema({
    chatId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Chat'
    },
    content:{
        type:String,
    },
    attachments:{
        type:[attachmentSchema],
        default:[]
    },

    sender:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    },
    isCommonMessage:{
        type:Boolean,
        default:false
    },
    readBy:{
        type:[mongoose.Schema.Types.ObjectId],
        default:[],
        ref:'User'
    }


},{timestamps:true});


 const Message = mongoose.model("Message",messageSchema);
 module.exports= Message;