import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Send, ArrowLeft, Bot } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { askPanchayatAI } from '../backend/services/ai';
import { fetchChatbotContext } from '../backend/db/firestore';
import { useAuth } from '../frontend/context/AuthContext';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
}

const WELCOME = "Namaste! 🙏 I'm your Panchayat AI assistant.\n\nI know all the society guidelines, rules, upcoming events, and notices. Ask me anything!";

export default function AIAssistantScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const flatListRef = useRef<FlatList>(null);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: '0', text: WELCOME, sender: 'ai' },
  ]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (messages.length > 1) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');

    const userMsg: Message = { id: Date.now().toString(), text, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      // Fetch society-specific context based on user's societyId
      const context = await fetchChatbotContext(profile?.societyId || profile?.societyCode || '');
      const aiText = await askPanchayatAI(text, context);
      setMessages(prev => [...prev, { id: Date.now().toString() + '_ai', text: aiText, sender: 'ai' }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { id: Date.now().toString() + '_err', text: 'Sorry, I could not fetch a response. Please try again.', sender: 'ai' }]);
    }
    setLoading(false);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
        {!isUser && (
          <View style={styles.botAvatar}>
            <Bot color="#fff" size={16} />
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
          <Text style={isUser ? styles.userText : styles.aiText}>{item.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#0d9488', '#047857']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color="#fff" size={22} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Panchayat AI</Text>
          <Text style={styles.headerSub}>Society Assistant • Always Online</Text>
        </View>
        <View style={styles.onlineDot} />
      </LinearGradient>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.chatList}
        showsVerticalScrollIndicator={false}
      />

      {/* Typing indicator */}
      {loading && (
        <View style={styles.typingRow}>
          <View style={styles.botAvatar}><Bot color="#fff" size={14} /></View>
          <View style={styles.typingBubble}>
            <ActivityIndicator color="#0d9488" size="small" />
            <Text style={styles.typingText}> Thinking...</Text>
          </View>
        </View>
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Ask about rules, events, bills..."
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          multiline
          maxLength={500}
        />
        <TouchableOpacity style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]} onPress={handleSend} disabled={!input.trim() || loading}>
          <Send color="#fff" size={20} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 60, paddingBottom: 18 },
  backBtn: { padding: 8, marginRight: 8 },
  headerInfo: { flex: 1 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSub: { color: '#99f6e4', fontSize: 12, marginTop: 2 },
  onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4ade80', borderWidth: 2, borderColor: '#fff' },
  chatList: { padding: 16, paddingBottom: 8 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 14 },
  msgRowUser: { flexDirection: 'row-reverse' },
  botAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#0d9488', justifyContent: 'center', alignItems: 'center', marginRight: 8, marginBottom: 2 },
  bubble: { maxWidth: '78%', padding: 14, borderRadius: 20 },
  userBubble: { backgroundColor: '#0d9488', borderBottomRightRadius: 4 },
  aiBubble: { backgroundColor: '#fff', borderBottomLeftRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  userText: { color: '#fff', fontSize: 15, lineHeight: 22 },
  aiText: { color: '#1f2937', fontSize: 15, lineHeight: 22 },
  typingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
  typingBubble: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 16, marginLeft: 8 },
  typingText: { color: '#9ca3af', fontSize: 13, marginLeft: 4 },
  inputContainer: { flexDirection: 'row', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb', alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 22, paddingHorizontal: 18, paddingVertical: 12, fontSize: 15, marginRight: 10, maxHeight: 100 },
  sendBtn: { backgroundColor: '#0d9488', width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', shadowColor: '#0d9488', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  sendBtnDisabled: { backgroundColor: '#9ca3af', shadowOpacity: 0 },
});
