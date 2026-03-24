import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Modal,
  ScrollView,
  Keyboard,
  Image,
  NativeModules,
  PermissionsAndroid,
} from 'react-native';
import {
  Send,
  Mic,
  StopCircle,
  Settings,
  Menu,
  PlusCircle,
  MessageSquare,
  Trash2,
  LogOut,
  User,
  Volume2,
  Edit2,
  MessageCircle,
  Info,
} from 'lucide-react-native';
// import Icon from 'react-native-vector-icons/Ionicons'; // Switched to Lucide
import AsyncStorage from '@react-native-async-storage/async-storage';
import Voice from '@react-native-voice/voice';
import Tts from 'react-native-tts';
import { conversationAPI, authAPI, STORAGE_KEYS } from '../services/api';
import { useTheme } from '../context/ThemeContext';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface Conversation {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  messages: Message[];
}

export default function ChatScreen({ navigation }: any) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const { isDark } = useTheme();
  const flatListRef = useRef<FlatList>(null);

  const [isListening, setIsListening] = useState(false);
  const [speechResult, setSpeechResult] = useState('');
  const [isSpeaking, setIsSpeaking] = useState<number | null>(null);

  // Hands-free Mode State
  const [isHandsFree, setIsHandsFree] = useState(false);
  const isHandsFreeRef = useRef(false);

  useEffect(() => {
    isHandsFreeRef.current = isHandsFree;
  }, [isHandsFree]);

  useEffect(() => {
    loadUser();
    loadConversations();

    // Setup Voice listeners
    if (Voice) {
      Voice.onSpeechStart = onSpeechStart;
      Voice.onSpeechEnd = onSpeechEnd;
      Voice.onSpeechResults = onSpeechResults;
      Voice.onSpeechPartialResults = onSpeechResults; // Real-time feedback
      Voice.onSpeechError = onSpeechError;
    }

    // Setup TTS
    if (Tts) {
      try {
        Tts.setDefaultLanguage('ne-NP');
        Tts.setDefaultRate(0.5);

        Tts.addEventListener('tts-start', (event: any) =>
          setIsSpeaking(Number(event.requestId)),
        );
        Tts.addEventListener('tts-finish', () => {
          setIsSpeaking(null);
          // If in hands-free mode, start listening again after bot stops speaking
          if (isHandsFreeRef.current) {
            setTimeout(() => {
              startListening();
            }, 500);
          }
        });
        Tts.addEventListener('tts-cancel', () => setIsSpeaking(null));
        Tts.addEventListener('tts-error', () => {
          setIsSpeaking(null);
        });
      } catch (e) {
        console.warn('TTS initialization failed:', e);
      }
    }

    return () => {
      Voice?.destroy?.()?.then?.(() => Voice?.removeAllListeners?.());
      Tts?.stop?.();
    };
  }, []);

  const onSpeechStart = () => setIsListening(true);
  const onSpeechEnd = () => setIsListening(false);
  const onSpeechResults = (e: any) => {
    if (e.value && e.value[0]) {
      setInputValue(e.value[0]);
    }
  };

  const onSpeechError = (e: any) => {
    console.log('Voice Error:', e);
    // Common error codes:
    // 7: No match (didn't hear anything)
    // 5: Client error (often permissions or google app issues)
    // 2: Network error
    if (e.error?.code !== '7') {
      Alert.alert(
        'भ्वाइस एरर',
        `स्वर चिन्न सकेन (Error: ${e.error?.code || 'unknown'})`,
      );
    }
    setIsListening(false);
  };
  const requestMicPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'माइक्रोफोन अनुमति',
            message:
              'SevaBot लाई तपाईंको स्वर बुझ्न माइक्रोफोन अनुमति आवश्यक छ।',
            buttonNeutral: 'पछि सोध्नुहोस्',
            buttonNegative: 'रद्द',
            buttonPositive: 'ठिक छ',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Permission error:', err);
        return false;
      }
    }
    return true;
  };

  const startListening = async () => {
    if (!Voice) return;

    // Check availability
    try {
      const available = await Voice.isAvailable();
      if (!available) {
        Alert.alert(
          'हुनेछैन',
          'तपाईंको उपकरणमा स्वर चिन्न सक्ने सुविधा उपलब्ध छैन।',
        );
        return;
      }
    } catch (e) {
      console.log('Voice.isAvailable error:', e);
    }

    // Check permission first
    const hasPermission = await requestMicPermission();
    if (!hasPermission) {
      Alert.alert(
        'अनुमति आवश्यक',
        'भ्वाइस फिचर प्रयोग गर्न माइक्रोफोन अनुमति आवश्यक छ।',
      );
      return;
    }

    try {
      // Stop TTS if speaking
      if (isSpeaking) {
        Tts?.stop?.();
      }

      setInputValue('');
      console.log('Starting Voice recognition for ne-NP');
      await Voice.start('ne-NP');
    } catch (e: any) {
      console.log('Voice.start error:', e);
      // Sometimes it's already started
      if (e.error === 'speech_recognizer_busy') {
        await Voice.stop();
        setTimeout(() => Voice.start('ne-NP'), 100);
      } else {
        Alert.alert(
          'त्रुटि',
          `माइक्रोफोन सुरु गर्न सकेन: ${e.message || 'Unknown error'}`,
        );
      }
    }
  };

  const stopListening = async () => {
    try {
      if (Voice) {
        await Voice.stop();
        setIsListening(false);
      }
    } catch (e) {
      console.error('Stop listening error:', e);
    }
  };

  const toggleListening = async () => {
    if (isListening) {
      await stopListening();
    } else {
      await startListening();
    }
  };

  const speak = (text: string, msgId: number) => {
    if (!Tts || typeof Tts.speak !== 'function') {
      Alert.alert(
        'त्रुटि',
        'TTS मोड्यूल उपलब्ध छैन। कृपया एप रिबिल्ड गर्नुहोस्।',
      );
      return;
    }
    try {
      if (isSpeaking) {
        Tts?.stop?.();
        if (isSpeaking === msgId) {
          setIsSpeaking(null);
          return;
        }
      }
      Tts.speak(text);
      setIsSpeaking(msgId);
    } catch (e) {
      console.error(e);
    }
  };

  const loadUser = async () => {
    const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER);
    if (userData) {
      setUser(JSON.parse(userData));
    }
  };

  const loadConversations = async () => {
    try {
      const response = await conversationAPI.list();
      setConversations(response.data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const loadConversation = async (id: number) => {
    try {
      const response = await conversationAPI.get(id);
      setActiveConversation(response.data);
      setMessages(response.data.messages);
      setSidebarVisible(false);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const startNewChat = async () => {
    try {
      const response = await conversationAPI.create({ title: 'नयाँ कुराकानी' });
      setConversations([response.data, ...conversations]);
      setActiveConversation(response.data);
      setMessages([]);
      setSidebarVisible(false);
      return response.data;
    } catch (error) {
      console.error('Failed to create conversation:', error);
      return null;
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || loading) return;
    Keyboard.dismiss();

    let targetConversation = activeConversation;
    if (!targetConversation) {
      targetConversation = await startNewChat();
      if (!targetConversation) return;
    }

    const content = inputValue;
    setInputValue('');
    setLoading(true);

    const tempMsg: Message = {
      id: Date.now(),
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, tempMsg]);

    try {
      const response = await conversationAPI.addMessage(
        targetConversation.id,
        content,
      );
      setMessages(prev => {
        const withoutTemp = prev.filter(m => m.id !== tempMsg.id);
        const newMessages = [
          ...withoutTemp,
          response.data.user_message,
          response.data.assistant_message,
        ];

        // If in hands-free mode, automatically speak the bot's response
        if (isHandsFreeRef.current) {
          setTimeout(() => {
            speak(
              response.data.assistant_message.content,
              response.data.assistant_message.id,
            );
          }, 500);
        }

        return newMessages;
      });

      if (messages.length === 0) {
        await conversationAPI.update(targetConversation.id, {
          title: content.slice(0, 50),
        });
        loadConversations();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
      Alert.alert('त्रुटि', 'प्रश्न पठाउन असफल भयो। पुन: प्रयास गर्नुहोस्।');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('लगआउट', 'के तपाईं लगआउट गर्न चाहनुहुन्छ?', [
      { text: 'रद्द गर्नुहोस्', style: 'cancel' },
      {
        text: 'लगआउट',
        style: 'destructive',
        onPress: async () => {
          try {
            await authAPI.logout();
          } catch {}
          await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
          await AsyncStorage.removeItem(STORAGE_KEYS.USER);
          navigation.replace('Login');
        },
      },
    ]);
  };

  const handleDeleteConversation = async (id: number) => {
    Alert.alert('मेटाउनुहोस्', 'यो कुराकानी मेटाउन निश्चित हुनुहुन्छ?', [
      { text: 'रद्द', style: 'cancel' },
      {
        text: 'मेटाउनुहोस्',
        style: 'destructive',
        onPress: async () => {
          try {
            await conversationAPI.delete(id);
            setConversations(prev => prev.filter(c => c.id !== id));
            if (activeConversation?.id === id) {
              setActiveConversation(null);
              setMessages([]);
            }
          } catch {
            Alert.alert('त्रुटि', 'कुराकानी मेटाउन असफल भयो।');
          }
        },
      },
    ]);
  };

  const handleStartEdit = (message: Message) => {
    setEditingMessageId(message.id);
    setEditContent(message.content);
  };

  const handleSaveEdit = async (messageId: number) => {
    if (!editContent.trim() || !activeConversation) return;
    setLoading(true);
    try {
      const response = await conversationAPI.addMessage(
        activeConversation.id,
        editContent,
      );
      setMessages(prev => {
        const msgIndex = prev.findIndex(m => m.id === messageId);
        if (msgIndex === -1) return prev;
        const newMessages = prev.slice(0, msgIndex);
        return [
          ...newMessages,
          response.data.user_message,
          response.data.assistant_message,
        ];
      });
      setEditingMessageId(null);
      setEditContent('');
    } catch {
      Alert.alert('त्रुटि', 'सन्देश सम्पादन असफल भयो।');
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item: message }: { item: Message }) => {
    const isUser = message.role === 'user';
    const isEditing = editingMessageId === message.id;

    return (
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubbleRow : styles.assistantBubbleRow,
        ]}
      >
        {!isUser && (
          <View style={styles.botAvatarWrapper}>
            <Text style={styles.botAvatar}>🤖</Text>
          </View>
        )}
        <View
          style={[
            styles.bubble,
            isUser
              ? styles.userBubble
              : [styles.assistantBubble, isDark && styles.assistantBubbleDark],
          ]}
        >
          {!isUser && (
            <Text style={[styles.botLabel, isDark && styles.botLabelDark]}>
              SevaBot
            </Text>
          )}
          {isEditing ? (
            <View style={styles.editContainer}>
              <TextInput
                style={[styles.editInput, isDark && styles.editInputDark]}
                value={editContent}
                onChangeText={setEditContent}
                multiline
                autoFocus
                placeholder="सन्देश सम्पादन गर्नुहोस्..."
                placeholderTextColor={isDark ? '#4b5563' : '#9ca3af'}
              />
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={[
                    styles.cancelEditBtn,
                    isDark && styles.cancelEditBtnDark,
                  ]}
                  onPress={() => {
                    setEditingMessageId(null);
                    setEditContent('');
                  }}
                >
                  <Text
                    style={[
                      styles.cancelEditText,
                      isDark && styles.cancelEditTextDark,
                    ]}
                  >
                    रद्द
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveEditBtn}
                  onPress={() => handleSaveEdit(message.id)}
                  disabled={loading}
                >
                  <Text style={styles.saveEditText}>
                    {loading ? '⏳' : '✓ सुरक्षित'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <Text
                style={[
                  styles.messageText,
                  isDark && styles.messageTextDark,
                  isUser && styles.userText,
                ]}
              >
                {message.content}
              </Text>
              <View style={styles.messageFooter}>
                <Text
                  style={[
                    styles.timestamp,
                    isUser
                      ? styles.userTimestamp
                      : [
                          styles.assistantTimestamp,
                          isDark && styles.assistantTimestampDark,
                        ],
                  ]}
                >
                  {new Date(message.created_at).toLocaleTimeString('ne-NP', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>

                {isUser && (
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => handleStartEdit(message)}
                  >
                    <Edit2 size={18} color={isDark ? '#64748b' : '#9ca3af'} />
                  </TouchableOpacity>
                )}

                {!isUser && (
                  <TouchableOpacity
                    style={styles.voiceBtn}
                    onPress={() => speak(message.content, message.id)}
                  >
                    {isSpeaking === message.id ? (
                      <StopCircle
                        size={20}
                        color={isDark ? '#60a5fa' : '#2563eb'}
                      />
                    ) : (
                      <Volume2
                        size={20}
                        color={isDark ? '#60a5fa' : '#2563eb'}
                      />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </View>
      </View>
    );
  };

  const EmptyState = () => (
    <ScrollView contentContainerStyle={styles.emptyState}>
      <Image
        source={require('../../assets/logo.png')}
        style={styles.emptyLogoImg}
        resizeMode="contain"
      />
      <Text style={styles.emptyTitle}>नमस्कार! म SevaBot हुँ</Text>
      <Text style={styles.emptySubtitle}>डिजिटल नागरिक बडापत्र</Text>
      <View style={styles.infoCard}>
        <Text style={styles.infoCardTitle}>कसरी प्रयोग गर्ने:</Text>
        <View style={styles.infoRow}>
          <MessageCircle size={24} color="#1e40af" />
          <View style={styles.infoText}>
            <Text style={styles.infoLabel}>१. कुराकानी सुरु गर्नुहोस्</Text>
            <Text style={styles.infoDesc}>
              तलको box मा नेपालीमा प्रश्न लेख्नुहोस्
            </Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Mic size={24} color="#1e40af" />
          <View style={styles.infoText}>
            <Text style={styles.infoLabel}>२. नेपालीमा प्रश्न सोध्नुहोस्</Text>
            <Text style={styles.infoDesc}>
              डिजिटल नागरिक बडापत्र विषयमा प्रश्न सोध्नुहोस्
            </Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Info size={24} color="#1e40af" />
          <View style={styles.infoText}>
            <Text style={styles.infoLabel}>३. उत्तर पाउनुहोस्</Text>
            <Text style={styles.infoDesc}>
              RAG प्रणालीद्वारा सटीक उत्तर पाउनुहोस्
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={isDark ? '#020617' : '#1d4ed8'}
      />

      {/* Header */}
      <View style={[styles.header, isDark && styles.headerDark]}>
        <TouchableOpacity
          style={styles.menuBtn}
          onPress={() => setSidebarVisible(true)}
        >
          <Menu size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.headerTitleRow}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.headerLogoImg}
              resizeMode="contain"
            />
            <Text style={styles.headerTitle}>SevaBot</Text>
          </View>
          <Text style={styles.headerSubtitle}>डिजिटल नागरिक बडापत्र</Text>
        </View>
        <TouchableOpacity
          style={[styles.menuBtn, isHandsFree && styles.handsFreeBtnActive]}
          onPress={() => setIsHandsFree(!isHandsFree)}
        >
          <Volume2 size={24} color={isHandsFree ? '#4ade80' : '#ffffff'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuBtn}
          onPress={() => navigation.navigate('Settings')}
        >
          <Settings size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id.toString()}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
          />
        )}

        {/* Loading indicator */}
        {loading && (
          <View style={styles.loadingRow}>
            <View
              style={[styles.loadingBubble, isDark && styles.loadingBubbleDark]}
            >
              <ActivityIndicator size="small" color="#2563eb" />
              <Text
                style={[styles.loadingText, isDark && styles.loadingTextDark]}
              >
                SevaBot सोच्दैछ...
              </Text>
            </View>
          </View>
        )}

        {/* Input Box */}
        <View style={[styles.inputArea, isDark && styles.inputAreaDark]}>
          <View
            style={[styles.inputContainer, isDark && styles.inputContainerDark]}
          >
            <TextInput
              style={[styles.textInput, isDark && styles.textInputDark]}
              value={inputValue}
              onChangeText={setInputValue}
              placeholder="आफ्नो प्रश्न नेपालीमा सोध्नुहोस्..."
              placeholderTextColor={isDark ? '#4b5563' : '#9ca3af'}
              multiline
              maxLength={2000}
              editable={!loading}
            />
            <TouchableOpacity
              style={[
                styles.micBtn,
                isListening && styles.micBtnActive,
                loading && styles.micBtnDisabled,
              ]}
              onPress={toggleListening}
              disabled={loading}
            >
              {isListening ? (
                <StopCircle size={24} color="#ef4444" />
              ) : (
                <Mic size={24} color="#2563eb" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!inputValue.trim() || loading) && styles.sendBtnDisabled,
              ]}
              onPress={handleSendMessage}
              disabled={!inputValue.trim() || loading}
            >
              <Send size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Sidebar Modal */}
      <Modal
        visible={sidebarVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSidebarVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={() => setSidebarVisible(false)}
          />
          <View style={[styles.sidebar, isDark && styles.sidebarDark]}>
            {/* Sidebar Header */}
            <View style={styles.sidebarHeader}>
              <View style={styles.sidebarTitleRow}>
                <Image
                  source={require('../../assets/logo.png')}
                  style={styles.sidebarLogoImg}
                  resizeMode="contain"
                />
                <Text style={styles.sidebarTitle}>SevaBot</Text>
              </View>
              <Text style={styles.sidebarUser}>
                <User size={14} color="#a5b4fc" /> {user?.username || 'Guest'}
              </Text>
            </View>

            <TouchableOpacity style={styles.newChatBtn} onPress={startNewChat}>
              <PlusCircle size={20} color="#e0e7ff" />
              <Text style={styles.newChatText}>नयाँ कुराकानी</Text>
            </TouchableOpacity>

            {/* Profile Button */}
            <TouchableOpacity
              style={styles.newChatBtn}
              onPress={() => {
                setSidebarVisible(false);
                navigation.navigate('Profile');
              }}
            >
              <User size={20} color="#e0e7ff" />
              <Text style={styles.newChatText}>प्रोफाइल</Text>
            </TouchableOpacity>

            {/* Settings Button */}
            <TouchableOpacity
              style={[styles.newChatBtn, styles.settingsBtn]}
              onPress={() => {
                setSidebarVisible(false);
                navigation.navigate('Settings');
              }}
            >
              <Settings size={20} color="#e0e7ff" />
              <Text style={styles.newChatText}>सेटिङ</Text>
            </TouchableOpacity>

            {/* Conversations List */}
            <Text style={styles.sidebarSectionTitle}>कुराकानीहरू</Text>
            <FlatList
              data={conversations}
              keyExtractor={item => item.id.toString()}
              style={styles.conversationList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.conversationItem,
                    activeConversation?.id === item.id &&
                      styles.conversationItemActive,
                  ]}
                  onPress={() => loadConversation(item.id)}
                >
                  <MessageSquare
                    size={16}
                    color={
                      activeConversation?.id === item.id ? '#ffffff' : '#c7d2fe'
                    }
                  />
                  <Text
                    style={[
                      styles.conversationTitle,
                      activeConversation?.id === item.id &&
                        styles.conversationTitleActive,
                    ]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleDeleteConversation(item.id)}
                    style={styles.deleteConvBtn}
                  >
                    <Trash2 size={16} color="#ef4444" />
                  </TouchableOpacity>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.noConversations}>कुनै कुराकानी छैन</Text>
              }
            />

            {/* Logout */}
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={() => {
                setSidebarVisible(false);
                handleLogout();
              }}
            >
              <LogOut size={20} color="#fca5a5" />
              <Text style={styles.logoutText}>लगआउट</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  containerDark: {
    backgroundColor: '#020617',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1d4ed8',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 44,
    paddingBottom: 14,
    paddingHorizontal: 16,
    shadowColor: '#1d4ed8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerDark: {
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuIcon: {
    fontSize: 20,
    color: '#ffffff',
  },
  headerContent: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerLogoImg: {
    width: 32,
    height: 32,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#bfdbfe',
    marginTop: 1,
    marginLeft: 10,
  },
  messageList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageBubble: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  userBubbleRow: {
    justifyContent: 'flex-end',
  },
  assistantBubbleRow: {
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  botAvatarWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  botAvatar: {
    fontSize: 18,
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  userBubble: {
    backgroundColor: '#2563eb',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  assistantBubbleDark: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
  },
  botLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
    marginBottom: 4,
  },
  botLabelDark: {
    color: '#60a5fa',
  },
  messageText: {
    fontSize: 15,
    color: '#1f2937',
    lineHeight: 22,
  },
  messageTextDark: {
    color: '#f1f5f9',
  },
  userText: {
    color: '#ffffff',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  timestamp: {
    fontSize: 10,
  },
  userTimestamp: {
    color: '#bfdbfe',
  },
  assistantTimestamp: {
    color: '#9ca3af',
  },
  assistantTimestampDark: {
    color: '#64748b',
  },
  editBtn: {
    padding: 2,
  },
  editBtnIcon: {
    fontSize: 14,
  },
  editContainer: {
    width: '100%',
  },
  editInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    color: '#111827',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  editInputDark: {
    backgroundColor: '#020617',
    borderColor: '#2563eb',
    color: '#f1f5f9',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  cancelEditBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  cancelEditBtnDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  cancelEditText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
  cancelEditTextDark: {
    color: '#94a3b8',
  },
  saveEditBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#2563eb',
  },
  saveEditText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '700',
  },
  loadingRow: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    alignItems: 'flex-start',
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  loadingBubbleDark: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    shadowOpacity: 0,
  },
  loadingText: {
    fontSize: 13,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  loadingTextDark: {
    color: '#94a3b8',
  },
  inputArea: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputAreaDark: {
    backgroundColor: '#020617',
    borderTopColor: '#1e293b',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 20,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
  },
  inputContainerDark: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    maxHeight: 120,
    paddingTop: 6,
    paddingBottom: 6,
    lineHeight: 22,
  },
  textInputDark: {
    color: '#f1f5f9',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  sendBtnDisabled: {
    backgroundColor: '#93c5fd',
    shadowOpacity: 0,
    elevation: 0,
  },
  sendIcon: {
    fontSize: 18,
    color: '#ffffff',
    marginLeft: 2,
  },
  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyEmoji: {
    fontSize: 72,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1e40af',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptyLogoImg: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  infoCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    width: '100%',
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 12,
  },
  infoIcon: {
    fontSize: 22,
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 2,
  },
  infoDesc: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 18,
  },
  // Sidebar
  modalOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sidebar: {
    width: '78%',
    backgroundColor: '#1e1b4b',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 44,
    paddingBottom: 32,
  },
  handsFreeBtnActive: {
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
    borderRadius: 12,
  },
  sidebarDark: {
    backgroundColor: '#020617',
    borderRightWidth: 1,
    borderRightColor: '#1e293b',
  },
  sidebarHeader: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  sidebarTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  sidebarLogoImg: {
    width: 28,
    height: 28,
  },
  sidebarTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  sidebarUser: {
    fontSize: 13,
    color: '#a5b4fc',
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99,102,241,0.3)',
    margin: 16,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(165,180,252,0.3)',
    gap: 10,
  },
  newChatIcon: {
    fontSize: 18,
  },
  newChatText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#e0e7ff',
  },
  settingsBtn: {
    backgroundColor: 'rgba(99,102,241,0.15)',
    marginTop: -6,
  },
  sidebarSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7c83c3',
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  conversationList: {
    flex: 1,
    paddingHorizontal: 12,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 4,
    gap: 8,
  },
  conversationItemActive: {
    backgroundColor: 'rgba(99,102,241,0.3)',
  },
  convIcon: {
    fontSize: 16,
  },
  conversationTitle: {
    flex: 1,
    fontSize: 14,
    color: '#c7d2fe',
  },
  conversationTitleActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  deleteConvBtn: {
    padding: 4,
  },
  deleteConvIcon: {
    fontSize: 14,
  },
  noConversations: {
    fontSize: 13,
    color: '#7c83c3',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    gap: 10,
  },
  logoutIcon: {
    fontSize: 18,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fca5a5',
  },
  voiceBtn: {
    marginLeft: 8,
    padding: 4,
  },
  voiceIcon: {
    fontSize: 16,
  },
  micBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  micBtnActive: {
    backgroundColor: '#fee2e2',
  },
  micBtnDisabled: {
    opacity: 0.5,
  },
  micIcon: {
    fontSize: 22,
  },
});
