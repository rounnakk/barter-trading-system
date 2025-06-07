import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useChat } from '../../context/ChatContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { Navbar } from '../../Components/Navbar.tsx';
import { Button } from '../../Components/ui/button.tsx';
import { Input } from '../../Components/ui/input.tsx';
import { Separator } from '../../Components/ui/separator.tsx';
import { Toaster } from 'sonner';
import { format } from 'date-fns';
import { Send, User, ArrowLeft, Loader2, MessageSquare } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../../Components/ui/avatar.tsx';
import { cn } from '../../lib/utils.tsx';

const ChatPage = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { 
    chatRooms, 
    currentRoom, 
    setCurrentRoom, 
    messages,
    fetchChatRooms, 
    fetchMessages, 
    sendMessage, 
    loading, 
    loadingMessages 
  } = useChat();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Find and set current room when roomId changes
  useEffect(() => {
    if (!roomId) return;
    
    const findAndSetRoom = async () => {
      // If we already have chat rooms loaded
      const room = chatRooms.find(r => r.id === roomId);
      if (room) {
        setCurrentRoom(room);
        fetchMessages(roomId);
        return;
      }
      
      // Otherwise fetch all rooms first
      if (!loading) {
        await fetchChatRooms();
        const room = chatRooms.find(r => r.id === roomId);
        if (room) {
          setCurrentRoom(room);
          fetchMessages(roomId);
        } else {
          // Room not found or user doesn't have access
          navigate('/chats');
        }
      }
    };
    
    findAndSetRoom();
  }, [roomId, chatRooms, loading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !roomId || !currentRoom) return;
    
    setSending(true);
    const success = await sendMessage(roomId, newMessage);
    setSending(false);
    
    if (success) {
      setNewMessage('');
    }
  };

  // Get partner details (the other person in the chat)
  const getPartnerDetails = () => {
    if (!currentRoom || !user) return null;
    
    const isBuyer = currentRoom.buyer_id === user.id;
    const partner = isBuyer ? currentRoom.seller : currentRoom.buyer;
    
    return {
      id: partner?.id || '',
      name: partner?.name || 'User',
      avatar: partner?.avatar_url || '',
    };
  };

  const partner = getPartnerDetails();
  
  // Format timestamps to be more readable
  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return format(date, 'h:mm a'); // e.g. "3:45 PM"
    } else {
      return format(date, 'MMM d, h:mm a'); // e.g. "Jun 5, 3:45 PM"
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-blue-50">
        <Navbar />
        <div className="container flex justify-center items-center min-h-[calc(100vh-56px)]">
          <div className="flex flex-col items-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">Loading your conversations...</p>
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
        {/* Back button and page title */}
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            className="mr-2"
            onClick={() => navigate('/chats')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            All Chats
          </Button>
        </div>

        {/* Chat container */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden min-h-[calc(100vh-200px)] flex flex-col">
          {/* Chat header */}
          {currentRoom && partner && (
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center">
                <Avatar className="h-10 w-10 mr-3">
                  <AvatarImage src={partner.avatar} />
                  <AvatarFallback>
                    {partner.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">{partner.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {currentRoom.product?.name ? (
                      <>
                        About: <Link 
                          to={`/product/${currentRoom.product_id}`} 
                          className="text-primary hover:underline"
                        >
                          {currentRoom.product.name}
                        </Link>
                      </>
                    ) : 'Chatting about a product'}
                  </p>
                </div>
              </div>
              <div className="flex">
                {currentRoom.product?.id && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => navigate(`/product/${currentRoom.product_id}`)}
                  >
                    View Product
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Messages section */}
          <div className="flex-grow p-4 overflow-y-auto bg-slate-50">
            {loadingMessages ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-10">
                <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg">No messages yet</h3>
                <p className="text-muted-foreground max-w-sm">
                  Send a message to start the conversation!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => {
                  const isSender = msg.sender_id === user?.id;
                  
                  return (
                    <div 
                      key={msg.id}
                      className={cn(
                        "flex items-end space-x-2",
                        isSender ? "justify-end" : "justify-start"
                      )}
                    >
                      {!isSender && (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={partner?.avatar} />
                          <AvatarFallback>
                            {partner?.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className="max-w-md">
                        <div
                          className={cn(
                            "rounded-lg px-4 py-2 text-sm",
                            isSender 
                              ? "bg-primary text-primary-foreground" 
                              : "bg-muted"
                          )}
                        >
                          {msg.message}
                        </div>
                        <div 
                          className={cn(
                            "text-[10px] text-muted-foreground mt-1",
                            isSender ? "text-right" : "text-left"
                          )}
                        >
                          {formatMessageTime(msg.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Message input */}
          <div className="p-4 border-t">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-grow"
                disabled={sending || !currentRoom}
              />
              <Button 
                type="submit" 
                disabled={!newMessage.trim() || sending || !currentRoom}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span className="ml-2">Send</span>
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatPage;