const http = require("http");
const express = require("express");

const app =express();
const server = http.createServer(app);

const {Server} =require('socket.io');
const io = new Server(server);

const path =require('path');
const dotenv = require('dotenv');
const cors = require('cors')
const connectDB = require('./db/db.js');


const  User = require('./models/user_model.js');
const Chat = require('./models/chat_model.js');
const Message = require('./models/message_model.js');
const mongoose = require("mongoose");

const Redis = require('ioredis')

dotenv.config({})

const pub = new Redis({
  port: process.env.REDIS_PORT, // Redis port
  host: process.env.REDIS_HOST, // Redis host
  username: process.env.REDIS_USERNAME, // needs Redis >= 6
  password: process.env.REDIS_PASSWORD,
})

const sub = new Redis({
  port: process.env.REDIS_PORT, // Redis port
  host: process.env.REDIS_HOST, // Redis host
  username: process.env.REDIS_USERNAME, // needs Redis >= 6
  password: process.env.REDIS_PASSWORD,
})

connectDB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const corsOptions = cors({
  origin: '*',
})
app.use(corsOptions); 

const chatCommonAggregation = () => {
  return [
    {
      // lookup for the participants present
      $lookup: {
        from: "users",
        foreignField: "_id",
        localField: "members",
        as: "members",
        // pipeline: [
        //   {
            // $ project: {
        //      uid:0
        //     },
        //   },
        // ],
      },
    },
    {
      // lookup for the group chats
      $lookup: {
        from: "messages",
        foreignField: "_id",
        localField: "lastMessage",
        as: "lastMessage",
        pipeline: [
          {
            // get details of the sender
            $lookup: {
              from: "users",
              foreignField: "_id",
              localField: "sender",
              as: "sender",
              // pipeline: [
              //   {
                  // $ project: {
              //       username: 1,
              //       profilePic: 1,
              //       phoneNumber: 1,
              //       uid:1
              //     },
              //   },
              // ],
            },
          },
          {
            $lookup: {
              from: "users",
              foreignField: "_id",
              localField: "readBy",
              as: "readBy",
            },
          },
          {
            $addFields: {
              sender: { $first: "$sender" },
              readBy: "$readBy",

            },
          },

        ],
      },
    },
    {
      $addFields: {
        lastMessage: { $first: "$lastMessage" },
      },
    },
  ];
};


const chatMessageCommonAggregation = () => {
  return [
    {
      $lookup: {
        from: "users",
        foreignField: "_id",
        localField: "sender",
        as: "sender",
        pipeline: [
          {
            $project: {
              username: 1,
              profilePic: 1,
              phoneNumber: 1,
              uid:1,
              isOnline:1,
              lastOfflineAt:1
            },
          },
        ],
      },
      //need to add another lookup for getting the users name,profile pic from readBy array to show who all read our post
    },
    {
      $addFields: {
        sender: { $first: "$sender" },
      },
    },

    {
      $lookup: {
        from: "users",
        foreignField: "_id",
        localField: "readBy",
        as: "readBy",
        pipeline: [
          {
            $project: {
              username: 1,
              profilePic: 1,
              // phoneNumber: 1,
              uid:1,
              // isOnline:1,
              // lastOfflineAt:1
            },
          },
        ],
      },
    }
    
  ];
};


const chatMessageReadAggregation=()=>{
  return[];
};

io.on('connection',async(socket)=>{

    console.log(`A user connected with socketId :${socket.id} `);

    const tokenId = socket.handshake.auth[ 'authorization' ] ;  
    console.log(`the tokenId is ${tokenId}`);
    if(!tokenId){
      console.log("socket disconnected");
     return socket.disconnect();
    }

    const user = await User.findOne({'uid':tokenId});
    // console.log(`The user in connection is ${user._id}`);
    socket.user = user;
    socket.join(socket.user._id.toString());

    //use kafka 
    await User.updateOne({_id:socket.user._id},{$set:{isOnline:true}});




    const allChatIds = await Chat.distinct('_id',{"members":socket.user._id});

    console.log(`All chatids are ${typeof allChatIds[0]}`);

    const stringAllChatIds = allChatIds.map(String);

    socket.join(stringAllChatIds);


const onlineStatusUpdation ={
  "isOnline":true,
  "userId":socket.user._id,
  "allChatIds":stringAllChatIds,
  "lastOfflineAt":new Date(),
  // //////////////////////////
  // "chatIds":stringAllChatIds
} 

//try to use redis pub sub here 



  await pub.publish("NEW-ONLINE-USER",JSON.stringify(onlineStatusUpdation))




    // io.to(stringAllChatIds).emit('new-online-user',JSON.stringify(onlineStatusUpdation));


  //   async() => {
  //     try {
  //       console.log(`Its Coming here in get-allchats`);
        
  //       const chats = await Chat.aggregate([
  //         {
  //           $match: {
  //             members: { $elemMatch: { $eq: socket.user._id} },
  //           },
  //         },
  //         {
  //           $sort: {
  //             updatedAt: -1,
  //           },
  //         },
  //         ...chatCommonAggregation(),
  //       ]);
  //       console.log(`the allchats are ${chats}`);
      
  //     //  return socket.to(socket.user._id.toString()).emit('all-chats',chats);
  //      const allchats= JSON.stringify(chats);
  //  return  socket.emit('all-chats',allChats);
  //     // return socket.emit('all-chats',chats);
    
  //     } catch (error) {
  //   return  socket.emit("error-occurred", error.toString());
  //       // return [];
  //     }
  //   }

  //  async function getallchats(){
  //   try {
  //   console.log(`Its Coming here in get-allchats`);
    
  //   const chats = await Chat.aggregate([
  //     {
  //       $match: {
  //         members: { $elemMatch: { $eq: socket.user._id} },
  //       },
  //     },
  //     {
  //       $sort: {
  //         updatedAt: -1,
  //       },
  //     },
  //     ...chatCommonAggregation(),
  //   ]);
  //   console.log(`the allchats are ${chats}`);
  
  // //  return socket.to(socket.user._id.toString()).emit('all-chats',chats);
  //  return JSON.stringify(chats);
  // // return socket.emit('all-chats',chats);

  // } catch (error) {
  //   socket.emit("error-occurred", error.toString());
  //   return [];
  // }
        
    
    // };

 getallchats = async()=>{
  try {
    console.log(`Its Coming here in get-allchats`);
    
    const chats = await Chat.aggregate([
      {
        $match: {
          members: { $elemMatch: { $eq: socket.user._id} },
        },
      },
      {
        $sort: {
          updatedAt: -1,
        },
      },
      ...chatCommonAggregation(),
    ]);
    console.log(`the allchats are ${chats}`);
  
   //  return socket.to(socket.user._id.toString()).emit('all-chats',chats);
   
    return chats;  
   // return socket.emit('all-chats',chats);

  } catch (error) {
   //  socket.emit("error-occurred", error.toString());
    return [];
  }
 
 }

 const allchats = await getallchats();


 //--------------------
 const data = {
  allchats,
  'socketID':socket.user._id.toString()
 }


 console.log(`the getallchats is ${JSON.stringify(data)}`);


  await pub.publish("ALL-CHATS",JSON.stringify(data));

  // -------------
  // io.to(socket.user._id.toString()).emit('all-chats',JSON.stringify(allchats));



    socket.on('search-user',async(phoneNumber)=>{
      
      const user= await User.findOne({"phoneNumber":phoneNumber});
      try {
        if(!user){
          console.log('user not present');
          throw new Error("The User doesn't use this app");
        }

        console.log(`The user Id is ${user._id}`);

        const chat = await Chat.findOne({members:{ $all: [socket.user._id, user._id], $size: 2 }});

        console.log(`the chat is ${chat}`);

        if(!chat){
          console.log(`Its inside chat is null`);

          const newchat = new Chat({
            "name":"One-One",
              "members":[socket.user._id,user._id],
              "admin":socket.user._id,  
          });
        await newchat.save();

          // const newchat =await Chat.create({
          //     "name":"One-One",
          //     "members":[socket.user._id,user._id],
          //     "admin":socket.user._id,  
          // },{new:true});

          console.log(`The new chat is ${newchat}`);
        
  
          const newMessage = await Message.create({
            chatId:newchat._id,
            sender:newchat.admin,
            content:"Chat Created",
            isCommonMessage:true
          });
          console.log(`The new lastMessage in search-user is ${newMessage._id}`);
        
          const updatedChat = await Chat.updateOne({_id:newchat._id},{$set:{lastMessage:newMessage._id}},{new:true});

          console.log(`newchat id is: ${newchat._id}`);

          console.log(`the updated chat is ${updatedChat}`);
  
  
          socket.join(newchat._id);   
          
        } else{
          socket.join(chat._id);
          
        }
        const aggregatedChat = await Chat.aggregate([
          {
            $match: {
              isGroupChat: false,
              $and: [
                {
                  members: { $elemMatch: { $eq: user._id } },
                },
                {
                  members: {
                    $elemMatch: { $eq: socket.user._id },
                  },
                },
              ],
            },
          },
          ...chatCommonAggregation(),
        ]);

        //aggregated
        // returns array of 
        console.log(`the user is ${socket.user._id} and searched for ${user._id}`);
        console.log(`the aggregated chat is ${aggregatedChat}`);

        const data = {
          aggregatedChat,
          'UserSocketID':user._id,
        }


        await pub.publish("PRIVATECHAT-INVITE",JSON.stringify(data));

        //---------- 
        // socket.to(user._id).emit('privateChat-invite',aggregatedChat);


        socket.to(socket.user._id.toString()).emit('search-result',aggregatedChat);

        
      //  socket.emit('search-result',aggregatedChat);


      } catch (error) {
        io.to(socket.user._id.toString()).emit("error-occurred",error.toString());
        
      }
     
    });

    socket.on('privateChat-invite-ack',(chatId)=>{
      console.log("privateChat ACK RECEIVED");
      socket.join(chatId.toString());
    });

    socket.on('create-group',async(name)=>{
      try {
        const user= await User.findById(socket.user._id);
        if(!user){
          throw new Error("The userId doesn't exist");
        }
       
  
        const newgroupchat = new Chat({
          "name":name,
          "isGroupChat":true,
          "members":[socket.user._id],
          "admin":socket.user._id,
        });

        await newgroupchat.save();

        console.log(`the new group chatid is ${newgroupchat._id}`);

        const newMessage = await Message({
          chatId:newgroupchat._id,
          sender:newgroupchat.admin,
          content:"Group Created",
          isCommonMessage:true
        });
        await newMessage.save();

        console.log(`The new lastMessage in create-group is ${newMessage._id}`);
      
        const updatedChat = await Chat.updateOne({_id:newgroupchat._id},{$set:{lastMessage:newMessage._id}},{new:true});


  
        socket.join(newgroupchat._id);
  
        //aggregate chat detail and all messages in the chat and return
  
        //aggregate
        //or try replace with a callback
        const chat = await Chat.aggregate([
          {
            $match: {
              _id: newgroupchat._id,
            },
          },
          ...chatCommonAggregation(),
        ]);

        const payload = chat[0];
        console.log(`the payload is ${payload}`);
        if (!payload) {
          throw new Error("Internal server error");
        }

        io.to(socket.user._id.toString()).emit('group-created',JSON.stringify(payload));
       
      } catch (error) {
        io.to(socket.user._id.toString()).emit("error-occurred", error.toString());
      }
    });


    
    socket.on('add-group-members',async(chatId,phoneNumber)=>{
      try {
        
        const user= await User.findOne({'phoneNumber':phoneNumber});
        if(!user){
          throw new Error("The User does not exist");
        }

        const chat = await Chat.findById(chatId);
        
        if(!chat){
          throw new Error("The Group does not exist");
        }
  
      const newchat=  await Chat.updateOne({_id:chat._id},{$push:{members:user._id}},{new: true });
      

      const newMessage = await Message({
        chatId:chat._id,
        sender:chat.admin,
        content:`Member ${phoneNumber} Added`,
        isCommonMessage:true
      });
      
      await newMessage.save();
      console.log(`the newMessage id in addNewMember is ${newMessage._id}`);
      const updatedChat = await Chat.updateOne({_id:chat._id},{$set:{lastMessage:newMessage._id}},{new:true});

      console.log(`THE newchatid in  NEW MEMBER ADDED IS ${chat._id} `);

      //aggregate payload
      const aggregatedChat = await Chat.aggregate([
        {
          $match: {
            _id: chat._id,
          },
        },
        ...chatCommonAggregation(),
      ]); 
      console.log(`The aggregated chat is ${aggregatedChat}`);
      const payload = aggregatedChat[0];

      if(!payload){
        throw Error('Internal Server Error');
      }

      console.log(`The payload is ${payload}`);

      io.to(chat._id.toString()).to(user._id.toString()).emit('member-added',JSON.stringify(payload));//on client side if user not in group then join to the chatid

      } catch (error) {
        io.to(socket.user._id.toString()).emit("error-occurred", error.toString());
      }

    });

    socket.on('member-added-ack',(chatId)=>{
      console.log("MEMEBER ACK RECEiVED");
      socket.join(chatId.toString());
    })

    socket.on('leave-group',async({chatId,userId})=>{
      try {
        const user= await  User.findById(userId);
        if(!user){
          throw new Error("The User does not exist");
        }
        
        const chat = await Chat.findOne({_id:new mongoose.Types.ObjectId(chatId),isGroupChat:true});
        
        if(!chat){
          throw new Error('The Group does not exist');
        }
      
        const newchat =await Chat.updateOne({_id:new mongoose.Types.ObjectId(chatId)},{$pull:{members:user._id}})
  
  
        /////////////////////////////////////
  
        //check this

        const aggregatedChat = await Chat.aggregate([
          {
            $match: {
              _id: newchat._id,
            },
          },
          ...chatCommonAggregation(),
        ]); 
  
        const payload = aggregatedChat[0];
        if(!payload){
          throw new Error('Internal Server Error');
        }

        socket.to(chatId).to(user._id).emit('member-left',payload);
  
  
      } catch (error) {
        io.to(socket.user._id).emit("error-occurred", error.toString());
        
      }
     
      

    });


    socket.on('remove-member',async({chatId,senderId,memberId})=>{

      try {
        const chat = await Chat.findOne({_id:new mongoose.Types.ObjectId(chatId),isGroupChat:true});
      
        if(!chat){
          throw new Error('The Group does not exist');
        }
  
        if(chat.admin.toString()!==senderId){
          throw new Error('You are not an admin');        
        }
  
        const existingMembers= chat.members;
        
        if(existingMembers.includes(memberId)){
          throw new Error('The Member does not exist in the Group');
        }
  
        const updatedChat = await Chat.findByIdAndUpdate(
          chatId,
          {
            $pull: {
              members: new mongoose.Types.ObjectId (memberId), // remove participant id
            },
          },
          { new: true }
        );
  
        const aggregatedChat  =await Chat.aggregate([
          {
            $match: {
              _id: updatedChat._id,
            },
          },
          ...chatCommonAggregation(),
        ]);


        const payload = aggregatedChat[0];
        if(!payload){
          throw new Error('Internal Server Error');
        }


        //aggregated chat
        console.log('///////////////////////');
  
        console.log(aggregatedChat);
  
        console.log('///////////////////////');
  
        //aggregate chat
        socket.to([chatId,memberId]).emit('member-removed',aggregatedChat,senderId) // on client side if the senderid==me leave from the room. Pass chatid or get it from aggregatechat
      } catch (error) {
        io.to(socket.user._id).emit("error-occurred", error.toString());
      }

     
    });


    socket.on('change-groupname',async({chatId,senderId,name})=>{

      try {
        
      const chat = await Chat.findOne({_id:new mongoose.Types.ObjectId(chatId),isGroupChat:true});

      if(!chat){
        throw new Error("The Group does not exist");
      }

      if(chat.admin.toString()!==senderId){
        throw new Error("You are not an admin")
      }

      const newchat = Chat.findByIdAndUpdate(
       chat._id,
      {
        $set:{
          name
        }
      },
      {new:true}
      );

      const aggregatedChat = await Chat.aggregate([
        {
          $match: {
            _id: updatedGroupChat._id,
          },
        },
        ...chatCommonAggregation(),
      ]);
    
      const payload = aggregatedChat[0];
    
      if (!payload) {
        throw new Error("Internal server error");
      }

    socket.to(chatId).emit('group-namechanged',payload)
      } catch (error) {
        io.to(socket.user._id).emit("error-occurred", error.toString());
        
      }


  });


  //gets single groupchat details
  //Don't apply as there is no use case for it or find one use case
socket.on('get-chatdetails',async({chatId,userId})=>{
  const chat = await Chat.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(chatId),
      },
    },
    ...chatCommonAggregation(),
  ]);

  //aggregate

  socket.to(userId).emit('chat-result',chat)

})

//gets all chats details
socket.on('get-allchats',async(nothing,cb)=>{

  try {
    console.log(`Its Coming here in get-allchats`);
    
    const chats = await Chat.aggregate([
      {
        $match: {
          members: { $elemMatch: { $eq: socket.user._id} },
        },
      },
      {
        $sort: {
          updatedAt: -1,
        },
      },
      ...chatCommonAggregation(),
    ]);
    console.log(`the allchats are ${chats}`);
  
  //  return socket.to(socket.user._id.toString()).emit('all-chats',chats);
   return cb(JSON.stringify(chats));
  // return socket.emit('all-chats',chats);

  } catch (error) {
    io.to(socket.user._id).emit("error-occurred", error.toString());

  }

});



socket.on('send-message',async(chatId,content,attachments)=>{
 try {
  console.log("its coming here in send-message");
   if (!content && attachments.length==0) {
 console.log("its here");
    throw new Error("Message content or attachment is required");
     
   }
   const selectedChat = await Chat.findById(chatId);
 
   if (!selectedChat) {
    throw new Error("Chat does not exist"); 
   }
 
 
   const newMessage = await Message.create({
     chatId:chatId,
     sender:socket.user._id,
     content:content,
     attachments:attachments
   });

   console.log(`the new message is ${newMessage._id} `);
 
  const updatedChat = await Chat.updateOne({_id:chatId},{$set:{lastMessage:newMessage._id},$inc:{unReadMessageCount:1}},{new:true});
 
 console.log(`updated chat in send-msg is ${JSON.stringify( updatedChat)}`);

 //aggregate
  const messages = await Message.aggregate([
   {
     $match:{
       _id:newMessage._id
     },
   },
   ...chatMessageCommonAggregation(),
  
  ])
 
 
 console.log(`the aggregated message is ${JSON.stringify(messages)}`);  
  const receivedMessage = messages[0];
 
  console.log(`The received msg is ${JSON.stringify( receivedMessage)}`);
 
   if (!receivedMessage) {
    throw new Error("Internal Server Error");
 
   }
 
 //check with broadcast instead of emit because we'll be updating in the sender side  ui
 
   //checked -- broadcast can only be done directly with the socket. if the event should be emitted in a room then to() is the good to go 
 
   // this below method will send to all except the sender
   //use io.to() if including the sender receives the message
 console.log(`The chatid in send-msg is ${chatId}`);
  //  return io.to(socket.user._id.toString()).emit('new-message',JSON.stringify(receivedMessage));
  

  const data = {
    receivedMessage,
    "chatId":chatId.toString()
  }

   await pub.publish("NEW-MESSAGE",JSON.stringify(data));
  //--------------
  // io.to(chatId.toString()).emit('new-message',JSON.stringify(receivedMessage));    
   
 } catch (error) {
  console.log(`The error in send-message is ${error}`);
  io.to(socket.user._id.toString()).emit("error-occurred",error.toString());
 }
});


//this is emitted by other users who is not the sender of this message
//it should emit when the user opens a message screen
//in client while showing the unreadMsgCount check if the last message senderid and user uid is same. if its same don't show count else show count 

//unreadMessageids can be get by aggregating all the messages that are created in the chat room after my last update//this need to be fetched 
//before changing the isOnline=true in on('conncection') 
socket.on('message-readby-ack',async(unreadMessageIds,chatId,senderIds)=>{

  try {
     //also put $where to exclude messageid which matches senderId ==socket.user_id 
    console.log(`The unreadMesageIds are ${unreadMessageIds.length}`);
    console.log(`The unreadSenderIds are ${senderIds}`);

  // if(!unreadMessageIds){
    console.log("unreadMessageIds is not null");
   const updatedDcoument= await Message.updateMany(
     {
      _id: { $in:unreadMessageIds},
      sender:{$nin:[socket.user._id]}
     },
     {
       $addToSet:{readBy:socket.user._id}
     },
     {new: true });


     console.log(`The updated documents are ${updatedDcoument}`);
  
  
      const chat= await Chat.updateOne({_id:chatId},{$set:{unReadMessageCount:0}},{new:true});
      console.log(`The updated chat is ${chat}`);
      
      const user = await User.findById(socket.user._id);
      console.log(`The user is ${user._id}`);
      if(!user){
        console.log(`Its inside the not user`);
        throw new Error("user doesn't exist ");
      }

      // const allsenderIds = senderIds.map(String);
      // console.log(`Thetype of allsenderIds are ${typeof allsenderIds}`);

      // console.log(`The all senderIds are ${allsenderIds}`);

      //need to make later --> notification below should be sent to every sender 

      const msgReadedPayload ={
        user,
        senderIds,
        chatId,
        unreadMessageIds
      }
      
      await pub.publish("MSG-READED",JSON.stringify(msgReadedPayload))
      // return io.to(senderIds.toString()).emit('msg-readed',JSON.stringify(user),JSON.stringify(chatId),JSON.stringify(unreadMessageIds));
   
  } catch (error) {
   return  io.to(socket.user._id.toString()).emit('error-occurred',error.toString());
  }

 

});


//gets messages in particular chat
//replace with callbacks . first check that the wheather the msgs recieves fastly . if not use another emit or else use callbacks 

socket.on('get-messages',async(chatId)=>{

  try {
    const chat = await Chat.findById(chatId);

    if(!chat){
      throw new Error("Chat does not exist")
    }
  
    if(!chat.members.includes(socket.user._id)){
      throw new Error('You are not a member in this group');
    }

    const messages =await  Message.aggregate([
    {
      $match:{
        chatId: new mongoose.Types.ObjectId(chatId)
      }
    },
   ...chatMessageCommonAggregation(),
   {
    $sort:{
      createdAt:1
    }
   }
  ])
// console.log(`All Messages in get-messages is ${messages}`);

      const user = await User.findById(socket.user._id);

      console.log(`the user lastofflineAt is ${user.lastOfflineAt}`);

      if(!user.lastOfflineAt){
      //send all messages and unread as empty
      console.log(`The lastofflineAt is Null`);

      console.log(`all messages in chat is ${messages} `);
      // let data={
      //   readMessages:messages,
      //   unreadMessages:[]
      // };
     return  io.to(socket.user._id.toString()).emit("all-messages",JSON.stringify(messages),JSON.stringify([]));

      }
      
      
      else{
      //send before and after the lastofflineAt mesgs (read and unread) 

          const result = await Message.aggregate([
            {
              $match: {
                chatId: new mongoose.Types.ObjectId(chatId),
                $or:[
                  {createdAt: { $lte:new Date(user.lastOfflineAt)}},

                   {createdAt: { $gt:new Date(user.lastOfflineAt)},$or:[ {sender:{$in:[socket.user._id]}}, {readBy:{$in:[socket.user._id]}}]}

                ]
                // $ and:[
                //   {
                //     createdAt: { $ gt:new Date(user.lastOfflineAt)},
                //   },
                //  { sender:{$ in:[socket.user._id]}}
                // ]
              },
            },
            // {
            //   $group: {
            //     _id: null,
            //     readMessages: { $push: "$$ROOT" },
            //   },
            // },
            ...chatMessageCommonAggregation(),
            {
              $sort:{
                createdAt:1
              }
             }

        ]);

        const readMessages = (result[0] && result[0].readMessages) || [];

        console.log(`The Read Messages are  is ${result} `);
        
        console.log(`The Read Message length is ${result.length} `);

        //filter by checking socket.user._id != sender and readby[] does not contain socket.user._id
        const unreadMessages = await Message.aggregate([
          {
            $match: {
              chatId: new mongoose.Types.ObjectId(chatId),
              createdAt: { $gt:new Date(user.lastOfflineAt) },
              readBy:{$nin:[socket.user._id]},
              sender:{$nin:[socket.user._id]}         
              
            },          
          },
          ...chatMessageCommonAggregation(),
          {
            $sort:{
              createdAt:1
            }
           }
        ]);


        console.log(`UnreadMessages are : ${unreadMessages.length}`);
        // let data={
        //   "readMessages":result,
        //   "unreadMessages":unreadMessages
        // };

     return io.to(socket.user._id.toString()).emit("all-messages",JSON.stringify(result),JSON.stringify(unreadMessages));

  }

  } catch (error) {
    io.to(socket.user._id.toString()).emit("error-occurred", error.toString());
    
  }
  
});


// socket.on('get-messages',async(chatId)=>{

//   try {
//     const chat = await Chat.findById(chatId);

//     if(!chat){
//       throw new Error("Chat does not exist")
//     }
  
//     if(!chat.members.includes(socket.user._id)){
//       throw new Error('You are not a member in this group');
//     }

//     const messages =await  Message.aggregate([
//     {
//       $match:{
//         chatId: new mongoose.Types.ObjectId(chatId)
//       }
//     },
//    ...chatMessageCommonAggregation(),
//    {
//     $sort:{
//       createdAt:1
//     }
//    }
//   ])
//   console.log(`all messages in chat is ${messages} `);
//   io.to(socket.user._id.toString()).emit("all-messages",JSON.stringify(messages));
  

//   } catch (error) {
//     io.to(socket.user._id.toString()).emit("error-occurred", error.toString());
    
//   }
  



// });


socket.on('change-online-status',async(status)=>{
  try {
    const user= await  User.findById(socket.user._id);
    if(!user){
      throw new Error("The User does not exist");
    }

    await User.updateOne({_id:socket.user._id},{$set:{isOnline:status}})
    
  } catch (error) {
    io.to(socket.user._id.toString()).emit("error-occurred", error.toString());
    
  }
})
socket.on('disconnect',async()=>{
  try {
    console.log("socket disconnected");
    socket.leave(socket.user._uid);
    socket.disconnect();
    socket.leave(allChatIds);
    await User.updateOne({_id:socket.user._id},{$set:{isOnline:false,lastOfflineAt:new Date()}})
    const onlineStatusUpdation ={
      "isOnline":false,
      "userId":socket.user._id,
      "allChatIds":stringAllChatIds,
      "lastOfflineAt":new Date()
    } 
    
    await pub.publish("NEW-ONLINE-USER",JSON.stringify(onlineStatusUpdation))

    // io.to(stringAllChatIds).emit('new-online-user',JSON.stringify(onlineStatusUpdation));

  } catch (error) {
    console.log('[error]','leave room :', error);

  }
})
})

sub.subscribe("NEW-ONLINE-USER");
sub.subscribe("ALL-CHATS");
sub.subscribe("PRIVATECHAT-INVITE");
sub.subscribe("NEW-MESSAGE");
sub.subscribe("MSG-READED");

sub.on("message",async(channel,message)=>{
  console.log('///////////////////////////////////////////////////');
  console.log('Its is coming in SUB');
  console.log('///////////////////////////////////////////////////');
  console.log(`The message is ${message}`);
  console.log(`The channel is ${channel}`);

  if(channel==="NEW-ONLINE-USER"){
    const {isOnline,allChatIds} = JSON.parse(message);
    
    console.log(`The message is ${isOnline}, ${allChatIds}`);
  io.to(allChatIds).emit('new-online-user',message);
  }

  if(channel=="ALL-CHATS"){
    const {allchats,socketID}=JSON.parse(message);
    io.to(socketID).emit('all-chats',JSON.stringify(allchats));  
  }


  if(channel=="PRIVATECHAT-INVITE"){
    const {aggregatedChat,UserSocketID} = JSON.parse(message);
    console.log('///////////////////////////////////////////////////');
  console.log(`It is in PRIVATECHAT-INVITE ${UserSocketID} `);
  console.log('///////////////////////////////////////////////////');

  io.to(UserSocketID).emit('privateChat-invite',aggregatedChat);
  }

  if (channel=="NEW-MESSAGE"){
    const {receivedMessage,chatId}= JSON.parse(message);
    console.log('///////////////////////////////////////////////////');
    console.log(`It is in NEW-MESSAGE ${chatId} `);
    console.log('///////////////////////////////////////////////////');
  
    io.to(chatId).emit('new-message',JSON.stringify(receivedMessage)); 

  }
  if (channel=="MSG-READED"){
    const {user,senderIds,chatId,unreadMessageIds}= JSON.parse(message);
    console.log('///////////////////////////////////////////////////');
    console.log(`It is in NEW-MESSAGE ${unreadMessageIds} `);
    console.log('///////////////////////////////////////////////////');
    io.to(senderIds.toString()).emit('msg-readed',JSON.stringify(user),JSON.stringify(chatId),JSON.stringify(unreadMessageIds));


  }

})

app.use(express.static(path.resolve("./public")));


app.get('/',(req,res)=>{
    return res.sendFile('/public/index.html')
})


app.post('/api/create-user',async(req,res)=>{
  const {username,phoneNumber,uid,profilePic} = req.body.user;
 try {
  console.log(`The USER DETAILS are ${username},${phoneNumber}, ${uid}, ${profilePic}`);
  const user= await User.findOne({'phoneNumber':phoneNumber});
  if(!user){
    const newUser = User({
      username,
      uid,
      phoneNumber,
      "isOnline":true,
      "profilePic":profilePic
    });

    await newUser.save();

  console.log(`The user is ${newUser}`);
    return res.status(200).json({"msg":"User Signedup Successfully","user":newUser});
  }else{
    return res.status(200).json({"msg":"User Loggedin Sucessfully","user":user});
  }

 
 } catch (error) {
  res.status(500).json({"error":error});
 }
});



app.post('/api/update-profilePic',async(req,res)=>{
  const {url,uid}= req.body.user;
  try {
    console.log(`The url and uid is ${url} and ${uid}`);

    const user =  await User.findOne({'uid':uid});

    const updatedUser = await User.updateOne({_id:user._id},{$set:{'profilePic.url': url}},{new:true});

    console.log(`the url received is ${url}`);
    console.log(`The updatedUser is ${updatedUser}`);

    return res.status(200).json({"updated":true,"user":updatedUser});


    
  } catch (error) {
  res.status(500).json({"error":error});
    
  }
})

app.post('/api/get-user',async(req,res)=>{
  const {phoneNumber} = req.body.user;
 try {
  console.log(`The USER DETAILS are ${phoneNumber}`);
  const user= await User.findOne({'phoneNumber':phoneNumber});
  console.log(`The User is ${user}`);
  if(!user){
    console.log("it is inside");
    return res.status(201).json({"msg":"User doesn't exist,Please SignUp","isUserExist":false});
  }else{
    return res.status(200).json({"msg":"User Loggedin Sucessfully","isUserExist":true,"user":user});
  }

 
 } catch (error) {
  res.status(500).json({"error":error,"isUserExist":false});
 }
});

app.get('/api/updatereadby/:id',async(req,res)=>{
try {
  const chatId = req.params.id;
 const allmsg= await Message.updateMany(
    { chatId:chatId }, //new mongoose.Types.ObjectId(chatId) 
    { $set: { readBy: [] } }
    );

    // const allmsgs = await Message.find({ "chatId":{$eq:new mongoose.Types.ObjectId(chatId)} } );
    // const allmsgs = await Message.find({"chatId":chatId} );

    

    console.log(`All msg is ${JSON.stringify(allmsg)}`);

    return res.status(200).json({'Sucess':true,"allmsg":allmsg});
} catch (error) {
  return res.status(400).json({"Failed due to":error.toString()});
}
});

app.get('/api/unreadMessages/:chatId/:userId/:lastoffline',async(req,res)=>{
  try {
    const chatId = req.params.chatId;
    const userId = req.params.userId;
    const lastOfflineAt = req.params.lastoffline;

    const result = await Message.aggregate([
      {
        $match: {
          chatId: new mongoose.Types.ObjectId(chatId),

          $or:[
            {createdAt: { $lte:new Date(lastOfflineAt)}},

            {createdAt: { $gt:new Date(lastOfflineAt)},$or:[ {sender:{$in:[userId]}}, {readBy:{$in:[userId]}}]}

          ]
        },
      },
      // {
      //   $group: {
      //     _id: null,
      //     readMessages: { $push: "$$ROOT" },
      //   },
      // },
      ...chatMessageCommonAggregation(),
      {
        $sort:{
          createdAt:1
        }
       }]);

    const unreadMessages = await Message.aggregate([
      {
        $match: {
          chatId: new mongoose.Types.ObjectId(chatId),
          createdAt: { $gt: new Date(lastOfflineAt) },
          readBy:{$nin:[userId]},
          sender:{$nin:[userId]}          
        },          
      },
      ...chatMessageCommonAggregation(),
      {
        $sort:{
          createdAt:1
        }
       }
    ]);

    console.log(`The ReadMessages are ${unreadMessages}`);;

    return res.status(200).json({'Sucess':true,"ReadMessages":result,"AllUnreadMessages":unreadMessages});

  } catch (error) {
  return res.status(400).json({"Failed due to":error.toString()});
    
  }
});


app.post('api/readack',async(req,res)=>{
  try {
    const {unreadMessageIds,userId}= req.body.user;

    console.log("unreadMessageIds is not null");
   const updatedMessages =  await Message.updateMany(
     {
      _id: { $in:[unreadMessageIds] },
      sender:{$nin:[userId]}
     },
     {
       $push:{readBy:userId}
     },
     {new: true });
  // }
  
   await Chat.updateOne({_id:chatId},{$set:{unReadMessageCount:0}},{new:true});
   return res.status(200).json({'Sucess':true,"updatedMessages":updatedMessages});


  } catch (error) {
  return res.status(400).json({"Failed due to":error.toString()});
    
  }
})

server.listen(process.env.PORT,()=>{
    console.log(`Server listening at port 8080`);
})