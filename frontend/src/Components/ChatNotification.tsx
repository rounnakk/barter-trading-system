import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button.tsx';
import { MessageSquare } from 'lucide-react';
import { useChat } from '../context/ChatContext.tsx';
import { Badge } from './ui/badge.tsx';

export function ChatNotification() {
  const { unreadCount } = useChat();
  const navigate = useNavigate();

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