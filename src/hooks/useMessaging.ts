import { useState, useEffect, useCallback } from 'react';
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
  deleted_for_sender?: boolean;
  deleted_for_everyone?: boolean;
}

export function useMessaging(channelId: string | null, userId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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

  // Listen for new/updated messages via Supabase Realtime (Postgres Changes)
  useEffect(() => {
    if (!channelId) return;

    const channel = supabase.channel(`chat_${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for INSERT and UPDATE
          schema: 'public',
          table: 'HRMS_chat_messages',
          filter: `channel_id=eq.${channelId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMessage = payload.new as ChatMessage;
            setMessages((prev) => {
              const isDuplicate = prev.some((m) => m.id === newMessage.id);
              if (isDuplicate) return prev;
              return [...prev, newMessage];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedMessage = payload.new as ChatMessage;
            setMessages((prev) => prev.map((m) => m.id === updatedMessage.id ? updatedMessage : m));
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId]);

  const sendMessage = useCallback(async (text: string | null, attachment_url?: string, attachment_type?: string, attachment_name?: string) => {
    if (!channelId || !userId) return;

    // Optimistic UI Update
    const optimisticId = `temp_${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: optimisticId,
      channel_id: channelId,
      sender_id: userId,
      text,
      attachment_url,
      attachment_type,
      attachment_name,
      created_at: new Date().toISOString(),
      deleted_for_sender: false,
      deleted_for_everyone: false
    };
    
    setMessages((prev) => [...prev, optimisticMsg]);

    const payload: any = {
      channel_id: channelId,
      sender_id: userId,
      text
    };
    if (attachment_url) payload.attachment_url = attachment_url;
    if (attachment_type) payload.attachment_type = attachment_type;
    if (attachment_name) payload.attachment_name = attachment_name;

    const { data, error } = await supabase
      .from('HRMS_chat_messages')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('Failed to send message:', error);
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
    } else if (data) {
      // Replace optimistic message with real database row
      setMessages((prev) => prev.map((m) => m.id === optimisticId ? data : m));
      
      // Also broadcast via realtime as fallback if postgres_changes is disabled on the table
      supabase.channel(`chat_${channelId}`).send({
        type: 'broadcast',
        event: 'new_message',
        payload: data
      });
    }
  }, [channelId, userId]);

  const deleteMessageForMe = useCallback(async (messageId: string) => {
    // Optimistic update
    setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, deleted_for_sender: true } : m));
    
    const { error } = await supabase
      .from('HRMS_chat_messages')
      .update({ deleted_for_sender: true })
      .eq('id', messageId);
      
    if (error) {
      console.error('Failed to delete message for me:', error);
      // Revert optimistic update
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, deleted_for_sender: false } : m));
    }
  }, []);

  const deleteMessageForEveryone = useCallback(async (messageId: string) => {
    // Optimistic update
    setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, deleted_for_everyone: true } : m));
    
    const { error, data } = await supabase
      .from('HRMS_chat_messages')
      .update({ deleted_for_everyone: true })
      .eq('id', messageId)
      .select()
      .single();
      
    if (error) {
      console.error('Failed to delete message for everyone:', error);
      // Revert optimistic update
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, deleted_for_everyone: false } : m));
    } else if (data) {
      // Broadcast update via realtime as fallback
      supabase.channel(`chat_${channelId}`).send({
        type: 'broadcast',
        event: 'update_message',
        payload: data
      });
    }
  }, [channelId]);

  // Fallback broadcast listener in case postgres_changes is disabled
  useEffect(() => {
    if (!channelId) return;
    
    const channel = supabase.channel(`chat_${channelId}`);
    channel.on('broadcast', { event: 'new_message' }, ({ payload }) => {
      setMessages((prev) => {
        const isDuplicate = prev.some((m) => m.id === payload.id);
        if (isDuplicate) return prev;
        return [...prev, payload];
      });
    });
    channel.on('broadcast', { event: 'update_message' }, ({ payload }) => {
      setMessages((prev) => prev.map((m) => m.id === payload.id ? payload : m));
    });
  }, [channelId]);

  return { messages, sendMessage, deleteMessageForMe, deleteMessageForEveryone, isConnected };
}

