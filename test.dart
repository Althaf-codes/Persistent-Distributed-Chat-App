// // main.dart

// import 'package:flutter/material.dart';
// import 'package:socket_io_client/socket_io_client.dart' as io;

// void main() {
//   runApp(MyApp());
// }

// class MyApp extends StatelessWidget {
//   @override
//   Widget build(BuildContext context) {
//     return MaterialApp(
//       title: 'Private Chat App',
//       home: ChatScreen(),
//     );
//   }
// }

// class ChatScreen extends StatefulWidget {
//   @override
//   _ChatScreenState createState() => _ChatScreenState();
// }

// class _ChatScreenState extends State<ChatScreen> {
//   final TextEditingController _phoneNumberController = TextEditingController();
//   final TextEditingController _messageController = TextEditingController();
//   io.Socket socket;
//   String chatId;
//   List<Map<String, dynamic>> messages = [];

//   @override
//   void initState() {
//     super.initState();

//     // Connect to the Socket.IO server
//     socket = io.io('http://your-server-url', <String, dynamic>{
//       'transports': ['websocket'],
//     });

//     // Handle events
//     socket.on('connect', (_) {
//       print('Connected: ${socket.id}');
//     });

//     socket.on('privateChatStarted', (data) {
//       setState(() {
//         chatId = data['chatId'];
//         // Initialize with existing messages, if any
//         // data['messages'] can be added to pass existing messages from the server
//         messages = [];
//       });
//     });

//     socket.on('oneOnOneMessage', (data) {
//       setState(() {
//         messages.add(data);
//       });
//     });

//     socket.on('userNotFound', (data) {
//       print('User not found with phone number: ${data['phoneNumber']}');
//       // Handle user not found case
//     });
//   }

//   @override
//   Widget build(BuildContext context) {
//     return Scaffold(
//       appBar: AppBar(
//         title: Text('Private Chat'),
//       ),
//       body: Column(
//         children: [
//           // UI for searching for another user
//           Padding(
//             padding: const EdgeInsets.all(8.0),
//             child: Row(
//               children: [
//                 Expanded(
//                   child: TextField(
//                     controller: _phoneNumberController,
//                     decoration: InputDecoration(
//                       hintText: 'Enter phone number...',
//                     ),
//                   ),
//                 ),
//                 IconButton(
//                   icon: Icon(Icons.search),
//                   onPressed: () {
//                     // Send a search request to the server
//                     socket.emit('searchUserByPhoneNumber', {
//                       'phoneNumber': _phoneNumberController.text,
//                       'senderUserId': socket.id,
//                     });
//                   },
//                 ),
//               ],
//             ),
//           ),
//           // UI for displaying messages
//           Expanded(
//             child: ListView.builder(
//               itemCount: messages.length,
//               itemBuilder: (context, index) {
//                 final message = messages[index];
//                 return ListTile(
//                   title: Text('${message['senderId']}: ${message['content']}'),
//                 );
//               },
//             ),
//           ),
//           // UI for sending messages
//           Padding(
//             padding: const EdgeInsets.all(8.0),
//             child: Row(
//               children: [
//                 Expanded(
//                   child: TextField(
//                     controller: _messageController,
//                     decoration: InputDecoration(
//                       hintText: 'Type a message...',
//                     ),
//                   ),
//                 ),
//                 IconButton(
//                   icon: Icon(Icons.send),
//                   onPressed: () {
//                     if (chatId != null && _messageController.text.isNotEmpty) {
//                       // Send the message to the server
//                       socket.emit('sendOneOnOneMessage', {
//                         'chatId': chatId,
//                         'content': _messageController.text,
//                         'attachment': '', // Add attachment handling if needed
//                         'senderId': socket.id,
//                       });

//                       // Clear the input field
//                       _messageController.clear();
//                     }
//                   },
//                 ),
//               ],
//             ),
//           ),
//         ],
//       ),
//     );
//   }

//   @override
//   void dispose() {
//     socket.disconnect();
//     super.dispose();
//   }
// }
