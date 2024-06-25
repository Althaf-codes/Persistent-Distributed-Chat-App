# Persistent Distributed Chat App Server

## Description
The server-side component of a persistent distributed chat application, built with Node.js, Express.js, Socket.io, MongoDB, and Redis Pub/Sub. This backend facilitates distributed chat system with real-time communication, private messaging, group chats, and maintains persistent chat history.

## Features
- **Real-time Communication**: Implemented using Socket.io for instant messaging.
- **Private Messaging and Group Chat**: Support for both individual and group conversations.
- **Persistent Chat History**: Ensured chat history remains accessible across sessions.
- **Redis Pub/Sub**: Utilized for efficient message broadcasting.
- **Advanced Messaging Features**: Includes message sent/read receipts, online/last seen status, and unread message counts.
- **Scalability**: Proactively planned for future integration with Kafka for efficient database writes.

## Technologies Used
- Node.js
- Express.js
- Socket.io
- MongoDB
- Redis Pub/Sub

## Installation Instructions

1. **Clone the repository**:
   ```sh
   git clone https://github.com/Althaf-codes/Persistent-Distributed-Chat-App.git
   cd Persistent-Distributed-Chat-App

2. Install dependencies:
   ```sh
   npm install

3. Configure environment variables:
   Create a .env file in the root directory with the following content:
   ```sh
   MONGODB_URI = your_mongo_uri
   REDIS_PORT = your_redis_port
   REDIS_HOST = your_redis_host
   REDIS_USERNAME = your_redis_username
   REDIS_PASSWORD = your_redis_password
   PORT = 8080

4. Run the server:
   ```sh
   npm start

## Created Date
This project was created on January 6, 2024.

