import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import {
  STORAGE_KEYS,
  DEFAULT_SERVER_IP,
  buildBaseURL,
  getServerIP,
  authAPI,
} from '../services/api';
import { ArrowLeft, Moon, Sun } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

export default function SettingsScreen({ navigation }: any) {
  const [serverIP, setServerIP] = useState('');
  const [currentIP, setCurrentIP] = useState('');
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [llmAPIKey, setLlmAPIKey] = useState('');
  const [useCustomURL, setUseCustomURL] = useState(false);
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const ip = await getServerIP();
    setServerIP(ip);
    setCurrentIP(ip);
    const u = await AsyncStorage.getItem(STORAGE_KEYS.USER);
    if (u) {
      const parsedUser = JSON.parse(u);
      setUser(parsedUser);
      setLlmAPIKey(parsedUser.llm_api_key || '');
    }
    const customUrlFlag = await AsyncStorage.getItem(STORAGE_KEYS.USE_CUSTOM_URL);
    setUseCustomURL(customUrlFlag === 'true');
  };

  const testConnection = async () => {
    const ip = serverIP.trim() || DEFAULT_SERVER_IP;
    setTesting(true);
    try {
      const base = buildBaseURL(ip).replace('/api', '');
      await axios.get(`${base}/`, { timeout: 5000 });
      Alert.alert('✅ सफल!', `${ip} मा सफलतापूर्वक जडान भयो।`);
    } catch (err: any) {
      if ([200, 301, 302, 400, 401, 403, 404].includes(err.response?.status)) {
        Alert.alert('✅ Server सक्रिय छ!', `${ip} मा server चलिरहेको छ।`);
      } else {
        Alert.alert(
          '❌ जडान असफल',
          `${ip} मा पुग्न सकिएन।\n\n• Backend चलिरहेको छ?\n• IP/Port ठिक छ?\n• Network OK?`,
        );
      }
    } finally {
      setTesting(false);
    }
  };

  const saveSettings = async () => {
    const ip = serverIP.trim() || DEFAULT_SERVER_IP;
    setSaving(true);
    try {
      // 1. Save IP and Toggle locally
      await AsyncStorage.setItem(STORAGE_KEYS.SERVER_IP, ip);
      await AsyncStorage.setItem(STORAGE_KEYS.USE_CUSTOM_URL, useCustomURL ? 'true' : 'false');
      setCurrentIP(ip);

      // 2. Update LLM API Key on server if changed
      if (llmAPIKey !== (user?.llm_api_key || '')) {
        try {
          const response = await authAPI.updateProfile({ llm_api_key: llmAPIKey });
          const updatedUser = response.data;
          await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
          setUser(updatedUser);
        } catch (err) {
          Alert.alert('⚠️ त्रुटि', 'API Key सर्भरमा सुरक्षित गर्न सकिएन।');
        }
      }

      Alert.alert('✅ सुरक्षित भयो', `सेटिङहरू सफलतापूर्वक अपडेट गरियो।`);
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = () => {
    setServerIP(DEFAULT_SERVER_IP);
  };

  const handleLogout = async () => {
    Alert.alert('लगआउट', 'के तपाईं लगआउट गर्न चाहनुहुन्छ?', [
      { text: 'रद्द', style: 'cancel' },
      {
        text: 'लगआउट',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
          await AsyncStorage.removeItem(STORAGE_KEYS.USER);
          navigation.replace('Login');
        },
      },
    ]);
  };

  const resetOnboarding = async () => {
    await AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING_DONE);
    Alert.alert('रिसेट', 'अर्को पटक खोल्दा Onboarding देखाइनेछ।');
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor={isDark ? '#020617' : '#1e1b4b'} 
      />

      {/* Header */}
      <View style={[styles.header, isDark && styles.headerDark]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>⚙️ सेटिङ</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Theme Card */}
        <View style={[styles.card, isDark && styles.cardDark]}>
          <Text style={[styles.sectionLabel, isDark && styles.sectionLabelDark]}>🌓 थिम (Theme)</Text>
          <View style={styles.themeRow}>
            <View style={styles.themeInfo}>
              {isDark ? <Moon size={20} color="#818cf8" /> : <Sun size={20} color="#f59e0b" />}
              <Text style={[styles.themeText, isDark && styles.themeTextDark]}>
                {isDark ? 'डार्क मोड (Dark Mode)' : 'लाइट मोड (Light Mode)'}
              </Text>
            </View>
            <TouchableOpacity 
              style={[styles.toggleBtn, isDark ? styles.toggleBtnActive : styles.toggleBtnInactive]} 
              onPress={toggleTheme}
            >
              <View style={[styles.toggleThumb, isDark ? styles.toggleThumbRight : styles.toggleThumbLeft]} />
            </TouchableOpacity>
          </View>
        </View>
        {/* User info card */}
        {user && (
          <View style={[styles.card, isDark && styles.cardDark]}>
            <Text style={[styles.sectionLabel, isDark && styles.sectionLabelDark]}>👤 खाता जानकारी</Text>
            <View style={styles.infoRow}>
              <Text style={[styles.infoKey, isDark && styles.infoKeyDark]}>Username</Text>
              <Text style={[styles.infoValue, isDark && styles.infoValueDark]}>{user.username}</Text>
            </View>
            {user.email ? (
              <View style={styles.infoRow}>
                <Text style={[styles.infoKey, isDark && styles.infoKeyDark]}>Email</Text>
                <Text style={[styles.infoValue, isDark && styles.infoValueDark]}>{user.email}</Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Server IP card */}
        <View style={[styles.card, isDark && styles.cardDark]}>
          <Text style={[styles.sectionLabel, isDark && styles.sectionLabelDark]}>🌐 Backend Server</Text>
          <Text style={[styles.currentLabel, isDark && styles.currentLabelDark]}>
            हालको {useCustomURL ? 'URL' : 'IP'}: <Text style={styles.currentValue}>{currentIP}</Text>
          </Text>

          <View style={[styles.themeRow, { marginBottom: 12 }]}>
            <Text style={[styles.fieldLabel, { marginBottom: 0 }, isDark && styles.fieldLabelDark]}>Custom URL प्रयोग गर्नुहोस्</Text>
            <TouchableOpacity 
              style={[styles.toggleBtn, useCustomURL ? styles.toggleBtnActive : styles.toggleBtnInactive, { height: 24, width: 46 }]} 
              onPress={() => setUseCustomURL(!useCustomURL)}
            >
              <View style={[styles.toggleThumb, { width: 18, height: 18, borderRadius: 9 }, useCustomURL ? styles.toggleThumbRight : styles.toggleThumbLeft]} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.fieldLabel, isDark && styles.fieldLabelDark]}>
            {useCustomURL ? 'Full API URL' : 'नयाँ IP : Port'}
          </Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.ipInput, isDark && styles.ipInputDark]}
              value={serverIP}
              onChangeText={setServerIP}
              placeholder={useCustomURL ? 'https://seva-api.com' : DEFAULT_SERVER_IP}
              placeholderTextColor={isDark ? "#4b5563" : "#9ca3af"}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType={useCustomURL ? "url" : "default"}
            />
          </View>

          <View style={{ height: 1, backgroundColor: isDark ? '#1e293b' : '#f3f4f6', marginVertical: 18 }} />

          <Text style={[styles.sectionLabel, { marginBottom: 8 }, isDark && styles.sectionLabelDark]}>🤖 AI Configuration</Text>
          <Text style={[styles.fieldLabel, isDark && styles.fieldLabelDark]}>Groq API Key (Optional)</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.ipInput, isDark && styles.ipInputDark]}
              value={llmAPIKey}
              onChangeText={setLlmAPIKey}
              placeholder="gsk_..."
              placeholderTextColor={isDark ? "#4b5563" : "#9ca3af"}
              secureTextEntry={true}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <Text style={[styles.hintText, { marginTop: -4, marginBottom: 16 }, isDark && styles.hintTextDark]}>
            यदि तपाईंसँग आफ्नै Groq API key छ भने यहाँ राख्नुहोस्। यसले तपाईंको व्यक्तिगत कोटा प्रयोग गर्नेछ।
          </Text>

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.testBtn, testing && styles.btnDisabled]}
              onPress={testConnection}
              disabled={testing}
            >
              {testing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.testBtnText}>🔗 Test</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.btnDisabled]}
              onPress={saveSettings}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>💾 सुरक्षित</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.resetBtn} onPress={resetToDefault}>
              <Text style={styles.resetBtnText}>↺ Default</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Danger zone */}
        <View style={[styles.card, styles.dangerCard, isDark && styles.dangerCardDark]}>
          <Text style={[styles.sectionLabel, isDark && styles.sectionLabelDark]}>⚠️ अन्य विकल्पहरू</Text>
          <TouchableOpacity style={[styles.dangerBtn, isDark && styles.dangerBtnDark]} onPress={resetOnboarding}>
            <Text style={styles.dangerBtnText}>
              🔄 Onboarding रिसेट गर्नुहोस्
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dangerBtn, styles.logoutBtn, isDark && styles.logoutBtnDark]}
            onPress={handleLogout}
          >
            <Text style={[styles.dangerBtnText, styles.logoutText]}>
              🚪 लगआउट गर्नुहोस्
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>
          SevaBot Mobile v1.0 · React Native 0.84
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  containerDark: {
    backgroundColor: '#020617',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1b4b',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 44,
    paddingBottom: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  headerDark: {
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  cardDark: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    shadowOpacity: 0,
  },
  dangerCard: {
    borderWidth: 1,
    borderColor: '#fecdd3',
    backgroundColor: '#fff5f5',
  },
  dangerCardDark: {
    backgroundColor: '#450a0a20',
    borderColor: '#ef444440',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#374151',
    marginBottom: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionLabelDark: {
    color: '#94a3b8',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoKey: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoKeyDark: {
    color: '#64748b',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  infoValueDark: {
    color: '#f1f5f9',
  },
  currentLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 14,
  },
  currentLabelDark: {
    color: '#64748b',
  },
  currentValue: {
    fontWeight: '700',
    color: '#2563eb',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  fieldLabelDark: {
    color: '#94a3b8',
  },
  inputRow: {
    marginBottom: 14,
  },
  ipInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  ipInputDark: {
    backgroundColor: '#020617',
    borderColor: '#1e293b',
    color: '#f1f5f9',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  testBtn: {
    flex: 1,
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  testBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  resetBtn: {
    paddingHorizontal: 14,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  hintBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  hintBoxDark: {
    backgroundColor: '#1e293b40',
    borderColor: '#1e293b',
  },
  hintTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 6,
  },
  hintTitleDark: {
    color: '#60a5fa',
  },
  hintText: {
    fontSize: 12,
    color: '#374151',
    lineHeight: 20,
  },
  hintTextDark: {
    color: '#94a3b8',
  },
  code: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  },
  codeDark: {
    backgroundColor: '#1e293b',
    color: '#60a5fa',
  },
  dangerBtn: {
    backgroundColor: '#fff1f2',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  dangerBtnDark: {
    backgroundColor: 'transparent',
    borderColor: '#ef444440',
  },
  dangerBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#be123c',
  },
  logoutBtn: {
    backgroundColor: '#450a0a',
    borderColor: '#7f1d1d',
    marginBottom: 0,
  },
  logoutBtnDark: {
    backgroundColor: '#180303',
  },
  logoutText: {
    color: '#fca5a5',
  },
  version: {
    textAlign: 'center',
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 8,
  },
  themeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  themeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  themeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  themeTextDark: {
    color: '#f1f5f9',
  },
  toggleBtn: {
    width: 52,
    height: 28,
    borderRadius: 14,
    padding: 3,
  },
  toggleBtnActive: {
    backgroundColor: '#6366f1',
  },
  toggleBtnInactive: {
    backgroundColor: '#d1d5db',
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbLeft: {
    alignSelf: 'flex-start',
  },
  toggleThumbRight: {
    alignSelf: 'flex-end',
  },
});
