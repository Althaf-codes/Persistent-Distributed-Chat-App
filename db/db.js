const mongoose = require('mongoose');


const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}}`,{
       
             writeConcern: { w: 'majority' },
      }
    );
    console.log(`MongoDB Connected! Db host: ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.log("MongoDB connection error: ", error);
    process.exit(1);
  }
};

module.exports= connectDB;