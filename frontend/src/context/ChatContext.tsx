import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext.tsx';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

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
    avatar_url: string;
  };
  seller?: {
    id: string;
    name: string;
    avatar_url: string;
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

  // Fetch chat rooms when user changes
  useEffect(() => {
    if (user) {
      fetchChatRooms();
      setupChatRoomsSubscription();
    } else {
      setChatRooms([]);
      setCurrentRoom(null);
      setMessages([]);
      setUnreadCount(0);
    }
    
    return () => {
      supabase.removeAllChannels();
    };
  }, [user]);

  // Set up real-time subscription for chat rooms
  const setupChatRoomsSubscription = () => {
    const channel = supabase
      .channel('chat_rooms_channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_rooms',
        filter: `buyer_id=eq.${user?.id},seller_id=eq.${user?.id}`,
      }, (payload) => {
        // Handle room updates
        fetchChatRooms();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  };

  // Set up real-time subscription for messages when a room is selected
  useEffect(() => {
    if (!currentRoom) return;
    
    const channel = supabase
      .channel(`messages_${currentRoom.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_room_id=eq.${currentRoom.id}`,
      }, (payload) => {
        const newMessage = payload.new as Message;
        setMessages(prev => [...prev, newMessage]);
        
        // If the sender isn't the current user, mark as read
        if (newMessage.sender_id !== user?.id) {
          markAsRead(currentRoom.id);
        }
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentRoom, user]);

  // Request notification permission
    useEffect(() => {
    if (user && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
    }, [user]);

    // Set up notification listener for new messages
    useEffect(() => {
    if (!user) return;
    
    const channel = supabase
        .channel('global_message_notifications')
        .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `sender_id=neq.${user.id}`,
        }, async (payload) => {
        const newMessage = payload.new as Message;
        
        // Look up the chat room details
        const { data: roomData } = await supabase
            .from('chat_rooms')
            .select(`
            *,
            product:product_id (name),
            buyer:buyer_id (name),
            seller:seller_id (name)
            `)
            .eq('id', newMessage.chat_room_id)
            .single();
            
        if (roomData) {
            // Check if this room belongs to the current user
            const isUserRoom = roomData.buyer_id === user.id || roomData.seller_id === user.id;
            
            if (isUserRoom) {
            // Determine if the user is the buyer or seller
            const isBuyer = roomData.buyer_id === user.id;
            const partner = isBuyer ? roomData.seller : roomData.buyer;
            
            // Show browser notification
            if (Notification.permission === 'granted') {
                const notification = new Notification('New message from Barter Trade', {
                    body: `${partner.name}: ${newMessage.message}`,
                    icon: '/bt.png', // Your app logo
                });
                
                // Store the chat room ID in session storage when notification is clicked
                notification.onclick = () => {
                    window.focus();
                    // Instead of using navigate directly, store the room ID
                    sessionStorage.setItem('openChatRoomId', newMessage.chat_room_id);
                    // If the user is already on a chat page, we can try to redirect them
                    if (window.location.pathname.includes('/chats')) {
                        window.location.href = `/chats/${newMessage.chat_room_id}`;
                    }
                };
            }
            
            // Update unread count
            fetchChatRooms();
            }
        }
        })
        .subscribe();
        
    return () => {
        supabase.removeChannel(channel);
    };
    }, [user]);

  // Fetch all chat rooms for the user
  const fetchChatRooms = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: rooms, error } = await supabase
        .from('chat_rooms')
        .select(`
          *,
          product:product_id (*),
          buyer:buyer_id (*),
          seller:seller_id (*)
        `)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('updated_at', { ascending: false });
        
      if (error) throw error;
      
      setChatRooms(rooms || []);
      
      // Calculate unread messages
      const unread = rooms?.filter(room => {
        const isBuyer = room.buyer_id === user.id;
        const lastRead = isBuyer ? room.buyer_read_at : room.seller_read_at;
        return !lastRead || (room.last_message_at && new Date(room.last_message_at) > new Date(lastRead));
      }).length || 0;
      
      setUnreadCount(unread);
      
    } catch (error) {
      console.error("Error fetching chat rooms:", error);
      toast.error("Failed to load chat rooms");
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages for a specific chat room
  const fetchMessages = async (roomId: string) => {
    setLoadingMessages(true);
    try {
      const { data: roomMessages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_room_id', roomId)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      
      setMessages(roomMessages || []);
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
      const { error } = await supabase
        .from('messages')
        .insert({
          chat_room_id: roomId,
          sender_id: user.id,
          message: message.trim()
        });
        
      if (error) throw error;
      
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
      const { error } = await supabase
        .rpc('mark_messages_as_read', { 
          room_id: roomId, 
          user_id: user.id 
        });
        
      if (error) throw error;
      
      // Update local state
      fetchChatRooms();
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
      // Check if chat room already exists
      const { data: existingRooms, error: fetchError } = await supabase
        .from('chat_rooms')
        .select('id')
        .eq('product_id', productId)
        .eq('buyer_id', user.id)
        .eq('seller_id', sellerId)
        .limit(1);
        
      if (fetchError) throw fetchError;
      
      // Return existing room if found
      if (existingRooms && existingRooms.length > 0) {
        return existingRooms[0].id;
      }
      
      // Create new room
      const { data: newRoom, error: insertError } = await supabase
        .from('chat_rooms')
        .insert({
          product_id: productId,
          buyer_id: user.id,
          seller_id: sellerId
        })
        .select('id')
        .single();
        
      if (insertError) throw insertError;
      
      // Send initial message
      if (newRoom) {
        await sendMessage(
          newRoom.id,
          `Hi, I'm interested in your product "${productDetails.name}"`
        );
      }
      
      // Refresh chat rooms list
      fetchChatRooms();
      
      return newRoom?.id || null;
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