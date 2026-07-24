import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Circle, Paperclip, FileText, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { useMessaging } from '../hooks/useMessaging';
import { Employee } from '../types';
import { supabase } from '../lib/supabase-client';

interface MessagingModuleProps {
  currentUser: Employee;
  employees: Employee[];
}

export function MessagingModule({ currentUser, employees }: MessagingModuleProps) {
  const [selectedUser, setSelectedUser] = useState<Employee | null>(null);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, isConnected } = useMessaging(channelId, currentUser.id);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle selecting a user to chat with
  useEffect(() => {
    async function setupChannel() {
      if (!selectedUser) return;
      
      // We need a deterministic channel name for 1-on-1 chats based on the two user IDs
      const participants = [currentUser.id, selectedUser.id].sort();
      const channelName = `direct_${participants[0]}_${participants[1]}`;

      // Find or create channel
      const { data: existingChannels, error } = await supabase
        .from('HRMS_chat_channels')
        .select('*')
        .eq('name', channelName);

      if (existingChannels && existingChannels.length > 0) {
        setChannelId(existingChannels[0].id);
      } else {
        // Create new channel
        const { data: newChannel } = await supabase
          .from('HRMS_chat_channels')
          .insert([{ name: channelName, type: 'direct' }])
          .select()
          .single();
          
        if (newChannel) {
          setChannelId(newChannel.id);
        }
      }
    }
    
    setupChannel();
  }, [selectedUser, currentUser.id]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !selectedFile) || isUploading) return;

    let attachmentUrl = undefined;
    let attachmentType = undefined;
    let attachmentName = undefined;

    if (selectedFile) {
      setIsUploading(true);
      try {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        
        const { error } = await supabase.storage
          .from('chat-attachments')
          .upload(fileName, selectedFile);
          
        if (error) throw error;
        
        const { data: publicUrlData } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(fileName);
          
        attachmentUrl = publicUrlData.publicUrl;
        attachmentType = selectedFile.type.startsWith('image/') ? 'image' : 'document';
        attachmentName = selectedFile.name;
      } catch (err: any) {
        console.error("Error uploading file:", err);
        alert(`Failed to upload attachment: ${err.message}`);
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    sendMessage(inputText.trim() || null, attachmentUrl, attachmentType, attachmentName);
    setInputText('');
    setSelectedFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Filter out the current user from the contact list
  const contacts = employees.filter(emp => emp.id !== currentUser.id);

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-xl overflow-hidden mt-6">
      
      {/* Left Sidebar - Contact List */}
      <div className="w-1/3 border-r border-slate-200/60 bg-slate-50/50 flex flex-col">
        <div className="p-4 border-b border-slate-200/60 flex items-center justify-between bg-white/50 backdrop-blur-md">
          <h2 className="text-lg font-semibold text-slate-800">Messages</h2>
          <div className="flex items-center space-x-2">
             <Circle className={`w-3 h-3 ${isConnected ? 'text-green-500 fill-green-500' : 'text-red-500 fill-red-500'}`} />
             <span className="text-xs font-medium text-slate-500">{isConnected ? 'Online' : 'Offline'}</span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {contacts.map((contact) => (
            <button
              key={contact.id}
              onClick={() => setSelectedUser(contact)}
              className={`w-full flex items-center space-x-4 p-3 rounded-xl transition-all duration-200 ${
                selectedUser?.id === contact.id 
                  ? 'bg-blue-50 border border-blue-200/60 shadow-sm' 
                  : 'hover:bg-slate-100 border border-transparent'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-100 to-blue-50 border border-blue-200 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-sm font-semibold text-slate-800">{contact.name}</h3>
                <p className="text-xs text-slate-500 capitalize">{contact.designation}</p>
              </div>
            </button>
          ))}
          {contacts.length === 0 && (
            <div className="text-center p-4 text-slate-500 text-sm">No contacts available.</div>
          )}
        </div>
      </div>

      {/* Right Content - Chat Area */}
      <div className="flex-1 flex flex-col bg-white/40">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-200/60 bg-white/60 backdrop-blur-md flex items-center space-x-4">
               <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-100 to-blue-50 border border-blue-200 flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-800">{selectedUser.name}</h2>
                <p className="text-xs text-slate-500 capitalize">{selectedUser.designation}</p>
              </div>
            </div>

            {/* Messages Stream */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-slate-400 text-sm">
                  Say hi to start the conversation!
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isMe = msg.sender_id === currentUser.id;
                  return (
                    <div 
                      key={msg.id || index} 
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[70%] rounded-2xl px-5 py-3 shadow-sm ${
                          isMe 
                            ? 'bg-blue-600 text-white rounded-br-none' 
                            : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                        }`}
                      >
                        {msg.attachment_url && msg.attachment_type === 'image' && (
                          <a href={msg.attachment_url} target="_blank" rel="noreferrer" className="block mb-2">
                            <img src={msg.attachment_url} alt={msg.attachment_name || 'attachment'} className="max-w-full rounded-lg object-contain max-h-64" />
                          </a>
                        )}
                        {msg.attachment_url && msg.attachment_type === 'document' && (
                          <a href={msg.attachment_url} target="_blank" rel="noreferrer" className={`flex items-center gap-2 p-3 rounded-lg mb-2 transition-colors ${isMe ? 'bg-blue-700/50 hover:bg-blue-700/70' : 'bg-slate-100 hover:bg-slate-200'}`}>
                            <FileText className="w-6 h-6 shrink-0" />
                            <span className="text-sm truncate font-medium underline">{msg.attachment_name || 'Document'}</span>
                          </a>
                        )}
                        {msg.text && <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>}
                        <span className={`text-[10px] mt-1 block ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-white/60 backdrop-blur-md border-t border-slate-200/60 flex flex-col">
              
              {/* Attachment Preview */}
              {selectedFile && (
                <div className="p-3 bg-slate-50 border-b border-slate-200/60 flex items-center justify-between">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded bg-white flex items-center justify-center border border-slate-200 shrink-0">
                      {selectedFile.type.startsWith('image/') ? (
                        <img src={URL.createObjectURL(selectedFile)} alt="preview" className="w-full h-full object-cover rounded" />
                      ) : (
                        <FileText className="w-5 h-5 text-slate-500" />
                      )}
                    </div>
                    <div className="truncate text-sm font-medium text-slate-700">
                      {selectedFile.name}
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedFile(null)}
                    className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}

              <div className="p-4">
                <form onSubmit={handleSend} className="flex items-center space-x-3">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileChange}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="hidden p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all shrink-0"
                    title="Attach file"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                  />
                  
                  <button
                    type="submit"
                    disabled={(!inputText.trim() && !selectedFile) || isUploading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white p-3 rounded-xl shadow-md transition-all duration-200 active:scale-95 flex items-center justify-center shrink-0 w-11 h-11"
                  >
                    {isUploading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </form>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center flex-col space-y-4 text-slate-400">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center">
              <User className="w-10 h-10 text-slate-300" />
            </div>
            <p className="text-sm font-medium">Select a contact to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}
