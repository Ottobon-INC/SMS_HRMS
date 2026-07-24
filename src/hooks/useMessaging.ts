import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { supabase } from '../lib/supabase-client';

export interface ChatMessage {
  id: string;
  channel_id: string;
  sender_id: string;
  text: string | null;
  attachment_url?: string | null;
  attachment_type?: string | null;
  attachment_name?: string | null;
  created_at: string;
}

export function useMessaging(channelId: string | null, userId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Fetch initial messages when channel changes
  useEffect(() => {
    async function fetchMessages() {
      if (!channelId) return;
      const { data, error } = await supabase
        .from('HRMS_chat_messages')
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true });
        
      if (!error && data) {
        setMessages(data);
      }
    }
    fetchMessages();
  }, [channelId]);

  // Setup Socket.IO connection
  useEffect(() => {
    // Note: In production, this should point to your deployed backend URL.
    // When using Docker compose with Nginx, it might be the same origin.
    // For local dev, Vite runs on 9620, Backend on 9640.
    const backendUrl = (import.meta as any).env.VITE_BACKEND_URL || 'http://localhost:9640';
    
    const newSocket = io(backendUrl, {
      transports: ['websocket', 'polling']
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      if (channelId) {
        newSocket.emit('join_channel', channelId);
      }
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  // Listen for new messages
  useEffect(() => {
    if (!socket || !channelId) return;

    // Join channel when channel changes
    socket.emit('join_channel', channelId);

    const handleReceiveMessage = (message: ChatMessage) => {
      console.log('socket receive_message event fired:', message);
      console.log('Current channelId:', channelId);
      // Check if it belongs to current channel
      if (message.channel_id === channelId) {
        setMessages((prev) => {
          console.log('Previous messages length:', prev.length);
          // Prevent duplicates (ensure we only match IDs if they actually exist)
          const isDuplicate = prev.find((m) => (m.id && message.id && m.id === message.id) || (m.created_at === message.created_at && m.text === message.text));
          if (isDuplicate) {
            console.log('Message is duplicate, skipping');
            return prev;
          }
          console.log('Adding message to state');
          return [...prev, message];
        });
      } else {
        console.log('Message channel_id does not match current channelId');
      }
    };

    socket.on('receive_message', handleReceiveMessage);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
    };
  }, [socket, channelId]);

  const sendMessage = useCallback((text: string | null, attachment_url?: string, attachment_type?: string, attachment_name?: string) => {
    if (!socket || !channelId || !userId) return;

    socket.emit('send_message', {
      channel_id: channelId,
      sender_id: userId,
      text,
      attachment_url,
      attachment_type,
      attachment_name
    });
  }, [socket, channelId, userId]);

  return { messages, sendMessage, isConnected };
}
