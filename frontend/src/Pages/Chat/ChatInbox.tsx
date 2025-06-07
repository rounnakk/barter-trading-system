import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../../context/ChatContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { Navbar } from '../../Components/Navbar.tsx';
import { Toaster } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { MessageSquare, User, Loader2, Search } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../../Components/ui/avatar.tsx';
import { Input } from '../../Components/ui/input.tsx';
import { Badge } from '../../Components/ui/badge.tsx';

const ChatInbox = () => {
  const { chatRooms, fetchChatRooms, loading } = useChat();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchChatRooms();
    }
  }, [user]);

  // Format the last message time
  const formatLastMessageTime = (dateString: string | null) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return format(date, 'h:mm a'); // e.g. "3:45 PM"
    } else {
      // If it's within 7 days, show relative time, otherwise show date
      const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff < 7) {
        return formatDistanceToNow(date, { addSuffix: true });
      } else {
        return format(date, 'MMM d');
      }
    }
  };

  // Check if a room has unread messages for the current user
  const hasUnreadMessages = (room: any) => {
    if (!user) return false;
    
    const isBuyer = room.buyer_id === user.id;
    const lastRead = isBuyer ? room.buyer_read_at : room.seller_read_at;
    
    if (!lastRead || !room.last_message_at) return false;
    
    return new Date(room.last_message_at) > new Date(lastRead);
  };

  // Get chat partner (not the current user)
  const getPartner = (room: any) => {
    if (!user) return { name: "User", avatar: "" };
    
    const isBuyer = room.buyer_id === user.id;
    const partner = isBuyer ? room.seller : room.buyer;
    
    return {
      name: partner?.name || "User",
      avatar: partner?.avatar_url || ""
    };
  };

  // Navigate to chat room
  const openChatRoom = (roomId: string) => {
    navigate(`/chats/${roomId}`);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-blue-50">
        <Navbar />
        <div className="container flex justify-center items-center min-h-[calc(100vh-56px)]">
          <div className="flex flex-col items-center text-center">
            <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
            <h1 className="text-2xl font-bold mb-2">Sign in to view your messages</h1>
            <p className="text-muted-foreground max-w-md mb-6">
              You need to be logged in to access your chat conversations
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <Toaster richColors position="top-right" />
      <Navbar />

      <div className="container py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Messages</h1>
        </div>

        {/* Search input for filtering messages */}
        <div className="mb-6 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search conversations..." 
              className="pl-9"
            />
          </div>
        </div>

        {/* Chat list */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="flex flex-col items-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <p className="text-lg font-medium">Loading your conversations...</p>
              </div>
            </div>
          ) : chatRooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="font-medium text-xl mb-2">No conversations yet</h3>
              <p className="text-muted-foreground max-w-md">
                When you contact a seller or someone messages you, you'll see your conversations here.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {chatRooms.map((room) => {
                const partner = getPartner(room);
                const isUnread = hasUnreadMessages(room);
                
                return (
                  <div 
                    key={room.id} 
                    className="p-4 hover:bg-slate-50 cursor-pointer transition-colors flex items-center"
                    onClick={() => openChatRoom(room.id)}
                  >
                    <Avatar className="h-12 w-12 mr-4">
                      <AvatarImage src={partner.avatar} />
                      <AvatarFallback>
                        {partner.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-grow min-w-0">
                      <div className="flex justify-between items-baseline">
                        <h3 className={`font-medium truncate ${isUnread ? 'font-semibold' : ''}`}>
                          {partner.name}
                        </h3>
                        <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                          {formatLastMessageTime(room.last_message_at)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <p className={`text-sm truncate ${isUnread ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                          {room.last_message || "No messages yet"}
                        </p>
                        {isUnread && (
                          <Badge variant="default" className="ml-2 h-5 w-5 flex-shrink-0 rounded-full p-0 flex items-center justify-center">
                            <span className="sr-only">New messages</span>
                          </Badge>
                        )}
                      </div>
                      
                      {room.product && (
                        <div className="flex items-center mt-1">
                          <div className="w-5 h-5 rounded overflow-hidden bg-muted mr-1.5 flex-shrink-0">
                            {room.product.images && room.product.images[0] ? (
                              <img 
                                src={room.product.images[0]} 
                                alt={room.product.name} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-3 h-3 m-1 text-muted-foreground" />
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground truncate">
                            {room.product.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatInbox;