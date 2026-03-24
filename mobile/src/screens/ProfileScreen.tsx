import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useTheme} from '../context/ThemeContext';
import {authAPI, STORAGE_KEYS} from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfileScreen({navigation}: any) {
  const {isDark} = useTheme();
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Profile Edit State
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');

  // Password Change State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await authAPI.getProfile();
      setUser(response.data);
      setUsername(response.data.username);
      setEmail(response.data.email);
    } catch (error: any) {
      console.error('Fetch profile error:', error);
      Alert.alert('त्रुटि', 'प्रोफाइल लोड गर्न सकिएन।');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!username.trim() || !email.trim()) {
      Alert.alert('त्रुटि', 'Username र Email खाली छोड्न मिल्दैन।');
      return;
    }

    setUpdating(true);
    try {
      const response = await authAPI.updateProfile({username, email});
      setUser(response.data);
      // Update stored user data too
      const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        await AsyncStorage.setItem(
          STORAGE_KEYS.USER,
          JSON.stringify({...parsed, ...response.data}),
        );
      }
      Alert.alert('सफल', 'प्रोफाइल सफलतापूर्वक अपडेट भयो।');
    } catch (error: any) {
      const errorMsg = error.response?.data?.username?.[0] || error.response?.data?.email?.[0] || 'अपडेट गर्न सकिएन।';
      Alert.alert('त्रुटि', errorMsg);
    } finally {
      setUpdating(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert('त्रुटि', 'सबै पासवर्ड फिल्डहरू भर्नुहोस्।');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('त्रुटि', 'नयाँ पासवर्ड र कन्फर्म पासवर्ड मिलेन।');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('त्रुटि', 'नयाँ पासवर्ड कम्तिमा ८ अक्षरको हुनुपर्छ।');
      return;
    }

    setUpdating(true);
    try {
      await authAPI.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
      });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('सफल', 'पासवर्ड सफलतापूर्वक परिवर्तन भयो।');
    } catch (error: any) {
      const msg = error.response?.data?.error || 'पासवर्ड परिवर्तन गर्न सकिएन।';
      Alert.alert('त्रुटि', msg);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, isDark && styles.containerDark, styles.centered]}>
        <ActivityIndicator size="large" color="#6d28d9" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, isDark && styles.containerDark]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar 
        barStyle={isDark ? "light-content" : "dark-content"} 
        backgroundColor={isDark ? '#020617' : '#f8fafc'} 
      />
      
      {/* Header */}
      <View style={[styles.header, isDark && styles.headerDark]}>
        <TouchableOpacity 
          style={styles.backBtn} 
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={isDark ? "#f1f5f9" : "#1e293b"} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && styles.headerTitleDark]}>मेरो प्रोफाइल</Text>
        <View style={{width: 40}} /> 
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Profile Info Section */}
        <View style={styles.section}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              <Icon name="person" size={50} color="#ffffff" />
            </View>
            <Text style={[styles.displayName, isDark && styles.displayNameDark]}>
              {user?.username}
            </Text>
            <Text style={styles.displayEmail}>{user?.email}</Text>
          </View>

          <View style={[styles.card, isDark && styles.cardDark]}>
            <Text style={[styles.cardTitle, isDark && styles.cardTitleDark]}>विवरण अपडेट गर्नुहोस्</Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isDark && styles.labelDark]}>Username</Text>
              <View style={[styles.inputWrapper, isDark && styles.inputWrapperDark]}>
                <Icon name="person-outline" size={18} color={isDark ? "#64748b" : "#9ca3af"} style={{marginRight: 8}} />
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Username"
                  placeholderTextColor={isDark ? "#4b5563" : "#9ca3af"}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, isDark && styles.labelDark]}>Email</Text>
              <View style={[styles.inputWrapper, isDark && styles.inputWrapperDark]}>
                <Icon name="mail-outline" size={18} color={isDark ? "#64748b" : "#9ca3af"} style={{marginRight: 8}} />
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email"
                  placeholderTextColor={isDark ? "#4b5563" : "#9ca3af"}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, updating && styles.btnDisabled]}
              onPress={handleUpdateProfile}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.btnText}>प्रोफाइल अपडेट गर्नुहोस्</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Change Password Section */}
        <View style={styles.section}>
          <View style={[styles.card, isDark && styles.cardDark]}>
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.cardTitle, isDark && styles.cardTitleDark]}>पासवर्ड परिवर्तन गर्नुहोस्</Text>
              <TouchableOpacity onPress={() => setShowPasswords(!showPasswords)}>
                <Icon 
                  name={showPasswords ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color={isDark ? "#64748b" : "#6b7280"} 
                />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, isDark && styles.labelDark]}>पुरानो पासवर्ड</Text>
              <View style={[styles.inputWrapper, isDark && styles.inputWrapperDark]}>
                <Icon name="lock-closed-outline" size={18} color={isDark ? "#64748b" : "#9ca3af"} style={{marginRight: 8}} />
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  value={oldPassword}
                  onChangeText={setOldPassword}
                  placeholder="हालको पासवर्ड"
                  placeholderTextColor={isDark ? "#4b5563" : "#9ca3af"}
                  secureTextEntry={!showPasswords}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, isDark && styles.labelDark]}>नयाँ पासवर्ड</Text>
              <View style={[styles.inputWrapper, isDark && styles.inputWrapperDark]}>
                <Icon name="key-outline" size={18} color={isDark ? "#64748b" : "#9ca3af"} style={{marginRight: 8}} />
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="नयाँ पासवर्ड"
                  placeholderTextColor={isDark ? "#4b5563" : "#9ca3af"}
                  secureTextEntry={!showPasswords}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, isDark && styles.labelDark]}>पासवर्ड पुष्टि गर्नुहोस्</Text>
              <View style={[styles.inputWrapper, isDark && styles.inputWrapperDark]}>
                <Icon name="shield-checkmark-outline" size={18} color={isDark ? "#64748b" : "#9ca3af"} style={{marginRight: 8}} />
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="नयाँ पासवर्ड फेरि लेख्नुहोस्"
                  placeholderTextColor={isDark ? "#4b5563" : "#9ca3af"}
                  secureTextEntry={!showPasswords}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.secondaryBtn, updating && styles.btnDisabled]}
              onPress={handleChangePassword}
              disabled={updating}
            >
              <Text style={styles.secondaryBtnText}>पासवर्ड परिवर्तन गर्नुहोस्</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={{height: 40}} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  containerDark: {
    backgroundColor: '#020617',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerDark: {
    backgroundColor: '#0f172a',
    borderBottomColor: '#1e293b',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  headerTitleDark: {
    color: '#f8fafc',
  },
  backBtn: {
    padding: 8,
  },
  scroll: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#6d28d9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    elevation: 4,
    shadowColor: '#6d28d9',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  displayName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
  },
  displayNameDark: {
    color: '#f8fafc',
  },
  displayEmail: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardDark: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 16,
  },
  cardTitleDark: {
    color: '#cbd5e1',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 6,
  },
  labelDark: {
    color: '#94a3b8',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
  },
  inputWrapperDark: {
    backgroundColor: '#020617',
    borderColor: '#1e293b',
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 14,
    color: '#1e293b',
  },
  inputDark: {
    color: '#f8fafc',
  },
  primaryBtn: {
    backgroundColor: '#6d28d9',
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: '#6d28d9',
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtnText: {
    color: '#6d28d9',
    fontSize: 15,
    fontWeight: '700',
  },
});
