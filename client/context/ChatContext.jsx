import { createContext, useContext, useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
import { toast } from "react-hot-toast";
import axios from "axios"; // fallback in case AuthContext doesn't provide axios

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [unseenMessages, setUnseenMessages] = useState({});

  const { socket, axios: axiosInstance } = useContext(AuthContext);

  // ----------------- Get all users for sidebar -----------------
  const getUsers = async () => {
    try {
      const { data } = await axiosInstance.get("/api/message/users");
      if (data.success) {
        setUsers(data.users || []);
        setUnseenMessages(data.unseenMessages || {});
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // ----------------- Get messages for selected user -----------------
  const getMessages = async (userId) => {
  if (!userId) return;
  try {
    const { data } = await axiosInstance.get(`/api/message/${userId}`);
    // Now backend returns plain array, no "success"
    setMessages(data || []);
  } catch (error) {
    toast.error(error.message);
  }
};



  // ----------------- Send message -----------------
  const sendMessage = async (messageData) => {
    if (!selectedUser?._id) return;
    try {
      const { data } = await axiosInstance.post(
        `/api/message/send/${selectedUser._id}`,
        messageData
      );
      if (data.success) {
        setMessages((prev) => [...prev, data.newMessage]);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // ----------------- Subscribe to new messages -----------------
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMessage) => {
      // If current chat open with sender, append
      if (selectedUser && newMessage.senderId === selectedUser._id) {
        newMessage.seen = true;
        setMessages((prev) => [...prev, newMessage]);
        axiosInstance.put(`/api/message/mark/${newMessage._id}`);
      } else {
        // Update unseen message count
        setUnseenMessages((prev) => ({
          ...prev,
          [newMessage.senderId]: prev[newMessage.senderId]
            ? prev[newMessage.senderId] + 1
            : 1,
        }));
      }
    };

    socket.on("newMessage", handleNewMessage);

    return () => {
      socket.off("newMessage", handleNewMessage);
    };
  }, [socket, selectedUser]);

  // ----------------- Handle opening chat with a user -----------------
  useEffect(() => {
  if (selectedUser?._id) {
    getMessages(selectedUser._id);

    // Clear unseen count for this user
    if (unseenMessages[selectedUser._id]) {
      setUnseenMessages((prev) => {
        const copy = { ...prev };
        delete copy[selectedUser._id];
        return copy;
      });
    }
  }
}, [selectedUser]);



  const value = {
    messages,
    users,
    selectedUser,
    getUsers,
    getMessages,
    sendMessage,
    setSelectedUser,
    unseenMessages,
    setUnseenMessages,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
