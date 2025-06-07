import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button.tsx';
import { MessageSquare } from 'lucide-react';
import { useChat } from '../context/ChatContext.tsx';
import { Badge } from './ui/badge.tsx';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext.tsx';

const API_URL = "https://bartrade.koyeb.app"; 

export function ChatNotification() {
  const { unreadCount, fetchChatRooms, fetchMessages, currentRoom } = useChat();
  const navigate = useNavigate();
  const { user } = useAuth();
  // Create a ref to track if the component is still mounted
  const isMounted = useRef(true);

  // Connect to SSE for real-time updates
  useEffect(() => {
    if (!user) return;

    let eventSource: EventSource | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    
    // Function to setup the event source and its listeners
    const setupEventSource = () => {
      if (!isMounted.current || !user) return null;
      
      try {
        // Close previous connection if exists
        if (eventSource) {
          eventSource.close();
        }
        
        // Connect to the SSE endpoint
        const newEventSource = new EventSource(`${API_URL}/chat/events?user_id=${user.id}`);
        
        // Handle new message events
        newEventSource.addEventListener('message', (event) => {
          if (!isMounted.current) return;
          
          try {
            const data = JSON.parse(event.data);
            
            // Reset reconnect attempts on successful message
            reconnectAttempts = 0;
            
            // Handle different event types
            if (data.type === 'new_message') {
              // Show notification for new messages
              const message = data.message;
              
              // If we're in the same room, update messages
              if (currentRoom && currentRoom.id === data.room_id) {
                fetchMessages(currentRoom.id);
              } else {
                // Otherwise show a notification
                toast.custom((t) => (
                  <div 
                    className="bg-primary text-primary-foreground p-4 rounded-lg shadow-lg cursor-pointer"
                    onClick={() => {
                      navigate(`/chats/${data.room_id}`);
                      toast.dismiss(t);
                    }}
                  >
                    <h4 className="font-semibold mb-1">New Message</h4>
                    <p className="text-sm">{message.message}</p>
                  </div>
                ), {
                  duration: 5000,
                  position: 'top-right'
                });
                
                // Update chat rooms list to reflect new message
                fetchChatRooms();
              }
            } else if (data.type === 'connected') {
              console.log("SSE connection established");
            } else if (data.type === 'heartbeat') {
              // Ignore heartbeat events
              console.log("Heartbeat received");
            }
          } catch (e) {
            console.error("Error parsing SSE message:", e);
          }
        });
        
        // Handle connection error with exponential backoff
        newEventSource.onerror = (error) => {
          console.error("SSE connection error:", error);
          
          // Close the errored connection
          newEventSource.close();
          
          // Only attempt reconnect if component is still mounted
          if (isMounted.current && reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            
            // Exponential backoff for reconnection attempts
            const delay = Math.min(1000 * (2 ** reconnectAttempts), 30000);
            
            console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
            
            setTimeout(() => {
              if (isMounted.current) {
                eventSource = setupEventSource();
              }
            }, delay);
          }
        };
        
        return newEventSource;
      } catch (error) {
        console.error("Failed to connect to event stream:", error);
        return null;
      }
    };
    
    // Initial setup
    eventSource = setupEventSource();
    
    // Clean up on unmount
    return () => {
      isMounted.current = false;
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [user, currentRoom, fetchMessages, fetchChatRooms, navigate]);

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      className="relative"
      onClick={() => navigate('/chats')}
    >
      <MessageSquare className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-1 -right-1 h-5 min-w-[20px] p-0 flex items-center justify-center"
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </Badge>
      )}
    </Button>
  );
}