import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext.tsx';
import { toast } from 'sonner';

// API URL - ensure this matches your backend URL
const API_URL = "https://bartrade.koyeb.app";

interface ChatRoom {
  id: string;
  created_at: string;
  updated_at: string;
  product_id: string;
  buyer_id: string;
  seller_id: string;
  last_message: string | null;
  last_message_at: string | null;
  buyer_read_at: string | null;
  seller_read_at: string | null;
  product?: {
    id: string;
    name: string;
    images: string[];
  };
  buyer?: {
    id: string;
    name: string;
    avatar: string;
  };
  seller?: {
    id: string;
    name: string;
    avatar: string;
  };
}

interface Message {
  id: string;
  created_at: string;
  chat_room_id: string;
  sender_id: string;
  message: string;
  is_read: boolean;
}

interface ChatContextType {
  chatRooms: ChatRoom[];
  currentRoom: ChatRoom | null;
  messages: Message[];
  loading: boolean;
  unreadCount: number;
  loadingMessages: boolean;
  initiateChatWithSeller: (productId: string, sellerId: string, productDetails: any) => Promise<string | null>;
  fetchChatRooms: () => Promise<void>;
  setCurrentRoom: (room: ChatRoom | null) => void;
  fetchMessages: (roomId: string) => Promise<void>;
  sendMessage: (roomId: string, message: string) => Promise<boolean>;
  markAsRead: (roomId: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  // Fetch unread count when user changes
  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      // Set up polling for unread messages (every 30 seconds)
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    } else {
      setUnreadCount(0);
    }
  }, [user]);

  // Fetch chat rooms when user changes
  useEffect(() => {
    if (user) {
      fetchChatRooms();
      // Poll for updates every minute
      const interval = setInterval(fetchChatRooms, 60000);
      return () => clearInterval(interval);
    } else {
      setChatRooms([]);
      setCurrentRoom(null);
      setMessages([]);
    }
  }, [user]);

  // Fetch messages when current room changes
  useEffect(() => {
    if (currentRoom) {
      fetchMessages(currentRoom.id);
      // Poll for new messages every 5 seconds when in a room
      const interval = setInterval(() => fetchMessages(currentRoom.id), 5000);
      return () => clearInterval(interval);
    }
  }, [currentRoom]);

  // Fetch all chat rooms for the user
  const fetchChatRooms = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/chat/rooms?user_id=${user.id}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch chat rooms: ${response.status}`);
      }
      
      const rooms = await response.json();
      setChatRooms(rooms || []);
      
    } catch (error) {
      console.error("Error fetching chat rooms:", error);
      toast.error("Failed to load chat rooms");
    } finally {
      setLoading(false);
    }
  };

  // Fetch unread message count
  const fetchUnreadCount = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`${API_URL}/chat/unread?user_id=${user.id}`);
      
      if (!response.ok) {
        return;
      }
      
      const data = await response.json();
      setUnreadCount(data.unread_count || 0);
      
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  // Fetch messages for a specific chat room
  const fetchMessages = async (roomId: string) => {
    setLoadingMessages(true);
    try {
      const response = await fetch(`${API_URL}/chat/messages/${roomId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.status}`);
      }
      
      const messageData = await response.json();
      setMessages(messageData || []);
      
      // Mark messages as read when fetched
      await markAsRead(roomId);
      
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load messages");
    } finally {
      setLoadingMessages(false);
    }
  };

  // Send a new message
  const sendMessage = async (roomId: string, message: string): Promise<boolean> => {
    if (!user || !message.trim()) return false;
    
    try {
      const response = await fetch(`${API_URL}/chat/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chat_room_id: roomId,
          sender_id: user.id,
          message: message.trim()
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.status}`);
      }
      
      const newMessage = await response.json();
      
      // Add the new message to the local state
      setMessages(prev => [...prev, newMessage]);
      
      // Update room list to reflect latest message
      fetchChatRooms();
      
      return true;
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
      return false;
    }
  };

  // Mark messages as read
  const markAsRead = async (roomId: string) => {
    if (!user) return;
    
    try {
      await fetch(`${API_URL}/chat/read/${roomId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: user.id
        })
      });
      
      // Update unread count after marking messages as read
      fetchUnreadCount();
      
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  // Initiate a new chat with a seller
  const initiateChatWithSeller = async (
    productId: string, 
    sellerId: string, 
    productDetails: any
  ): Promise<string | null> => {
    if (!user) {
      toast.error("Please log in to chat with the seller");
      return null;
    }
    
    if (user.id === sellerId) {
      toast.error("You can't chat with yourself");
      return null;
    }
    
    try {
      const response = await fetch(`${API_URL}/chat/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          product_id: productId,
          buyer_id: user.id,
          seller_id: sellerId
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create chat room: ${response.status}`);
      }
      
      const room = await response.json();
      
      // Send initial message if this is a new conversation
      if (!room.last_message) {
        await sendMessage(
          room.id,
          `Hi, I'm interested in your product "${productDetails.name}"`
        );
      }
      
      // Refresh chat rooms list
      fetchChatRooms();
      
      return room.id;
    } catch (error) {
      console.error("Error initiating chat:", error);
      toast.error("Failed to start a chat with the seller");
      return null;
    }
  };

  return (
    <ChatContext.Provider value={{
      chatRooms,
      currentRoom,
      messages,
      loading,
      unreadCount,
      loadingMessages,
      initiateChatWithSeller,
      fetchChatRooms,
      setCurrentRoom,
      fetchMessages,
      sendMessage,
      markAsRead
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}